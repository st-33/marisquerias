import { Order, TenantTicketConfig } from './TicketFormatter';
import { servicioFierros } from '../../nucleo/sistema-impresion/servicio/ServicioFierros';

export type { Order, TenantTicketConfig };

// --- Interfaces y tipos ---

export interface PrinterInstance {
  init: () => Promise<void>;
  align: (align: 'lt' | 'ct' | 'rt') => PrinterInstance;
  style: (style: 'b' | 'normal') => PrinterInstance;
  text: (text: string) => PrinterInstance;
  feed: (n: number) => PrinterInstance;
  cut: () => PrinterInstance;
  image: (base64: string, size?: string) => Promise<PrinterInstance>;
  flush: () => Promise<void>;
}

export interface Device {
  name: string;
  address: string;
  originalDevice?: any;
}

export interface HardwareState {
  isConnected: boolean;
  isConnecting: boolean;
  connectedDevice: Device | null; // Primary printer
  connectedScale: Device | null; // Digital scale
  error: string | null;
}

export interface PesoResult {
  success: boolean;
  peso?: number;
  message?: string;
}

export interface CodigoResult {
  success: boolean;
  codigo?: string;
  message?: string;
}

type StateListener = (state: HardwareState) => void;

// --- Hardware Service Proxy ---
class HardwareService {
  private static instance: HardwareService;

  private state: HardwareState = {
    isConnected: false,
    isConnecting: false,
    connectedDevice: null,
    connectedScale: null,
    error: null,
  };
  private listeners: Set<StateListener> = new Set();

  private constructor() {
    // Sincronizar el estado en tiempo real con el singleton consolidado de la app
    servicioFierros.suscribir((estadoFierros) => {
      this.state = {
        isConnected: estadoFierros.estaConectado,
        isConnecting: estadoFierros.estaConectando,
        connectedDevice: estadoFierros.dispositivoActivo
          ? {
              name:
                estadoFierros.dispositivoActivo.nombre ||
                estadoFierros.dispositivoActivo.direccion ||
                'Impresora',
              address: estadoFierros.dispositivoActivo.direccion,
            }
          : null,
        connectedScale: estadoFierros.basculaActiva
          ? {
              name:
                estadoFierros.basculaActiva.nombre ||
                estadoFierros.basculaActiva.direccion ||
                'Báscula',
              address: estadoFierros.basculaActiva.direccion,
            }
          : null,
        error: estadoFierros.error,
      };
      this.notify();
    });
  }

  public static getInstance(): HardwareService {
    if (!HardwareService.instance) {
      HardwareService.instance = new HardwareService();
    }
    return HardwareService.instance;
  }

  // --- State Management ---
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public getState(): HardwareState {
    return this.state;
  }

  // --- Actions ---

  /**
   * Scans for Bluetooth devices delegating to the unified service.
   */
  public async scanForDevices(): Promise<Device[]> {
    console.log('HARDWARE_SERVICE: Delegating scan to servicioFierros...');
    const dispositivos = await servicioFierros.escanearDispositivos();
    return dispositivos.map((d) => ({
      name: d.nombre || d.direccion || 'Dispositivo Desconocido',
      address: d.direccion,
    }));
  }

  /**
   * Connects to a specific device.
   */
  public async connectToPrinter(deviceInfo: Device): Promise<void> {
    console.log(`HARDWARE_SERVICE: Delegating connection to printer ${deviceInfo.address}...`);
    await servicioFierros.conectarImpresora({
      nombre: deviceInfo.name,
      direccion: deviceInfo.address,
      tipo: 'bluetooth',
    });
  }

  /**
   * Connects to a digital scale.
   */
  public async connectToScale(deviceInfo: Device): Promise<void> {
    console.log(`HARDWARE_SERVICE: Delegating connection to scale ${deviceInfo.address}...`);
    await servicioFierros.conectarBascula({
      nombre: deviceInfo.name,
      direccion: deviceInfo.address,
      tipo: 'bluetooth',
    });
  }

  public async disconnect(): Promise<void> {
    console.log('HARDWARE_SERVICE: Delegating disconnect...');
    await servicioFierros.desconectar();
  }

  public async leerPeso(options?: {
    aplicarTara?: boolean;
    esperarEstabilidad?: boolean;
  }): Promise<PesoResult> {
    console.log('HARDWARE_SERVICE: Delegating leerPeso...');
    const res = await servicioFierros.leerPeso({
      timeout: 5000,
      esperarEstable: options?.esperarEstabilidad,
    });
    return {
      success: res.exito,
      peso: res.peso,
      message: res.mensaje,
    };
  }

  public async tararBascula(): Promise<{ success: boolean; message?: string }> {
    console.log('HARDWARE_SERVICE: Delegating tararBascula...');
    const res = await servicioFierros.tararBascula();
    return {
      success: res.exito,
      message: res.mensaje,
    };
  }

  public hasScale(): boolean {
    return !!servicioFierros.basculaActiva;
  }

  public hasPrinter(): boolean {
    return servicioFierros.estaConectado;
  }

  public hasScanner(): boolean {
    // Escáner legacy stub
    return false;
  }

  public async escanearCodigo(): Promise<CodigoResult> {
    return { success: false, message: 'Escáner no implementado para modo directo' };
  }

  public async escanearContinuo(callback: (res: CodigoResult) => void): Promise<() => void> {
    console.warn('escanearContinuo not implemented');
    return () => {};
  }

  public getPrinter(): Device | null {
    return this.state.connectedDevice;
  }

  public async imprimirTicketVenta(
    payload: { items: any[]; total: number; timestamp: number },
    config?: TenantTicketConfig
  ): Promise<void> {
    console.log('HARDWARE_SERVICE: Delegating imprimirTicketVenta...');
    const res = await servicioFierros.imprimirTicketVenta(
      {
        items: payload.items.map((item) => ({
          nombre: item.nombre || '',
          cantidad: item.cantidad || 0,
          precio: item.precio || 0,
          unidad: item.unidad || 'pza',
          subtotal: item.subtotal || (item.precio || 0) * (item.cantidad || 0),
        })),
        total: payload.total || 0,
        timestamp: payload.timestamp || Date.now(),
      },
      {
        nombreNegocio: config?.nombreNegocio || 'VENTA Y CRUDO',
        encabezado: config?.encabezado,
        mensajeFinal: config?.mensajeFinal,
      }
    );

    if (!res.exito) {
      throw new Error(res.mensaje || 'Error al imprimir ticket de venta');
    }
  }

  public async imprimirEtiquetaBascula(
    item: { nombre: string; peso: number; precio: number },
    config?: TenantTicketConfig
  ): Promise<void> {
    console.log('HARDWARE_SERVICE: Delegating imprimirEtiquetaBascula...');
    const res = await servicioFierros.imprimirEtiquetaBascula(
      {
        nombre: item.nombre,
        peso: item.peso,
        precioKg: item.precio,
        subtotal: item.peso * item.precio,
      },
      {
        nombreNegocio: config?.nombreNegocio || 'PESO EXACTO',
        encabezado: config?.encabezado,
        mensajeFinal: config?.mensajeFinal,
      }
    );

    if (!res.exito) {
      throw new Error(res.mensaje || 'Error al imprimir etiqueta de báscula');
    }
  }

  public async imprimirComanda(payload: any, options: { rol: string }): Promise<void> {
    console.log('HARDWARE_SERVICE: Delegating imprimirComanda...');
    const res = await servicioFierros.imprimirComanda(
      {
        mesaId: payload.mesaId || '0',
        tipo: payload.tipo || 'local',
        items: (payload.items || []).map((it: any) => ({
          nombre: it.nombre,
          cantidad: it.cantidad,
          variantes: it.variantes,
          notas: it.notas,
        })),
        timestamp: Date.now(),
      },
      {
        rol: options.rol as any,
      }
    );

    if (!res.exito) {
      throw new Error(res.mensaje || 'Error al imprimir comanda');
    }
  }

  public async imprimirCuenta(
    payload: any,
    options: { rol: string; tenantName: string }
  ): Promise<void> {
    console.log('HARDWARE_SERVICE: Delegating imprimirCuenta...');
    const res = await servicioFierros.imprimirCuenta(
      {
        mesaId: payload.mesaId || '0',
        tipo: payload.tipo || 'local',
        items: (payload.items || []).map((it: any) => ({
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio: it.precio || 0,
          variantes: it.variantes,
        })),
        totales: {
          subtotal: payload.totales?.subtotal || payload.subtotal || 0,
          total: payload.totales?.total || payload.total || 0,
        },
        timestamp: Date.now(),
      },
      {
        rol: options.rol as any,
        nombreNegocio: options.tenantName,
      }
    );

    if (!res.exito) {
      throw new Error(res.mensaje || 'Error al imprimir cuenta');
    }
  }
}

export const hardwareService = HardwareService.getInstance();
