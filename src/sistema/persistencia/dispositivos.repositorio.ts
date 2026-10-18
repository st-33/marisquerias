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

  private getConfiguracionHubPath() {
    return `${this.rutaNegocio}/impresion/hubs`;
  }

  /**
   * Suscribirse a la configuración de Hub Central
   */
  suscribirConfiguracionHub(
    callback: (config: Partial<ConfiguracionHub> | null) => void
  ): () => void {
    const r = ref(this.db, this.getConfiguracionHubPath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as Partial<ConfiguracionHub>) : null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Establecer configuración de Hub Central (reemplazo completo)
   */
  async establecerConfiguracionHub(config: ConfiguracionHub): Promise<void> {
    const r = ref(this.db, this.getConfiguracionHubPath());
    await set(r, sanitizeRtdbPayload(config));
  }

  /**
   * Actualizar configuración de Hub Central (actualización parcial)
   */
  async actualizarConfiguracionHub(updates: Partial<ConfiguracionHub>): Promise<void> {
    const r = ref(this.db, this.getConfiguracionHubPath());
    await update(r, sanitizeRtdbPayload(updates));
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
