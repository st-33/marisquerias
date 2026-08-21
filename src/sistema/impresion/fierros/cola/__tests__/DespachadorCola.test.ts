import type { Database } from 'firebase/database';
import { get, onChildAdded, set, update } from 'firebase/database';
import { DespachadorCola, esTrabajoExpirado, SPOOL_JOB_TTL_MS } from '../DespachadorCola';

jest.mock('firebase/database', () => ({
  get: jest.fn(),
  onChildAdded: jest.fn(() => jest.fn()),
  onValue: jest.fn(() => jest.fn()),
  ref: jest.fn((db, path) => ({ db, path })),
  runTransaction: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../servicio/ServicioFierros', () => ({
  servicioFierros: {
    imprimirComanda: jest.fn(),
    imprimirCuenta: jest.fn(),
    imprimirTicketVenta: jest.fn(),
  },
}));

type MockSnapshot = {
  key: string | null;
  exists: () => boolean;
  val: () => unknown;
  forEach: (callback: (child: MockSnapshot) => void) => void;
};

function makeSnapshot(value: unknown, key: string | null = null): MockSnapshot {
  return {
    key,
    exists: () => value !== null && value !== undefined,
    val: () => value,
    forEach: (callback) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
        callback(makeSnapshot(childValue, childKey));
      });
    },
  };
}

describe('DespachadorCola — TTL y arranque no bloqueante', () => {
  const dbMock = {} as unknown as Database;
  const tenantPath = 'marisquerias/tenant-spooler-test';
  const deviceId = 'device-spooler-test';
  const now = 1_800_000_000_000;

  const mockGet = get as jest.Mock;
  const mockOnChildAdded = onChildAdded as jest.Mock;
  const mockSet = set as jest.Mock;
  const mockUpdate = update as jest.Mock;
  const oldJob = {
    jobId: 'job-cuenta-viejo',
    purpose: 'cuenta',
    state: 'pendiente_impresion',
    channel: 'standard',
    deviceId,
    attempts: 0,
    createdAt: now - SPOOL_JOB_TTL_MS - 1,
    updatedAt: now - SPOOL_JOB_TTL_MS - 1,
  };
  const recentJob = {
    ...oldJob,
    jobId: 'job-cuenta-reciente',
    createdAt: now - 60_000,
    updatedAt: now - 60_000,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.clearAllMocks();
    mockGet.mockImplementation(async (reference: { path: string }) => {
      if (reference.path.endsWith('/spool/devices/device-spooler-test/queue')) {
        return makeSnapshot({ [oldJob.jobId]: true });
      }
      if (reference.path.endsWith('/spool/jobs')) {
        return makeSnapshot({ [oldJob.jobId]: oldJob, [recentJob.jobId]: recentJob });
      }
      if (reference.path.endsWith(`/spool/jobs/${oldJob.jobId}`)) {
        return makeSnapshot(oldJob, oldJob.jobId);
      }
      return makeSnapshot(null);
    });
  });

  afterEach(() => {
    DespachadorCola.destruirInstancia(tenantPath, 'dispositivo');
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('considera expirado solo lo que supera 48 horas y rechaza timestamps inválidos', () => {
    expect(esTrabajoExpirado(now - SPOOL_JOB_TTL_MS - 1, now)).toBe(true);
    expect(esTrabajoExpirado(now - SPOOL_JOB_TTL_MS, now)).toBe(false);
    expect(esTrabajoExpirado(now - 60_000, now)).toBe(false);
    expect(esTrabajoExpirado(undefined, now)).toBe(true);
  });

  it('no lee ni procesa la cola histórica dentro de iniciar()', async () => {
    const despachador = DespachadorCola.obtenerInstancia(
      dbMock,
      tenantPath,
      deviceId,
      { procesamientoAuto: true },
      'dispositivo'
    );

    despachador.iniciar();
    const childAddedCallback = mockOnChildAdded.mock.calls[0][1] as (
      snapshot: MockSnapshot
    ) => void;
    childAddedCallback(makeSnapshot(true, 'job-nuevo-durante-arranque'));

    expect(mockGet).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();

    await jest.runOnlyPendingTimersAsync();

    expect(mockGet).toHaveBeenCalled();
  });

  it('elimina jobs expirados de jobs y de la cola, pero conserva jobs recientes', async () => {
    const despachador = DespachadorCola.obtenerInstancia(
      dbMock,
      tenantPath,
      deviceId,
      { procesamientoAuto: true },
      'dispositivo'
    );

    despachador.iniciar();
    await jest.runOnlyPendingTimersAsync();

    const deletedPaths = mockSet.mock.calls
      .filter(([, value]) => value === null)
      .map(([reference]) => reference.path);

    expect(deletedPaths).toEqual(
      expect.arrayContaining([
        `${tenantPath}/spool/jobs/${oldJob.jobId}`,
        `${tenantPath}/spool/devices/${deviceId}/queue/${oldJob.jobId}`,
      ])
    );
    expect(deletedPaths).not.toContain(`${tenantPath}/spool/jobs/${recentJob.jobId}`);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: `${tenantPath}/spool/jobs` }),
      { [oldJob.jobId]: null }
    );
  });

  it('detener cancela el procesamiento y el GC diferidos pendientes', async () => {
    const despachador = DespachadorCola.obtenerInstancia(
      dbMock,
      tenantPath,
      deviceId,
      { procesamientoAuto: true },
      'dispositivo'
    );

    despachador.iniciar();
    despachador.detener();
    await jest.runOnlyPendingTimersAsync();

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('encola un trabajo remoto en jobs y en la cola Hub del canal', async () => {
    const job = await DespachadorCola.encolarRemoto(dbMock, tenantPath, {
      idTrabajo: 'job_cuenta_v1_pedido-1',
      idPedido: 'pedido-1',
      proposito: 'cuenta',
      canal: 'standard',
      templateVersion: 'v1',
      payload: { mesaId: 'mesa-1' },
    });

    expect(job).toMatchObject({
      jobId: 'job_cuenta_v1_pedido-1',
      orderId: 'pedido-1',
      purpose: 'cuenta',
      channel: 'standard',
      state: 'pendiente_impresion',
      templateVersion: 'v1',
    });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `${tenantPath}/spool/jobs/job_cuenta_v1_pedido-1`,
      }),
      expect.objectContaining({ jobId: 'job_cuenta_v1_pedido-1' })
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `${tenantPath}/spool/hub/queue/job_cuenta_v1_pedido-1`,
      }),
      true
    );
  });

  it('no duplica un trabajo remoto pendiente ni uno ya exitoso', async () => {
    const existente = {
      jobId: 'job_cuenta_v1_pedido-2',
      orderId: 'pedido-2',
      purpose: 'cuenta',
      channel: 'standard',
      state: 'pendiente_impresion',
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    mockGet.mockResolvedValue(makeSnapshot(existente, existente.jobId));

    const job = await DespachadorCola.encolarRemotoIdempotente(dbMock, tenantPath, {
      idTrabajo: existente.jobId,
      idPedido: existente.orderId,
      proposito: 'cuenta',
      canal: 'standard',
    });

    expect(job).toEqual(existente);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
