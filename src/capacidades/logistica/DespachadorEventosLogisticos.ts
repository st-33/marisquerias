/**
 * 🚀 DESPACHADOR DE EVENTOS LOGÍSTICOS (SERVICIO A DOMICILIO)
 *
 * Emite eventos hacia el ecosistema de Servicio a Domicilio sin bloquear la operación local.
 *
 * REGLAS DE ORO:
 * 1. CERO BLOQUEOS SÍNCRONOS: Emisión asíncrona ("fire and forget"). Si Servicio a Domicilio
 *    está caído, el pedido sigue vivo, cocina imprime y el evento se encola para reintento.
 * 2. IDENTIDAD TRANSVERSAL: Emite usando `negocio_id` canónico (ej: "puerto_libres").
 * 3. EMISIÓN SELECTIVA: Solo emite cuando el pedido requiere reparto o apoyo logístico.
 * 4. NO EMITIR VENTAS: No emite datos de caja, ventas financieras ni cobros.
 */

import { ref, set, remove, get } from 'firebase/database';
import type { Database } from 'firebase/database';
import { getRtdb } from '../../sistema/firebase';
import { logger } from '../../sistema/monitoreo';
import type { PedidoLogisticoEvent } from '../../sistema/tipos/contratos';
import { pedidoRequiereLogistica } from '../../logica/dominio/logistica';
import { extraer_negocio_id_canonico } from '../../sistema/rtdb/rutas/ruta_negocio';

export type CanalOrigenLogistico =
  | 'web'
  | 'whatsapp'
  | 'llamada'
  | 'red_social'
  | 'restaurante'
  | 'mesera';

export type TipoOperacionLogistica = 'entrega_domicilio' | 'apoyo_logistico';

/**
 * Mapea el origen de un pedido al contrato estricto de Servicio a Domicilio.
 * Identifica correctamente si viene de menú digital, WhatsApp, llamada, mesera o restaurante/mesa para llevar.
 */
export function mapearCanalOrigen(pedido: {
  origen?: string;
  canal?: string;
  modalidad?: string;
  tipo?: string;
  mesaId?: string | number | null;
  mesa?: string | number | null;
  metadatos?: { canal?: string; origen?: string; [key: string]: any };
}): CanalOrigenLogistico {
  const orig = String(
    pedido.origen ||
      pedido.canal ||
      pedido.metadatos?.canal ||
      pedido.metadatos?.origen ||
      ''
  ).toLowerCase();

  // 1. WhatsApp
  if (orig.includes('whats') || orig === 'wa') {
    return 'whatsapp';
  }

  // 2. Llamada telefónica
  if (orig.includes('llam') || orig.includes('tel') || orig === 'phone') {
    return 'llamada';
  }

  // 3. Redes sociales (Facebook, Instagram, etc.)
  if (
    orig.includes('red') ||
    orig.includes('face') ||
    orig.includes('insta') ||
    orig.includes('social')
  ) {
    return 'red_social';
  }

  // 4. Web / Menú Digital
  if (
    orig.includes('web') ||
    orig.includes('menu_digital') ||
    orig.includes('digital') ||
    orig.includes('online') ||
    orig.includes('cliente')
  ) {
    return 'web';
  }

  // 5. Mesera / Mesero
  if (orig.includes('meser') || orig.includes('waiter') || orig.includes('garzon')) {
    return 'mesera';
  }

  // 6. Restaurante / Para Llevar / Mostrador
  if (
    orig.includes('restaurante') ||
    orig.includes('mostrador') ||
    orig.includes('pos') ||
    orig.includes('llevar') ||
    orig.includes('presencial')
  ) {
    return 'restaurante';
  }

  // Si tiene mesa asignada, proviene del flujo de salón/mesera
  if (pedido.mesaId || pedido.mesa) {
    return 'mesera';
  }

  // Si es para llevar en mostrador
  if (pedido.modalidad === 'para_llevar' || pedido.tipo === 'mostrador') {
    return 'restaurante';
  }

  // Default operacional
  return 'restaurante';
}

/**
 * Determina el tipo de operación logística: entrega a domicilio vs apoyo logístico
 */
export function determinarTipoOperacion(pedido: {
  modalidad?: string;
  tipo?: string;
  [key: string]: any;
}): TipoOperacionLogistica {
  const mod = String(pedido.modalidad || pedido.tipo || '').toLowerCase();
  if (mod === 'recoleccion' || mod === 'apoyo' || mod === 'apoyo_logistico') {
    return 'apoyo_logistico';
  }
  return 'entrega_domicilio';
}

/**
 * Construye un PedidoLogisticoEvent garantizando identidad canónica e idempotencia
 */
export function construirPedidoLogisticoEvent(params: {
  pedido: {
    id: string;
    origen?: string;
    canal?: string;
    modalidad?: string;
    tipo?: string;
    mesaId?: string | number | null;
    mesa?: string | number | null;
    metadatos?: any;
    [key: string]: any;
  };
  negocio_id: string;
  categoria_id?: string;
  tipo_operacion?: TipoOperacionLogistica;
}): PedidoLogisticoEvent {
  const { pedido, negocio_id, categoria_id, tipo_operacion } = params;
  const canonicalNegocioId = extraer_negocio_id_canonico(negocio_id, categoria_id) || negocio_id;
  const timestamp = new Date().toISOString();
  const canal_origen = mapearCanalOrigen(pedido);
  const operacion = tipo_operacion || determinarTipoOperacion(pedido);
  const idempotencia_key = `pedido_logistico:${canonicalNegocioId}:${pedido.id}`;
  const evento_id = `evt_log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    evento_id,
    negocio_id: canonicalNegocioId,
    pedido_id: pedido.id,
    canal_origen,
    tipo_operacion: operacion,
    timestamp,
    idempotencia_key,
  };
}

export interface OpcionesDespacho {
  dbReparto?: Database;
  dbOperacion?: Database;
  rutaNegocio?: string;
}

// Cola en memoria para reintentos en caso de indisponibilidad remota
const COLA_PENDIENTES = new Map<string, { evento: PedidoLogisticoEvent; opciones?: OpcionesDespacho }>();

export class DespachadorEventosLogisticos {
  /**
   * Emite el evento logístico hacia el ecosistema de Servicio a Domicilio.
   * CERO BLOQUEOS: Si no se puede entregar inmediatamente, se encola para reintento.
   */
  async despachar(
    evento: PedidoLogisticoEvent,
    opciones?: OpcionesDespacho
  ): Promise<{ success: boolean; encolado: boolean }> {
    const dbReparto = opciones?.dbReparto || getRtdb('reparto');

    // 1. Guardar en cola local antes de emitir (para asegurar resiliencia)
    COLA_PENDIENTES.set(evento.idempotencia_key, { evento, opciones });

    if (opciones?.dbOperacion && opciones?.rutaNegocio) {
      try {
        const localQueueRef = ref(
          opciones.dbOperacion,
          `${opciones.rutaNegocio}/cola_logistica_pendiente/${evento.idempotencia_key}`
        );
        await set(localQueueRef, evento);
      } catch (queueErr) {
        logger.warn('DISPATCHER_LOGISTICO', 'No se pudo escribir en cola local RTDB', queueErr);
      }
    }

    // 2. Intentar emisión hacia la RTDB de Servicio a Domicilio
    try {
      const eventoRef = ref(
        dbReparto,
        `servicio_a_domicilio/eventos/${evento.idempotencia_key}`
      );
      await set(eventoRef, evento);

      // Limpieza de cola tras éxito
      COLA_PENDIENTES.delete(evento.idempotencia_key);
      if (opciones?.dbOperacion && opciones?.rutaNegocio) {
        try {
          const localQueueRef = ref(
            opciones.dbOperacion,
            `${opciones.rutaNegocio}/cola_logistica_pendiente/${evento.idempotencia_key}`
          );
          await remove(localQueueRef);
        } catch {
          // Silencioso
        }
      }

      logger.info(
        'DISPATCHER_LOGISTICO',
        `Evento logístico emitido a Servicio a Domicilio: ${evento.idempotencia_key}`
      );
      return { success: true, encolado: false };
    } catch (remoteError) {
      logger.warn(
        'DISPATCHER_LOGISTICO',
        `Servicio a Domicilio inaccesible. Evento ${evento.idempotencia_key} encolado para reintento`,
        remoteError
      );
      return { success: false, encolado: true };
    }
  }

  /**
   * Disparo asíncrono no bloqueante ("fire and forget").
   * Garantiza que la cocina siga imprimiendo y el pedido continúe vivo en marisquerías.
   */
  despacharFireAndForget(evento: PedidoLogisticoEvent, opciones?: OpcionesDespacho): void {
    void this.despachar(evento, opciones).catch((err) => {
      logger.error('DISPATCHER_LOGISTICO', 'Error en despacho fire and forget', err as Error);
    });
  }

  /**
   * Reintenta los eventos encolados cuando se restablece la conexión
   */
  async reintentarCola(): Promise<number> {
    if (COLA_PENDIENTES.size === 0) return 0;
    let procesados = 0;

    for (const [key, item] of Array.from(COLA_PENDIENTES.entries())) {
      try {
        const dbReparto = item.opciones?.dbReparto || getRtdb('reparto');
        const eventoRef = ref(dbReparto, `servicio_a_domicilio/eventos/${key}`);
        await set(eventoRef, item.evento);
        COLA_PENDIENTES.delete(key);
        procesados++;
      } catch {
        // Se mantiene en cola
      }
    }

    return procesados;
  }

  /**
   * Retorna el número de eventos pendientes en cola
   */
  get pendientesCount(): number {
    return COLA_PENDIENTES.size;
  }

  limpiarCola(): void {
    COLA_PENDIENTES.clear();
  }
}

export const despachadorEventosLogisticos = new DespachadorEventosLogisticos();

/**
 * Función helper para emitir el evento logístico si el pedido lo requiere
 */
export function emitirSiRequiereLogistica(
  pedido: any,
  negocio_id: string,
  opciones?: OpcionesDespacho
): boolean {
  if (!pedido || !pedidoRequiereLogistica(pedido)) {
    return false;
  }

  const evento = construirPedidoLogisticoEvent({
    pedido,
    negocio_id,
  });

  despachadorEventosLogisticos.despacharFireAndForget(evento, opciones);
  return true;
}
