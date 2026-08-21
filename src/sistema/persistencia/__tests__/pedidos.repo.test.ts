import type { Database } from 'firebase/database';
import { get, remove, ref, runTransaction, update } from 'firebase/database';
import { PedidosRepository } from '../pedidos.repo';

jest.mock('firebase/database', () => ({
  get: jest.fn(),
  off: jest.fn(),
  onValue: jest.fn(),
  ref: jest.fn((db, path) => ({ db, path })),
  remove: jest.fn().mockResolvedValue(undefined),
  runTransaction: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../impresion/fierros/cola/DespachadorCola', () => ({
  DespachadorCola: { encolarRemoto: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../monitoreo', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  initSentry: jest.fn(),
}));

jest.mock('../../monitoreo/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../capacidades/cocina/SincronizadorCocina', () => ({
  SincronizadorCocina: { descontarPorReceta: jest.fn() },
}));

type Snapshot = {
  val: () => unknown;
  exists: () => boolean;
};

function snapshot(value: unknown): Snapshot {
  return {
    val: () => value,
    exists: () => value !== null && value !== undefined,
  };
}

describe('PedidosRepository.cerrar', () => {
  const dbMock = {} as unknown as Database;
  const tenantPath = '2 alimentos_y_bebidas/marisquerias/puerto-libres';
  const timestamp = new Date(2026, 7, 21, 13, 35, 3).getTime();
  const pedido = {
    id: 'PED-20260821-001',
    tipo: 'mesa' as const,
    mesaId: 'mesa-5',
    estatus: 'activo',
    createdAt: timestamp - 60_000,
    items: {
      'IT-001': {
        id: 'IT-001',
        nombre: 'Aguachile',
        cantidad: 2,
        precio: 150,
        estado: 'entregado' as const,
        productId: 'prod-aguachile',
      },
    },
  };

  const mockGet = get as jest.Mock;
  const mockUpdate = update as jest.Mock;
  const mockRemove = remove as jest.Mock;
  const mockRunTransaction = runTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation(async (reference: { path: string }) => {
      if (reference.path.includes('/registro/ventas/')) return snapshot(null);
      return snapshot(pedido);
    });
    mockRunTransaction.mockImplementation(async (_reference, updater) => {
      const next = updater(0);
      return { committed: true, snapshot: snapshot(next) };
    });
  });

  it('cierra el pedido y enlaza la proyección de venta', async () => {
    await new PedidosRepository(dbMock, tenantPath).cerrar(pedido.id);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: `${tenantPath}/pedidos/${pedido.id}` }),
      expect.objectContaining({
        cerrado: true,
        estatus: 'cerrado',
        pagadoAt: expect.any(Number),
        registroVentaEstado: 'pendiente',
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: `${tenantPath}/pedidos/${pedido.id}` }),
      expect.objectContaining({
        registroVentaId: pedido.id,
        registroVentaNumero: 1,
        registroVentaEstado: 'registrado',
      })
    );
    expect(mockRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `${tenantPath}/pedidos_por_mesa/${pedido.mesaId}/${pedido.id}`,
      })
    );
  });
});
