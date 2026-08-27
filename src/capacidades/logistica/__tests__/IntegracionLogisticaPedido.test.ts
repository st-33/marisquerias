import type { Pedido } from '../../../sistema/persistencia/pedidos.repo';
import { IntegracionLogisticaPedido, type MotorLogistico } from '../IntegracionLogisticaPedido';

function pedidoBase(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: 'PED-20260827-001',
    tipo: 'delivery',
    modalidad: 'domicilio',
    origen: 'negocio',
    estatus: 'listo',
    createdAt: 1_756_850_000_000,
    items: {
      'IT-001': {
        id: 'IT-001',
        nombre: 'Aguachile',
        cantidad: 2,
        precio: 150,
        estado: 'listo',
        productId: 'prod-aguachile',
      },
    },
    cliente: { nombre: 'Cliente de prueba', telefono: '2220000000' },
    destino: {
      direccion: 'Calle de prueba 10, Libres, Puebla',
      referencia: 'Portón azul',
      lat: 19.465,
      lng: -97.313,
    },
    totales: { subtotal: 300, total: 300 },
    ...overrides,
  };
}

describe('IntegracionLogisticaPedido', () => {
  it('crea una misión mínima y enlaza su referencia al pedido original', async () => {
    const updates: { pedidoId: string; datos: Partial<Pedido> }[] = [];
    const missionRequests: any[] = [];
    const motor: MotorLogistico = {
      crearMisionDelivery: async (request) => {
        missionRequests.push(request);
        return 'MIS-20260827-001';
      },
    };
    const adapter = new IntegracionLogisticaPedido(
      {
        actualizar: async (pedidoId, datos) => {
          updates.push({ pedidoId, datos });
        },
      },
      motor
    );

    const result = await adapter.solicitarEntrega(pedidoBase(), {
      tenantId: 'marisqueria-puerto-libres',
      tenantPath: '2 alimentos_y_bebidas/marisquerias/puerto-libres',
    });

    expect(result).toEqual({
      success: true,
      referenciaMision: 'MIS-20260827-001',
      estado: 'solicitada',
    });
    expect(missionRequests).toHaveLength(1);
    expect(missionRequests[0]).toMatchObject({
      tipo: 'delivery',
      pedidoId: 'PED-20260827-001',
      tenantId: 'marisqueria-puerto-libres',
      cliente: {
        nombre: 'Cliente de prueba',
        ubicacion: { direccion: 'Calle de prueba 10, Libres, Puebla', lat: 19.465, lng: -97.313 },
      },
      items: {
        'IT-001': { id: 'IT-001', nombre: 'Aguachile', cantidad: 2, precio: 150, unidad: 'pza' },
      },
    });
    expect(missionRequests[0]).not.toHaveProperty('inventario');
    expect(updates).toEqual([
      {
        pedidoId: 'PED-20260827-001',
        datos: {
          logistica: expect.objectContaining({
            requiereEntrega: true,
            modalidad: 'domicilio',
            estado: 'solicitada',
            referenciaMision: 'MIS-20260827-001',
          }),
        },
      },
    ]);
  });

  it('reporta la incompatibilidad de coordenadas sin fabricar ubicación', async () => {
    const actualizar = jest
      .fn<Promise<void>, [string, Partial<Pedido>]>()
      .mockResolvedValue(undefined);
    const motor: MotorLogistico = { crearMisionDelivery: jest.fn() };
    const adapter = new IntegracionLogisticaPedido({ actualizar }, motor);

    const result = await adapter.solicitarEntrega(
      pedidoBase({ destino: { direccion: 'Solo dirección' } }),
      { tenantId: 'tenant-1', tenantPath: 'marisquerias/tenant-1' }
    );

    expect(result.success).toBe(false);
    expect(result.estado).toBe('fallida');
    expect(result.error).toContain('coordenadas lat/lng');
    expect(motor.crearMisionDelivery).not.toHaveBeenCalled();
    expect(actualizar).toHaveBeenCalledWith(
      'PED-20260827-001',
      expect.objectContaining({
        logistica: expect.objectContaining({ estado: 'fallida' }),
      })
    );
  });

  it('no crea misión para un pedido presencial', async () => {
    const actualizar = jest
      .fn<Promise<void>, [string, Partial<Pedido>]>()
      .mockResolvedValue(undefined);
    const motor: MotorLogistico = { crearMisionDelivery: jest.fn() };
    const adapter = new IntegracionLogisticaPedido({ actualizar }, motor);

    const result = await adapter.solicitarEntrega(
      pedidoBase({ tipo: 'mesa', modalidad: 'presencial', logistica: null }),
      { tenantId: 'tenant-1', tenantPath: 'marisquerias/tenant-1' }
    );

    expect(result).toEqual({
      success: false,
      estado: 'no_requerida',
      error: 'El pedido no requiere una operación logística.',
    });
    expect(motor.crearMisionDelivery).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();
  });

  it('proyecta el estado de la misión solo sobre el pedido referenciado', async () => {
    let listener: ((misiones: Record<string, any>) => void) | undefined;
    const updates: { pedidoId: string; estado: string; referenciaMision: string }[] = [];
    const unsubscribe = jest.fn();
    const motor: MotorLogistico = {
      crearMisionDelivery: jest.fn(),
      suscribirPorTenant: (_tenantId, callback) => {
        listener = callback;
        return unsubscribe;
      },
    };
    const adapter = new IntegracionLogisticaPedido(
      { actualizar: jest.fn<Promise<void>, [string, Partial<Pedido>]>() },
      motor
    );

    const stop = adapter.suscribirActualizaciones('tenant-1', ['PED-1'], (update) => {
      updates.push(update);
    });
    listener?.({
      misionA: { id: 'MIS-1', tipo: 'delivery', pedidoId: 'PED-1', estado: 'en_camino' },
      misionB: { id: 'MIS-2', tipo: 'delivery', pedidoId: 'PED-2', estado: 'completada' },
      reabastecimiento: {
        id: 'MIS-3',
        tipo: 'reabastecimiento',
        pedidoId: 'PED-1',
        estado: 'pendiente',
      },
    });
    stop();

    expect(updates).toEqual([
      { pedidoId: 'PED-1', estado: 'en_camino', referenciaMision: 'MIS-1' },
    ]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('es idempotente cuando el pedido ya tiene referencia de misión', async () => {
    const motor: MotorLogistico = { crearMisionDelivery: jest.fn() };
    const adapter = new IntegracionLogisticaPedido(
      { actualizar: jest.fn<Promise<void>, [string, Partial<Pedido>]>() },
      motor
    );

    const result = await adapter.solicitarEntrega(
      pedidoBase({
        logistica: {
          requiereEntrega: true,
          modalidad: 'domicilio',
          estado: 'asignada',
          referenciaMision: 'MIS-EXISTENTE',
        },
      }),
      { tenantId: 'tenant-1', tenantPath: 'marisquerias/tenant-1' }
    );

    expect(result).toEqual({
      success: true,
      referenciaMision: 'MIS-EXISTENTE',
      estado: 'asignada',
    });
    expect(motor.crearMisionDelivery).not.toHaveBeenCalled();
  });
});
