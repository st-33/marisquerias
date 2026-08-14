import type { Database } from 'firebase/database';
import type { SpoolJob } from './ports';
import { RtdbSpooler } from './rtdbSpooler';

/**
 * Servicio ligero para encolar impresiones de forma idempotente.
 * - Verifica si ya existe un job con el mismo jobId antes de encolar
 * - Si existe y tuvo éxito, retorna el job existente SIN crear duplicado
 * - Si existe y está pendiente, retorna el job existente
 * - Solo encola si NO existe o falló previamente
 */
export async function enqueuePrintIdempotent(
  db: Database,
  tenantPath: string,
  input: Omit<SpoolJob, 'state' | 'attempts' | 'createdAt' | 'updatedAt'>
): Promise<SpoolJob> {
  const spooler = new RtdbSpooler(db, tenantPath);
  const jobId =
    input.jobId ||
    (input.orderId && input.purpose && input.templateVersion
      ? `job_${input.purpose}_${input.templateVersion}_${input.orderId}`
      : undefined);

  if (jobId) {
    const existing = await spooler.get(jobId);
    if (existing) {
      // ✅ Si ya tuvo éxito, retornar sin encolar nuevo
      if (existing.state === 'exito') {
        console.log(
          `[enqueuePrintIdempotent] ✅ Job ${jobId} already succeeded. Returning existing job.`
        );
        return existing;
      }

      // ⏳ Si está pendiente o enviado, también retornar (no duplicar)
      if (existing.state === 'pendiente_impresion' || existing.state === 'impresion_enviada') {
        console.log(
          `[enqueuePrintIdempotent] ⏳ Job ${jobId} is pending/in-progress. Returning existing job.`
        );
        return existing;
      }

      // 🔄 Solo si falló, permitir reintento
      console.log(`[enqueuePrintIdempotent] 🔄 Retrying failed job ${jobId}`);
    }
  }

  console.log(`[enqueuePrintIdempotent] 🚀 Enqueuing NEW job to HUB: ${jobId || 'auto-generated'}`);
  const job = await spooler.enqueueToHub(input as any);
  return job;
}
