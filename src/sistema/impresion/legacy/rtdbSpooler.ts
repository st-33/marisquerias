import type { Database } from 'firebase/database';
import { get, ref, set, update } from 'firebase/database';
import type { DeviceQueuePort, SpoolJob, SpoolerPort } from './ports';
import { buildJobId } from './ports';

export class RtdbSpooler implements SpoolerPort, DeviceQueuePort {
  constructor(private db: Database, private tenantPath: string) {}

  private jobPath(jobId: string) {
    return `${this.tenantPath}/spool/jobs/${jobId}`;
  }
  private deviceQueuePath(deviceId: string, jobId?: string) {
    return `${this.tenantPath}/spool/devices/${deviceId}/queue${jobId ? `/${jobId}` : ''}`;
  }

  /** 🆕 Path para la cola centralizada del Hub */
  private hubQueuePath(jobId?: string, channel: string = 'standard') {
    return `${this.tenantPath}/spool/hub/${channel === 'standard' ? '' : `${channel}/`}queue${
      jobId ? `/${jobId}` : ''
    }`.replace('//', '/');
  }

  /**
   * 🆕 Encola un trabajo en la cola centralizada del Hub
   * Usado cuando el modo de impresión es "hub"
   */
  async enqueueToHub(
    input: Omit<SpoolJob, 'state' | 'attempts' | 'createdAt' | 'updatedAt'>
  ): Promise<SpoolJob> {
    const jobId =
      input.jobId ||
      buildJobId({
        orderId: input.orderId,
        purpose: input.purpose,
        templateVersion: input.templateVersion,
      });
    const now = Date.now();
    const channel = input.channel || (input.purpose === 'venta_crudo' ? 'venta_crudo' : 'standard');
    const job: SpoolJob = {
      ...input,
      channel,
      jobId,
      state: 'pendiente_impresion',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    // 🔥 OPTIMIZATION: Parallel writes for lower latency
    await Promise.all([
      set(ref(this.db, this.jobPath(jobId)), job),
      set(ref(this.db, this.hubQueuePath(jobId, channel)), true),
    ]);

    return job;
  }

  /**
   * 🆕 Remueve un trabajo de la cola del Hub
   */
  async removeFromHubQueue(jobId: string, channel: string = 'standard'): Promise<void> {
    await set(ref(this.db, this.hubQueuePath(jobId, channel)), null as any);
  }

  /**
   * 🆕 Lista todos los trabajos pendientes en la cola del Hub
   */
  async listHubQueue(channel: string = 'standard'): Promise<string[]> {
    const snap = await get(ref(this.db, this.hubQueuePath(undefined, channel)));
    if (!snap.exists()) return [];
    const v = snap.val() || {};
    return Object.keys(v);
  }

  async enqueue(
    input: Omit<SpoolJob, 'state' | 'attempts' | 'createdAt' | 'updatedAt'>
  ): Promise<SpoolJob> {
    const jobId =
      input.jobId ||
      buildJobId({
        orderId: input.orderId,
        purpose: input.purpose,
        templateVersion: input.templateVersion,
      });
    const now = Date.now();
    const job: SpoolJob = {
      ...input,
      jobId,
      state: 'pendiente_impresion',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    await set(ref(this.db, this.jobPath(jobId)), job);
    if (input.deviceId) {
      await set(ref(this.db, this.deviceQueuePath(input.deviceId, jobId)), true);
    }
    return job;
  }

  async cancel(jobId: string): Promise<void> {
    await update(ref(this.db, this.jobPath(jobId)), {
      state: 'fallo',
      lastError: 'cancelled',
      updatedAt: Date.now(),
    });
  }

  async get(jobId: string): Promise<SpoolJob | null> {
    const snap = await get(ref(this.db, this.jobPath(jobId)));
    return snap.exists() ? (snap.val() as SpoolJob) : null;
  }

  async addToDeviceQueue(deviceId: string, jobId: string): Promise<void> {
    await set(ref(this.db, this.deviceQueuePath(deviceId, jobId)), true);
  }

  async removeFromDeviceQueue(deviceId: string, jobId: string): Promise<void> {
    await set(ref(this.db, this.deviceQueuePath(deviceId, jobId)), null as any);
  }

  async listDeviceQueue(deviceId: string): Promise<string[]> {
    const snap = await get(ref(this.db, this.deviceQueuePath(deviceId)));
    if (!snap.exists()) return [];
    const v = snap.val() || {};
    return Object.keys(v);
  }
}
