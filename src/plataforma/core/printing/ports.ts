export type SpoolJobState =
  | 'pendiente_aprobacion'
  | 'pendiente_impresion'
  | 'impresion_enviada'
  | 'exito'
  | 'fallo';

export type SpoolPurpose =
  | 'cuenta'
  | 'cocina'
  | 'comanda'
  | 'reimpresion'
  | 'venta_crudo'
  | 'standard'
  | 'otro';

export type SpoolJob = {
  jobId: string;
  orderId: string;
  deviceId?: string; // address or logical id
  channel?: string; // 🔥 Ruta de cola/hub (ej: 'standard' | 'venta_crudo'). Si falta, se deriva de purpose.
  purpose: SpoolPurpose;
  state: SpoolJobState;
  attempts: number;
  lastError?: string;
  payload?: any; // 🆕 Datos adicionales para el trabajo (ej. totales calculados)
  templateVersion: string;
  createdAt: number;
  updatedAt: number;
};

export interface SpoolerPort {
  enqueue(job: Omit<SpoolJob, 'state' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<SpoolJob>;
  cancel(jobId: string): Promise<void>;
  get(jobId: string): Promise<SpoolJob | null>;
}

export interface DeviceQueuePort {
  addToDeviceQueue(deviceId: string, jobId: string): Promise<void>;
  removeFromDeviceQueue(deviceId: string, jobId: string): Promise<void>;
  listDeviceQueue(deviceId: string): Promise<string[]>;
}

export function buildJobId(input: {
  orderId: string;
  purpose: SpoolPurpose;
  templateVersion: string;
}) {
  const { orderId, purpose, templateVersion } = input;
  return `job_${purpose}_${templateVersion}_${orderId}`;
}
