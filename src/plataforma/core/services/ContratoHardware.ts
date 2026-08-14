/**
 * 🔌 CONTRATO DE HARDWARE
 * Interfaz formal para garantizar Abstracción Total en dispositivos.
 * Evita acoplar módulos operativos a implementaciones concretas.
 */

export type PrintResult = { success: boolean; message: string; jobId?: string };

export interface ContratoHardware {
  // Impresora
  setPrinter(address: string, name: string): Promise<void> | void;
  loadPersistedConfig(): Promise<void>;
  getPrinter(): { address: string | null; name: string | null };
  hasPrinter(): boolean;
  imprimirComanda(
    pedido: any,
    opciones?: { rol?: string; tenantName?: string }
  ): Promise<PrintResult>;
  imprimirCuenta(
    pedido: any,
    opciones?: { rol?: string; tenantName?: string }
  ): Promise<PrintResult>;
  imprimirTicketVenta(venta: any): Promise<PrintResult>;
  imprimirPrueba(mensaje?: string): Promise<PrintResult>;

  // Báscula
  setScale(config: {
    address: string;
    name: string;
    unidadPorDefecto: string;
    precision: number;
    tara?: number;
    timeout?: number;
  }): void;
  getScale(): any;
  hasScale(): boolean;
  leerPeso(options?: {
    aplicarTara?: boolean;
    esperarEstabilidad?: boolean;
    timeout?: number;
  }): Promise<{
    success: boolean;
    peso?: number;
    unidad?: string;
    message?: string;
    estable?: boolean;
  }>;
  tararBascula(): Promise<{ success: boolean; peso?: number; unidad?: string; message?: string }>;

  // Escáner
  setScanner(config: {
    address: string;
    name: string;
    timeout?: number;
    autoconfirm?: boolean;
  }): void;
  getScanner(): any;
  hasScanner(): boolean;
  escanearCodigo(options?: {
    timeout?: number;
    tipo?: string;
  }): Promise<{ success: boolean; codigo?: string; tipo?: string; message?: string }>;
  escanearContinuo(
    callback: (result: {
      success: boolean;
      codigo?: string;
      tipo?: string;
      message?: string;
    }) => void
  ): Promise<() => void>;
}
