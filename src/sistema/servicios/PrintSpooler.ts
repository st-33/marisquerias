import type { Database } from 'firebase/database';
import type { SpoolJob } from '../impresion/legacy/ports';
import { DespachadorCola } from '../impresion/fierros/cola/DespachadorCola';
import { validarRutaTenant } from '../rtdb/rutas/RutaTenant';

export type SpoolerConfig = {
  maxRetries: number;
  retryDelayMs: number;
  autoProcess: boolean;
  channel?: string;
};

const DEFAULT_CONFIG: SpoolerConfig = {
  maxRetries: 1,
  retryDelayMs: 2000,
  autoProcess: true,
};

/**
 * PROXY LEGACY: PrintSpooler
 * Mapea todas las llamadas legacy al nuevo DespachadorCola unificado.
 */
export class PrintSpooler {
  private static wrappers = new Map<string, PrintSpooler>();

  private despachador: DespachadorCola;
  private instanceId: string;

  private constructor(
    db: Database,
    tenantPath: string,
    deviceId: string,
    config: Partial<SpoolerConfig> = {},
    mode: 'device' | 'hub' = 'device'
  ) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    this.despachador = DespachadorCola.obtenerInstancia(
      db,
      tenantPath,
      deviceId,
      {
        maxReintentos: fullConfig.maxRetries,
        retardoReintento: fullConfig.retryDelayMs,
        procesamientoAuto: fullConfig.autoProcess,
        canal: fullConfig.channel as any,
      },
      mode === 'hub' ? 'hub' : 'dispositivo'
    );
    this.instanceId = `${deviceId}_proxy_${Math.random().toString(36).slice(2, 7)}`;
    console.log(`[PrintSpooler Proxy] 🟢 Wrapper created: ${this.instanceId}`);
  }

  public static getInstance(
    db: Database,
    tenantPath: string,
    deviceId: string,
    config: Partial<SpoolerConfig> = {},
    mode: 'device' | 'hub' = 'device'
  ): PrintSpooler {
    if (!validarRutaTenant(tenantPath)) {
      throw new Error(`Intento de instanciar PrintSpooler con ruta inválida/legacy: ${tenantPath}`);
    }

    const key = `${tenantPath}_${mode}`;
    let wrapper = PrintSpooler.wrappers.get(key);

    if (!wrapper) {
      wrapper = new PrintSpooler(db, tenantPath, deviceId, config, mode);
      PrintSpooler.wrappers.set(key, wrapper);
    } else {
      // Re-obtener la instancia interna del despachador con la nueva configuración
      const fullConfig = { ...DEFAULT_CONFIG, ...config };
      wrapper.despachador = DespachadorCola.obtenerInstancia(
        db,
        tenantPath,
        deviceId,
        {
          maxReintentos: fullConfig.maxRetries,
          retardoReintento: fullConfig.retryDelayMs,
          procesamientoAuto: fullConfig.autoProcess,
          canal: fullConfig.channel as any,
        },
        mode === 'hub' ? 'hub' : 'dispositivo'
      );
    }

    return wrapper;
  }

  public static destroyInstance(tenantPath: string, mode: 'device' | 'hub'): void {
    const key = `${tenantPath}_${mode}`;
    PrintSpooler.wrappers.delete(key);
    DespachadorCola.destruirInstancia(tenantPath, mode === 'hub' ? 'hub' : 'dispositivo');
  }

  public start(): void {
    this.despachador.iniciar();
  }

  public stop(): void {
    this.despachador.detener();
  }

  public async enqueue(
    job: Omit<SpoolJob, 'state' | 'attempts' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    console.log(`[PrintSpooler Proxy] Enqueuing job: ${job.jobId || 'auto'}`);
    return this.despachador.encolar({
      proposito: job.purpose as any,
      idPedido: job.orderId,
      idDispositivo: job.deviceId,
      canal: job.channel as any,
      payload: job.payload,
    });
  }
}
