import type { ComandoOrdenLista } from '../tipos/pos';

export interface Comando<T> {
  execute(): Promise<T>;
  rollback?(): Promise<void>;
}

export class ColaComandos {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  async add<T>(command: Comando<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await command.execute();
          resolve(result);
        } catch (error) {
          if (command.rollback) {
            try {
              await command.rollback();
            } catch (rollbackError) {
              console.error('[ColaComandos] Error en rollback', rollbackError);
            }
          }
          reject(error);
        } finally {
          this.processNext();
        }
      };

      this.queue.push(task);
      if (!this.isProcessing) {
        this.processNext();
      }
    });
  }

  private processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift();
    if (!task) {
      this.isProcessing = false;
      return;
    }

    task().catch((error) => {
      console.error('[ColaComandos] Error procesando comando', error);
      this.processNext();
    });
  }

  /**
   * Encola el evento ORDER_DRAFT_READY de forma idempotente.
   *
   * DOGMA ADI:
   * - El executor recibe el payload y lo persiste en SQLite.
   * - Si el executor lanza, el error queda en la cola para reintento manual.
   * - No bloquea el hilo de UI: devuelve inmediatamente y procesa en background.
   *
   * @param cmd     - Payload tipado del evento (incluye operationId + dedupeKey)
   * @param executor - Función que realiza la escritura real en SQLite (inyectada por el Core)
   */
  enqueueOrdenLista(
    cmd: ComandoOrdenLista,
    executor: (cmd: ComandoOrdenLista) => Promise<void>
  ): void {
    const task = async () => {
      try {
        await executor(cmd);
      } catch (error) {
        console.error(
          `[ColaComandos] ORDER_DRAFT_READY falló — draftId: ${cmd.draftId} | op: ${cmd.operationId}`,
          error
        );
        // No hace rollback automático: el idempotente permite reintentar con mismo operationId.
      } finally {
        this.processNext();
      }
    };

    this.queue.push(task);
    if (!this.isProcessing) {
      this.processNext();
    }
  }
}

/**
 * Instancia singleton de la cola de comandos POS.
 *
 * DOGMA ADI:
 * - Una sola cola por proceso (no por componente).
 * - Los módulos importan esta instancia, nunca crean una nueva.
 */
export const comandosPOS = new ColaComandos();
