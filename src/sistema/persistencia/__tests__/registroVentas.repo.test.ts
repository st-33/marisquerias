import type { Database } from 'firebase/database';
import { RegistroVentasRepository, type RegistroVenta } from '../registroVentas.repo';
import type { Pedido } from '../pedidos.repo';
import { SQLiteStorageAdapter } from '../../offline';

describe('RegistroVentasRepository — Persistencia en SQLite', () => {
  const dbMock = {} as unknown as Database;
  const rutaNegocio = '2 alimentos_y_bebidas/marisquerias/puerto-libres';
  const timestamp = new Date(2026, 7, 21, 13, 35, 3).getTime();

  beforeEach(async () => {
    await SQLiteStorageAdapter.clearAll();
  });

  it('crea una venta de pedido con secuencia diaria y almacenamiento en SQLite', async () => {
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

    const registro = await new RegistroVentasRepository(dbMock, rutaNegocio).registrarPedido(
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

    const guardados = await SQLiteStorageAdapter.obtenerHistorialVentas('puerto-libres');
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({
      id: pedido.id,
      negocio_id: 'puerto-libres',
      tipo: 'pedido_cerrado',
      total: 300,
    });
  });

  it('no vuelve a reservar secuencia ni duplica un origen ya proyectado (idempotencia)', async () => {
    const entrada = {
      origen: 'mostrador' as const,
      origenId: 'vc-device-1',
      canal: 'mostrador' as const,
      total: 250,
      estado: 'pagada' as const,
      timestamp,
    };

    const repo = new RegistroVentasRepository(dbMock, rutaNegocio);
    const registro1 = await repo.registrar(entrada);
    const registro2 = await repo.registrar(entrada);

    expect(registro1).toEqual(registro2);

    const guardados = await SQLiteStorageAdapter.obtenerHistorialVentas('puerto-libres');
    expect(guardados).toHaveLength(1);
  });

  it('proyecta mostrador a SQLite correctamente', async () => {
    const registro = await new RegistroVentasRepository(dbMock, rutaNegocio).registrarMostrador({
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

    const guardados = await SQLiteStorageAdapter.obtenerHistorialVentas('puerto-libres');
    expect(guardados).toHaveLength(1);
    expect(guardados[0].total).toBe(580);
    expect(guardados[0].tipo).toBe('registro_ventas');
  });

  it('obtiene las ventas del día desde SQLite', async () => {
    const repo = new RegistroVentasRepository(dbMock, rutaNegocio);
    await repo.registrarMostrador({
      id: 'venta_1',
      total: 350,
      metodoPago: 'tarjeta',
      items: [{ nombre: 'Ceviche', cantidad: 1, precio: 350, subtotal: 350 }],
      timestamp,
    });

    const ventasDelDia = await repo.obtenerDia(timestamp);
    expect(ventasDelDia.venta_1).toBeDefined();
    expect(ventasDelDia.venta_1).toMatchObject({
      origen: 'mostrador',
      total: 350,
      metodoPago: 'tarjeta',
    });
  });
});
