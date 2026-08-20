/**
 * 🎨 HOOK — LÓGICA VISUAL DEL MOSTRADOR (Marisquería) v0.2
 *
 * DOGMA ADI — INTÉRPRETE (capa media):
 * - Maneja ÚNICAMENTE estados de interfaz: modales, toggles, selección de mesa.
 * - NO llama a Firebase. NO llama a AsyncStorage. NO hace I/O directo.
 * - Sirve de pasarela limpia entre los componentes visuales y el Core Ciego.
 * - Cuando el mesero confirma la orden, construye un ComandoOrdenLista y lo
 *   encola en la CommandQueue singleton — sin esperar la escritura en SQLite.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComandoOrdenLista, ItemPendiente } from '../../../sistema/tipos/pos';
import { comandosPOS } from '../../../sistema/commands/CommandQueue';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE CONTRATO VISUAL
// ─────────────────────────────────────────────────────────────────────────────

export type ModoMostrador = 'mesas' | 'pedido' | 'cobro' | null;

export type MesaSeleccionada = {
  mesaId: string;
  origen: 'mesa' | 'takeaway' | 'barra';
};

/** Callbacks que el Core debe inyectar para que el hook pueda delegar. */
export type CallbacksCore = {
  /** Persistir el draft enviado en SQLite (executor inyectado en la CommandQueue) */
  onOrdenLista: (cmd: ComandoOrdenLista) => Promise<void>;
  /** Agregar ítem al borrador del Core */
  onAgregarItem: (mesaId: string, item: ItemPendiente) => Promise<void>;
  /** Eliminar ítem del borrador del Core */
  onEliminarItem: (mesaId: string, itemId: string) => Promise<void>;
  /** Incrementar cantidad en el Core */
  onIncrementarItem: (mesaId: string, itemId: string) => Promise<void>;
  /** Limpiar borrador completo */
  onVaciarBorrador: (mesaId: string) => Promise<void>;
};

/** Props de configuración del hook */
export type UseMostradorVisualProps = {
  deviceId: string;
  callbacks: CallbacksCore;
};

/** Lo que este hook expone a los bloques visuales. */
export type MostradorVisualState = {
  // ── Estado de UI ──────────────────────────────────────────────────────────
  modo: ModoMostrador;
  mesaActiva: MesaSeleccionada | null;
  mostrarModalVariantes: boolean;
  mostrarModalBluetooth: boolean;
  mostrarModalProductos: boolean;
  cargandoCobro: boolean;

  // ── Acciones de UI ────────────────────────────────────────────────────────
  seleccionarMesa: (mesa: MesaSeleccionada) => void;
  deseleccionarMesa: () => void;
  abrirModalVariantes: () => void;
  cerrarModalVariantes: () => void;
  abrirModalBluetooth: () => void;
  cerrarModalBluetooth: () => void;
  abrirModalProductos: () => void;
  cerrarModalProductos: () => void;

  // ── Pasarelas al Core (delegadas) ─────────────────────────────────────────
  /**
   * Confirma la orden del mesero.
   * Construye el ComandoOrdenLista y lo encola en la CommandQueue sin bloquear la UI.
   * La escritura en SQLite ocurre en background mediante el executor inyectado.
   */
  confirmarOrden: (draftId: string, items: ItemPendiente[]) => void;
  agregarItem: (item: ItemPendiente) => Promise<void>;
  eliminarItem: (itemId: string) => Promise<void>;
  incrementarItem: (itemId: string) => Promise<void>;
  vaciarBorrador: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDAD: generador de UUID v4 simple (sin dependencia externa)
// ─────────────────────────────────────────────────────────────────────────────

function generarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook de lógica visual para el mostrador de marisquería.
 *
 * @param props.deviceId  - ID físico del dispositivo (para dedupeKey)
 * @param props.callbacks - Funciones del Core inyectadas por el componente raíz.
 */
export function useMostradorVisual({
  deviceId,
  callbacks,
}: UseMostradorVisualProps): MostradorVisualState {
  // ── Estado de interfaz ────────────────────────────────────────────────────
  const [modo, setModo] = useState<ModoMostrador>(null);
  const [mesaActiva, setMesaActiva] = useState<MesaSeleccionada | null>(null);
  const [mostrarModalVariantes, setMostrarModalVariantes] = useState(false);
  const [mostrarModalBluetooth, setMostrarModalBluetooth] = useState(false);
  const [mostrarModalProductos, setMostrarModalProductos] = useState(false);
  const [cargandoCobro, setCargandoCobro] = useState(false);

  // Ref para evitar stale closure en callbacks
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // ── Acciones de UI ────────────────────────────────────────────────────────

  const seleccionarMesa = useCallback((mesa: MesaSeleccionada) => {
    setMesaActiva(mesa);
    setModo('pedido');
  }, []);

  const deseleccionarMesa = useCallback(() => {
    setMesaActiva(null);
    setModo('mesas');
    setMostrarModalProductos(false);
    setMostrarModalVariantes(false);
  }, []);

  const abrirModalVariantes = useCallback(() => setMostrarModalVariantes(true), []);
  const cerrarModalVariantes = useCallback(() => setMostrarModalVariantes(false), []);
  const abrirModalBluetooth = useCallback(() => setMostrarModalBluetooth(true), []);
  const cerrarModalBluetooth = useCallback(() => setMostrarModalBluetooth(false), []);
  const abrirModalProductos = useCallback(() => setMostrarModalProductos(true), []);
  const cerrarModalProductos = useCallback(() => setMostrarModalProductos(false), []);

  // ── Pasarela al Core: ORDER_DRAFT_READY ──────────────────────────────────

  /**
   * Construye el sobre idempotente y lo encola en la CommandQueue.
   * Fire-and-forget: la UI responde INSTANTÁNEAMENTE.
   * El executor (callbacks.onOrdenLista) corre en background sin bloquear disco.
   */
  const confirmarOrden = useCallback(
    (draftId: string, items: ItemPendiente[]) => {
      if (!mesaActiva) {
        console.warn('[useMostradorVisual] confirmarOrden: no hay mesa activa');
        return;
      }

      const cmd: ComandoOrdenLista = {
        tipo: 'ORDER_DRAFT_READY',
        operationId: generarUUID(),
        dedupeKey: `${draftId}:${deviceId}:ORDER_DRAFT_READY`,
        timestamp: Date.now(),
        draftId,
        mesaId: mesaActiva.mesaId,
        deviceId,
        items,
      };

      // Feedback visual inmediato
      setCargandoCobro(true);

      // Encolado no bloqueante — SQLite corre en background
      comandosPOS.enqueueOrdenLista(cmd, async (c) => {
        try {
          await callbacksRef.current.onOrdenLista(c);
        } finally {
          setCargandoCobro(false);
          deseleccionarMesa();
        }
      });
    },
    [mesaActiva, deviceId, deseleccionarMesa]
  );

  // ── Pasarelas simples al Core ─────────────────────────────────────────────

  const agregarItem = useCallback(
    async (item: ItemPendiente) => {
      if (!mesaActiva) return;
      await callbacksRef.current.onAgregarItem(mesaActiva.mesaId, item);
    },
    [mesaActiva]
  );

  const eliminarItem = useCallback(
    async (itemId: string) => {
      if (!mesaActiva) return;
      await callbacksRef.current.onEliminarItem(mesaActiva.mesaId, itemId);
    },
    [mesaActiva]
  );

  const incrementarItem = useCallback(
    async (itemId: string) => {
      if (!mesaActiva) return;
      await callbacksRef.current.onIncrementarItem(mesaActiva.mesaId, itemId);
    },
    [mesaActiva]
  );

  const vaciarBorrador = useCallback(async () => {
    if (!mesaActiva) return;
    await callbacksRef.current.onVaciarBorrador(mesaActiva.mesaId);
    deseleccionarMesa();
  }, [mesaActiva, deseleccionarMesa]);

  // ── Resultado ─────────────────────────────────────────────────────────────

  return {
    modo,
    mesaActiva,
    mostrarModalVariantes,
    mostrarModalBluetooth,
    mostrarModalProductos,
    cargandoCobro,
    seleccionarMesa,
    deseleccionarMesa,
    abrirModalVariantes,
    cerrarModalVariantes,
    abrirModalBluetooth,
    cerrarModalBluetooth,
    abrirModalProductos,
    cerrarModalProductos,
    confirmarOrden,
    agregarItem,
    eliminarItem,
    incrementarItem,
    vaciarBorrador,
  };
}
