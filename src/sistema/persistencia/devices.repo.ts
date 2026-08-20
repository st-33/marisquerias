/**
 * 🖨️ REPOSITORIO DE DISPOSITIVOS
 * Capa de abstracción para operaciones de dispositivos e impresión
 * NUNCA llamar a Firebase directamente desde componentes o hooks de negocio
 */

import type { Database } from 'firebase/database';
import { off, onValue, ref, set, update } from 'firebase/database';
import type { PrintPolicies, PrinterRef } from '../impresion/legacy/policies';
import { assertValidTenantPath, sanitizeRtdbPayload } from '../rtdb/guards';

/**
 * Configuración de formato de ticket
 */
export type TicketConfig = {
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

export class DevicesRepository {
  constructor(
    private db: Database,
    private tenantPath: string
  ) {
    assertValidTenantPath(tenantPath);
  }

  private getPoliciesPath() {
    return `${this.tenantPath}/ajustes/dispositivos/impresion/politicas`;
  }

  private getDefaultPrinterPath() {
    return `${this.tenantPath}/ajustes/dispositivos/impresion/defaultPrinter`;
  }

  private getTestMessagePath() {
    return `${this.tenantPath}/ajustes/dispositivos/impresion/testMessage`;
  }

  private getTicketConfigPath() {
    return `${this.tenantPath}/ajustes/ticket`;
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
  suscribirTicketConfig(callback: (config: Partial<TicketConfig> | null) => void): () => void {
    const r = ref(this.db, this.getTicketConfigPath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as Partial<TicketConfig>) : null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Actualizar configuración de formato de ticket (reemplazo completo)
   */
  async actualizarTicketConfig(config: TicketConfig): Promise<void> {
    const r = ref(this.db, this.getTicketConfigPath());
    await set(r, sanitizeRtdbPayload(config));
  }

  private getHubConfigPath() {
    return `${this.tenantPath}/config/hub`;
  }

  /**
   * Suscribirse a la configuración de Hub Central
   */
  suscribirHubConfig(callback: (config: Partial<HubConfig> | null) => void): () => void {
    const r = ref(this.db, this.getHubConfigPath());
    const cb = onValue(r, (snap) => {
      callback(snap.exists() ? (snap.val() as Partial<HubConfig>) : null);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Establecer configuración de Hub Central (reemplazo completo)
   */
  async establecerHubConfig(config: HubConfig): Promise<void> {
    const r = ref(this.db, this.getHubConfigPath());
    await set(r, sanitizeRtdbPayload(config));
  }

  /**
   * Actualizar configuración de Hub Central (actualización parcial)
   */
  async actualizarHubConfig(updates: Partial<HubConfig>): Promise<void> {
    const r = ref(this.db, this.getHubConfigPath());
    await update(r, sanitizeRtdbPayload(updates));
  }
}

/**
 * Configuración de Hub Central
 */
export type HubConfig = {
  enabled: boolean;
  destination: 'restaurante' | 'venta_crudo' | null;
  updatedAt: number;
  deviceId: string;
};
