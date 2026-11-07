/**
 * 🖨️ REPOSITORIO DE DISPOSITIVOS
 * Capa de abstracción para operaciones de dispositivos e impresión
 * NUNCA llamar a Firebase directamente desde componentes o hooks de negocio
 */

import type { Database } from 'firebase/database';
import { get, off, onValue, ref, set, update } from 'firebase/database';
import type { PrintPolicies, PrinterRef } from '@/sistema/impresion/fierros/contratos/tipos';
import { assertValidRutaNegocio, sanitizeRtdbPayload } from '../rtdb/guards';

/**
 * Configuración de formato de ticket
 */
export type ConfiguracionTicket = {
  // Header
  businessName: string;
  businessLogo?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessRFC?: string;
  businessEmail?: string;

  // Formato
  printLogo: boolean;
  paperWidth: 48 | 58 | 80; // mm
  fontSize: 'small' | 'normal' | 'large';

  // Footer
  footerMessage?: string;
  printDate: boolean;
  printTime: boolean;
  printCashier: boolean;

  // Social
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
};

export class RepositorioDispositivos {
  constructor(
    private db: Database,
    private rutaNegocio: string
  ) {
    assertValidRutaNegocio(rutaNegocio);
  }

  private getPoliciesPath() {
    return `${this.rutaNegocio}/impresion/politicas`;
  }

  private getDefaultPrinterPath() {
    return `${this.rutaNegocio}/impresion/rutas/defaultPrinter`;
  }

  private getTestMessagePath() {
    return `${this.rutaNegocio}/impresion/destinos/testMessage`;
  }

  private getConfiguracionTicketPath() {
    return `${this.rutaNegocio}/ajustes/ticket`;
  }

  /**
   * Suscribirse a políticas de impresión
   */
  suscribirPoliticasImpresion(
    callback: (policies: Partial<PrintPolicies> | null) => void
  ): () => void {
    const r = ref(this.db, this.getPoliciesPath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as Partial<PrintPolicies>) : null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Actualizar políticas de impresión (actualización parcial)
   */
  async actualizarPoliticasImpresion(updates: Partial<PrintPolicies>): Promise<void> {
    const r = ref(this.db, this.getPoliciesPath());
    await update(r, sanitizeRtdbPayload(updates));
  }

  /**
   * Suscribirse a impresora por defecto
   */
  suscribirDefaultPrinter(callback: (printer: PrinterRef | null) => void): () => void {
    const r = ref(this.db, this.getDefaultPrinterPath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as PrinterRef) : null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Establecer impresora por defecto
   */
  async establecerDefaultPrinter(printer: PrinterRef | null): Promise<void> {
    const r = ref(this.db, this.getDefaultPrinterPath());
    await set(r, printer);
  }

  /**
   * Suscribirse a mensaje de prueba
   */
  suscribirTestMessage(callback: (message: string) => void): () => void {
    const r = ref(this.db, this.getTestMessagePath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? String(snap.val()) || '' : '');
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Establecer mensaje de prueba
   */
  async establecerTestMessage(message: string): Promise<void> {
    const r = ref(this.db, this.getTestMessagePath());
    await set(r, message || '');
  }

  /**
   * Suscribirse a configuración de formato de ticket
   */
  suscribirConfiguracionTicket(
    callback: (config: Partial<ConfiguracionTicket> | null) => void
  ): () => void {
    const r = ref(this.db, this.getConfiguracionTicketPath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as Partial<ConfiguracionTicket>) : null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Actualizar configuración de formato de ticket (reemplazo completo)
   */
  async actualizarConfiguracionTicket(config: ConfiguracionTicket): Promise<void> {
    const r = ref(this.db, this.getConfiguracionTicketPath());
    await set(r, sanitizeRtdbPayload(config));
  }

  private normalizarDestinoHub(destino?: string | null): 'restaurante' | 'mostrador' {
    if (destino === 'venta_crudo' || destino === 'mostrador') return 'mostrador';
    return 'restaurante';
  }

  private getConfiguracionHubPath(destino?: 'restaurante' | 'mostrador' | 'venta_crudo') {
    if (destino) {
      const normalizado = this.normalizarDestinoHub(destino);
      return `${this.rutaNegocio}/impresion/hubs/${normalizado}`;
    }
    return `${this.rutaNegocio}/impresion/hubs`;
  }

  /**
   * Suscribirse a la configuración de Hub Central.
   * Admite tanto el nodo particionado (restaurante / mostrador / venta_crudo) como el nodo plano legacy.
   */
  suscribirConfiguracionHub(
    callback: (
      config: Partial<ConfiguracionHub> | null,
      hubs?: Record<string, ConfiguracionHub>
    ) => void,
    filtroDestino?: 'restaurante' | 'mostrador' | 'venta_crudo'
  ): () => void {
    const r = ref(this.db, `${this.rutaNegocio}/impresion/hubs`);
    const cb = onValue(r, (snap) => {
      if (!snap.exists()) {
        callback(null, {});
        return;
      }
      const val = snap.val();
      // Si tiene enabled directo a nivel raíz, es el formato plano anterior
      if (typeof val.enabled === 'boolean') {
        const destino = this.normalizarDestinoHub(val.destination);
        const configNorm = { ...val, destination: destino } as ConfiguracionHub;
        const hubsMap: Record<string, ConfiguracionHub> = {
          [destino]: configNorm,
          venta_crudo: configNorm,
        };
        const filtroNorm = filtroDestino ? this.normalizarDestinoHub(filtroDestino) : null;
        if (filtroNorm && filtroNorm !== destino) {
          callback(null, hubsMap);
        } else {
          callback(configNorm, hubsMap);
        }
        return;
      }

      // Formato particionado
      const hubsMap: Record<string, ConfiguracionHub> = {};
      if (val.restaurante && typeof val.restaurante === 'object') {
        hubsMap.restaurante = { ...val.restaurante, destination: 'restaurante' };
      }
      const mostradorRaw = val.mostrador || val.venta_crudo;
      if (mostradorRaw && typeof mostradorRaw === 'object') {
        const mostradorConfig: ConfiguracionHub = { ...mostradorRaw, destination: 'mostrador' };
        hubsMap.mostrador = mostradorConfig;
        hubsMap.venta_crudo = mostradorConfig;
      }

      const filtroNorm = filtroDestino ? this.normalizarDestinoHub(filtroDestino) : null;
      if (filtroNorm) {
        callback(hubsMap[filtroNorm] || null, hubsMap);
      } else {
        // Priorizar el activo o el primero existente
        const activo =
          Object.values(hubsMap).find((h) => h.enabled) ||
          hubsMap.restaurante ||
          hubsMap.mostrador ||
          null;
        callback(activo, hubsMap);
      }
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Establecer configuración de Hub Central
   * Escribe en `${rutaNegocio}/impresion/hubs/${destino}` con espejo retrocompatible.
   * Si un dispositivo físico se asigna a un canal, libera su vínculo del canal opuesto
   * para garantizar que un dispositivo solo opere un Hub a la vez.
   */
  async establecerConfiguracionHub(config: ConfiguracionHub): Promise<void> {
    const destino = this.normalizarDestinoHub(config.destination);
    const otroDestino = destino === 'restaurante' ? 'mostrador' : 'restaurante';
    const rRaiz = ref(this.db, `${this.rutaNegocio}/impresion/hubs`);

    const sanitizado = sanitizeRtdbPayload({
      ...config,
      destination: destino,
    });
    const updates: Record<string, any> = {
      [destino]: sanitizado,
    };
    if (destino === 'mostrador') {
      updates.venta_crudo = sanitizado;
    }

    // Si este mismo dispositivo estaba registrado como Hub del otro canal y ahora se activa aquí,
    // desactivar el otro canal para evitar colisión en la misma impresora física.
    if (config.enabled && config.deviceId) {
      try {
        const snapOtro = await get(ref(this.db, `${this.rutaNegocio}/impresion/hubs/${otroDestino}`));
        const valOtro = snapOtro.val();
        if (valOtro && valOtro.deviceId === config.deviceId && valOtro.enabled) {
          const desact = sanitizeRtdbPayload({
            ...valOtro,
            enabled: false,
            updatedAt: config.updatedAt || Date.now(),
          });
          updates[otroDestino] = desact;
          if (otroDestino === 'mostrador') {
            updates.venta_crudo = desact;
          }
        }
      } catch {
        // Ignorar lectura opcional
      }
    }

    await update(rRaiz, updates);
  }

  /**
   * Actualizar configuración de Hub Central
   */
  async actualizarConfiguracionHub(updates: Partial<ConfiguracionHub>): Promise<void> {
    const destino = this.normalizarDestinoHub(updates.destination);
    const otroDestino = destino === 'restaurante' ? 'mostrador' : 'restaurante';
    const rRaiz = ref(this.db, `${this.rutaNegocio}/impresion/hubs`);

    const sanitizado = sanitizeRtdbPayload({
      ...updates,
      destination: destino,
    });
    const batchUpdates: Record<string, any> = {
      [destino]: sanitizado,
    };
    if (destino === 'mostrador') {
      batchUpdates.venta_crudo = sanitizado;
    }

    if (updates.enabled && updates.deviceId) {
      try {
        const rOtro = ref(this.db, `${this.rutaNegocio}/impresion/hubs/${otroDestino}`);
        const snapOtro = await get(rOtro);
        const valOtro = snapOtro.val();
        if (valOtro && valOtro.deviceId === updates.deviceId && valOtro.enabled) {
          const desact = sanitizeRtdbPayload({
            ...valOtro,
            enabled: false,
            updatedAt: updates.updatedAt || Date.now(),
          });
          batchUpdates[otroDestino] = desact;
          if (otroDestino === 'mostrador') {
            batchUpdates.venta_crudo = desact;
          }
        }
      } catch {
        // Ignorar lectura opcional
      }
    }

    await update(rRaiz, batchUpdates);
  }

  async actualizarHubConfig(updates: Partial<ConfiguracionHub>): Promise<void> {
    return this.actualizarConfiguracionHub(updates);
  }
}

/**
 * Configuración de Hub Central
 */
export type ConfiguracionHub = {
  enabled: boolean;
  destination: 'restaurante' | 'mostrador' | 'venta_crudo' | null;
  updatedAt: number;
  deviceId: string;
};

/** Nombres históricos conservados mientras los consumidores migran gradualmente. */
export { RepositorioDispositivos as DispositivosRepository };
export { RepositorioDispositivos as DevicesRepository };
export type { ConfiguracionTicket as TicketConfig };
export type { ConfiguracionHub as HubConfig };
