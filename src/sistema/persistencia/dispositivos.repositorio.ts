/**
 * 🖨️ REPOSITORIO DE DISPOSITIVOS
 * Capa de abstracción para operaciones de dispositivos e impresión
 * NUNCA llamar a Firebase directamente desde componentes o hooks de negocio
 */

import type { Database } from 'firebase/database';
import { off, onValue, ref, set, update } from 'firebase/database';
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

  private getConfiguracionHubPath(destino?: 'restaurante' | 'venta_crudo') {
    if (destino) {
      return `${this.rutaNegocio}/impresion/hubs/${destino}`;
    }
    return `${this.rutaNegocio}/impresion/hubs`;
  }

  /**
   * Suscribirse a la configuración de Hub Central.
   * Admite tanto el nodo particionado (restaurante / venta_crudo) como el nodo plano legacy.
   */
  suscribirConfiguracionHub(
    callback: (
      config: Partial<ConfiguracionHub> | null,
      hubs?: Record<string, ConfiguracionHub>
    ) => void,
    filtroDestino?: 'restaurante' | 'venta_crudo'
  ): () => void {
    const r = ref(this.db, this.getConfiguracionHubPath());
    const cb = onValue(r, (snap) => {
      if (!snap.exists()) {
        callback(null, {});
        return;
      }
      const val = snap.val();
      // Si tiene enabled directo a nivel raíz, es el formato plano anterior
      if (typeof val.enabled === 'boolean') {
        const destino = val.destination || 'restaurante';
        const hubsMap: Record<string, ConfiguracionHub> = { [destino]: val as ConfiguracionHub };
        if (filtroDestino && filtroDestino !== destino) {
          callback(null, hubsMap);
        } else {
          callback(val as ConfiguracionHub, hubsMap);
        }
        return;
      }

      // Formato particionado
      const hubsMap: Record<string, ConfiguracionHub> = {};
      if (val.restaurante && typeof val.restaurante === 'object') {
        hubsMap.restaurante = val.restaurante;
      }
      if (val.venta_crudo && typeof val.venta_crudo === 'object') {
        hubsMap.venta_crudo = val.venta_crudo;
      }

      if (filtroDestino) {
        callback(hubsMap[filtroDestino] || null, hubsMap);
      } else {
        // Priorizar el activo o el primero existente
        const activo =
          Object.values(hubsMap).find((h) => h.enabled) ||
          hubsMap.restaurante ||
          hubsMap.venta_crudo ||
          null;
        callback(activo, hubsMap);
      }
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Establecer configuración de Hub Central
   * Escribe en `${rutaNegocio}/impresion/hubs/${destino}` y actualiza `${rutaNegocio}/impresion/hubs`
   * para conservar compatibilidad hacia atrás sin pisar el otro rol.
   */
  async establecerConfiguracionHub(config: ConfiguracionHub): Promise<void> {
    const destino = config.destination || 'restaurante';
    const rDestino = ref(this.db, `${this.rutaNegocio}/impresion/hubs/${destino}`);
    const rRaiz = ref(this.db, `${this.rutaNegocio}/impresion/hubs`);

    const sanitizado = sanitizeRtdbPayload(config);
    await set(rDestino, sanitizado);
    await update(rRaiz, {
      [destino]: sanitizado,
      enabled: config.enabled,
      destination: config.destination,
      updatedAt: config.updatedAt,
      deviceId: config.deviceId,
    });
  }

  /**
   * Actualizar configuración de Hub Central
   */
  async actualizarConfiguracionHub(updates: Partial<ConfiguracionHub>): Promise<void> {
    const destino = updates.destination || 'restaurante';
    const rDestino = ref(this.db, `${this.rutaNegocio}/impresion/hubs/${destino}`);
    const rRaiz = ref(this.db, `${this.rutaNegocio}/impresion/hubs`);

    const sanitizado = sanitizeRtdbPayload(updates);
    await update(rDestino, sanitizado);
    await update(rRaiz, {
      [destino]: sanitizado,
      ...sanitizado,
    });
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
  destination: 'restaurante' | 'venta_crudo' | null;
  updatedAt: number;
  deviceId: string;
};

/** Nombres históricos conservados mientras los consumidores migran gradualmente. */
export { RepositorioDispositivos as DispositivosRepository };
export { RepositorioDispositivos as DevicesRepository };
export type { ConfiguracionTicket as TicketConfig };
export type { ConfiguracionHub as HubConfig };
