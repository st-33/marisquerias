import { get, push, ref, update } from 'firebase/database';
import { InventoryV2Repository } from '../inventory.v2.repo';

jest.mock('firebase/database', () => ({
  get: jest.fn(),
  push: jest.fn(),
  ref: jest.fn((db, path) => ({ db, path })),
  update: jest.fn(),
}));

type Snapshot = {
  exists: () => boolean;
  val: () => unknown;
};

describe('InventoryV2Repository', () => {
  const dbMock = {} as object;
  const tenantPath = '2 alimentos_y_bebidas/marisquerias/puerto-libres';
  const mockGet = get as jest.Mock;
  const mockPush = push as jest.Mock;
  const mockUpdate = update as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      exists: () => true,
      val: () => ({
        id: 'area-mostrador',
        hubId: 'venta_crudo',
        nombre: 'Mostrador',
        tipo: 'mostrador',
        stock: { 'producto-1': 5 },
        updatedAt: 1,
      }),
    } satisfies Snapshot);
    let sequence = 0;
    mockPush.mockImplementation(() => ({ key: `operacion-${++sequence}` }));
  });

  it('descuenta stock y registra movimiento sin escribir una venta financiera duplicada', async () => {
    const repository = new InventoryV2Repository(dbMock as never, tenantPath);

    const operationId = await repository.registrarVentaMultiple({
      items: [
        {
          productoId: 'producto-1',
          nombre: 'Camarón',
          precio: 100,
          cantidad: 2,
          unidad: 'kg',
          subtotal: 200,
        },
      ],
      areaId: 'area-mostrador',
      total: 200,
      metodoPago: 'efectivo',
      usuario: 'admin-1',
    });

    expect(operationId).toBe('operacion-1');
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    const updates = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
    const paths = Object.keys(updates);
    expect(paths).toContain(`${tenantPath}/inventory_v2/areas/area-mostrador/stock/producto-1`);
    expect(paths.some((path) => path.includes('/ventas_v2/'))).toBe(false);

    const movementPath = paths.find((path) => path.includes('/inventory_v2/movements/'));
    expect(movementPath).toBeDefined();
    expect(updates[movementPath as string]).toMatchObject({
      tipo: 'salida',
      itemId: 'producto-1',
      cantidad: 2,
      razon: expect.stringContaining('Salida por venta de Mostrador'),
    });
  });
});
