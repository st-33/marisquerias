/**
 * 🛰️ LISTENER DE UNIDAD CENTRAL
 *
 * Suscripción en tiempo real a la configuración y estado emitidos por Central.
 *
 * REGLAS DE ORO:
 * 1. FRONTERA UNIDIRECCIONAL: Marisquerías solo LEE y ESCUCHA a Central. NUNCA escribe en `central/*`.
 * 2. CERO BLOQUEOS SÍNCRONOS: Si Central está caída o no responde, la operación local no se detiene.
 * 3. IDENTIDAD CANÓNICA: Se suscribe usando `negocio_id` canónico (ej: "puerto_libres").
 */

import { off, onValue, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import { logger } from '../monitoreo';
import type {
  CentralConfiguracion,
  CentralEstado,
} from '../store/slices/central';

export interface CentralListenerCallbacks {
  onConfiguracion?: (config: CentralConfiguracion | null) => void;
  onEstado?: (estado: CentralEstado | null) => void;
  onError?: (error: Error) => void;
}

export interface CentralListenerOptions {
  db: Database;
  negocio_id: string;
  callbacks: CentralListenerCallbacks;
}

export class CentralListener {
  private unsubConfig?: () => void;
  private unsubEstado?: () => void;
  private activo: boolean = false;

  constructor(
    private readonly db: Database,
    private readonly negocio_id: string
  ) {}

  iniciar(callbacks: CentralListenerCallbacks): () => void {
    if (this.activo) {
      this.detener();
    }

    if (!this.negocio_id) {
      logger.warn('CENTRAL_LISTENER', 'Intento de iniciar CentralListener sin negocio_id');
      return () => {};
    }

    this.activo = true;

    // 1. Suscripción a central/negocios/{negocio_id}/configuracion
    const configPath = `central/negocios/${this.negocio_id}/configuracion`;
    const configRef = ref(this.db, configPath);

    const onConfigChange = (snapshot: any) => {
      try {
        const val = snapshot.exists() ? (snapshot.val() as CentralConfiguracion) : null;
        callbacks.onConfiguracion?.(val);
      } catch (err) {
        logger.error('CENTRAL_LISTENER', 'Error procesando configuracion de Central', err as Error);
        callbacks.onError?.(err as Error);
      }
    };

    const onConfigError = (err: Error) => {
      logger.warn('CENTRAL_LISTENER', `Aviso al escuchar ${configPath}`, err);
      callbacks.onError?.(err);
    };

    onValue(configRef, onConfigChange, onConfigError);
    this.unsubConfig = () => off(configRef, 'value', onConfigChange);

    // 2. Suscripción a central/negocios/{negocio_id}/estado
    const estadoPath = `central/negocios/${this.negocio_id}/estado`;
    const estadoRef = ref(this.db, estadoPath);

    const onEstadoChange = (snapshot: any) => {
      try {
        const val = snapshot.exists() ? (snapshot.val() as CentralEstado) : null;
        callbacks.onEstado?.(val);
      } catch (err) {
        logger.error('CENTRAL_LISTENER', 'Error procesando estado de Central', err as Error);
        callbacks.onError?.(err as Error);
      }
    };

    const onEstadoError = (err: Error) => {
      logger.warn('CENTRAL_LISTENER', `Aviso al escuchar ${estadoPath}`, err);
      callbacks.onError?.(err);
    };

    onValue(estadoRef, onEstadoChange, onEstadoError);
    this.unsubEstado = () => off(estadoRef, 'value', onEstadoChange);

    logger.info('CENTRAL_LISTENER', `Suscripción activa para negocio canónico: ${this.negocio_id}`);

    return () => this.detener();
  }

  detener(): void {
    if (this.unsubConfig) {
      this.unsubConfig();
      this.unsubConfig = undefined;
    }
    if (this.unsubEstado) {
      this.unsubEstado();
      this.unsubEstado = undefined;
    }
    this.activo = false;
    logger.info('CENTRAL_LISTENER', `Suscripción detenida para negocio: ${this.negocio_id}`);
  }

  estaActivo(): boolean {
    return this.activo;
  }
}

/**
 * Helper para inicializar la suscripción de Central y conectarla directamente con el store.
 */
export function suscribirCentralAlStore(
  db: Database,
  negocio_id: string,
  store: {
    setCentralConfiguracion: (c: CentralConfiguracion | null) => void;
    setCentralEstado: (e: CentralEstado | null) => void;
    setCentralError: (err: string | null) => void;
  }
): () => void {
  const listener = new CentralListener(db, negocio_id);
  return listener.iniciar({
    onConfiguracion: (config) => store.setCentralConfiguracion(config),
    onEstado: (estado) => store.setCentralEstado(estado),
    onError: (err) => store.setCentralError(err.message),
  });
}
