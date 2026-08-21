import type { Database } from 'firebase/database';
import { get, ref, runTransaction } from 'firebase/database';
import { RegistroVentasRepository } from '../registroVentas.repo';
import type { Pedido } from '../pedidos.repo';

jest.mock('firebase/database', () => ({
  get: jest.fn(),
  ref: jest.fn((db, path) => ({ db, path })),
  runTransaction: jest.fn(),
}));

type Snapshot = {
  exists: () => boolean;
  val: () => unknown;
};

function snapshot(value: unknown): Snapshot {
  return {
    exists: () => value !== null && value !== undefined,
    val: () => value,
  };
}

describe('RegistroVentasRepository', () => {
  const dbMock = {} as unknown as Database;
  const tenantPath = '2 alimentos_y_bebidas/marisquerias/puerto-libres';
  const timestamp = new Date(2026, 7, 21, 13, 35, 3).getTime();
  const fecha = new Date(timestamp);
  const anio = String(fecha.getFullYear());
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  const mockGet = get as jest.Mock;
  const mockRef = ref as jest.Mock;
  const mockRunTransaction = runTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(snapshot(null));
    mockRunTransaction.mockImplementation(async (_reference, updater) => {
      const next = updater(0);
      return { committed: true, snapshot: snapshot(next) };
    });
  });

  it('crea una venta de pedido con secuencia diaria y ruta aislada por tenant', async () => {
    const pedido: Pedido = {
      id: 'PED-20260821-001',
      tipo: 'mesa',
      mesaId: 'mesa-5',
      estatus: 'cerrado',
      cerrado: true,
      pagadoAt: timestamp,
      createdAt: timestamp - 60_000,
      items: {
        'IT-001': {
          id: 'IT-001',
          nombre: 'Aguachile',
          cantidad: 2,
          precio: 150,
          estado: 'entregado',
          productId: 'prod-aguachile',
        },
      },
    };

    const registro = await new RegistroVentasRepository(dbMock, tenantPath).registrarPedido(
      pedido,
      timestamp
    );

    expect(registro).toMatchObject({
      origen: 'pedido',
      origenId: pedido.id,
      pedidoId: pedido.id,
      canal: 'restaurante',
      mesaId: 'mesa-5',
      numero: 1,
      total: 300,
      estado: 'pagada',
      timestamp,
    });
    expect(mockRef).toHaveBeenCalledWith(
      dbMock,
      `${tenantPath}/secuencias/ventas/${anio}${mes}${dia}`
    );
    expect(mockRef).toHaveBeenCalledWith(
      dbMock,
      `${tenantPath}/registro/ventas/${anio}/${mes}/${dia}/${pedido.id}`
    );
  });

  it('no vuelve a reservar secuencia ni duplica un origen ya proyectado', async () => {
    const existente = {
      origen: 'mostrador',
      origenId: 'vc-device-1',
      numero: 7,
      canal: 'mostrador',
      total: 250,
      estado: 'pagada',
      timestamp,
    };
    mockGet.mockResolvedValue(snapshot(existente));

    const registro = await new RegistroVentasRepository(dbMock, tenantPath).registrar({
      origen: 'mostrador',
      origenId: 'vc-device-1',
      canal: 'mostrador',
      total: 250,
      estado: 'pagada',
      timestamp,
    });

    expect(registro).toEqual(existente);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('proyecta mostrador sin duplicar la venta legacy', async () => {
    const registro = await new RegistroVentasRepository(dbMock, tenantPath).registrarMostrador({
      id: 'vc-device-2',
      total: 580,
      metodoPago: 'efectivo',
      items: [{ nombre: 'Coctel', cantidad: 2, precio: 290, subtotal: 580 }],
      timestamp,
      usuario: 'mesero-1',
    });

    expect(registro).toMatchObject({
      origen: 'mostrador',
      origenId: 'vc-device-2',
      ventaId: 'vc-device-2',
      metodoPago: 'efectivo',
      usuario: 'mesero-1',
      total: 580,
      numero: 1,
    });
  });
});
