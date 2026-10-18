import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useCajaCobro } from '../useCajaCobro';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../../sistema/firebase', () => ({
  getRtdb: jest.fn(() => ({})),
}));

jest.mock('../../../../sistema/sin_conexion/almacenamiento/AdaptadorAlmacenamientoSQLite', () => ({
  SQLiteStorageAdapter: {
    getProductos: jest.fn().mockResolvedValue({}),
    getCategorias: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../../sistema/instalacion/vinculacion/generar-device-id-adi', () => ({
  resolverDeviceIdADI: jest.fn().mockResolvedValue('test-device-pos-01'),
}));

const mockImprimirTicketVenta = jest.fn();
jest.mock('../../../../sistema/impresion/fierros', () => ({
  servicioFierros: {
    imprimirTicketVenta: (...args: any[]) => mockImprimirTicketVenta(...args),
  },
}));

const mockRegistrarMostrador = jest.fn();
jest.mock('../../../../sistema/persistencia/registroVentas.repositorio', () => ({
  RegistroVentasRepository: jest.fn().mockImplementation(() => ({
    registrarMostrador: mockRegistrarMostrador,
  })),
}));

jest.mock('../../../../sistema/persistencia', () => ({
  MenuRepository: jest.fn().mockImplementation(() => ({
    suscribirProductos: jest.fn(() => () => {}),
    suscribirCategorias: jest.fn(() => () => {}),
  })),
}));

let mockStoreState: any = {
  sesion: {
    rutaNegocio: 'negocios/marisqueria-01',
    usuario: { nombre: 'Cajero Pepe' },
  },
  dataSources: {},
  estadoEncendido: {
    capacidades_activas: ['menu', 'mostrador_y_pos', 'tickets_impresion'],
    roles_activos: ['cajero'],
  },
  negocio: { features: {} },
};

jest.mock('../../../../sistema/store', () => ({
  useStore: Object.assign(
    jest.fn((selector: any) =>
      typeof selector === 'function' ? selector(mockStoreState) : mockStoreState
    ),
    {
      getState: () => mockStoreState,
    }
  ),
}));

function renderCustomHook<T>(hook: () => T) {
  const result = { current: null as unknown as T };
  function TestComponent() {
    result.current = hook();
    return null;
  }
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(React.createElement(TestComponent));
  });
  return { result, renderer };
}

describe('useCajaCobro — Lógica de Terminal de Cobro', () => {
  const productoMock = {
    id: 'prod-camaron',
    nombre: 'Camarones al Mojo',
    precio: 150,
    categoriaId: 'cat-mariscos',
    activo: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockImprimirTicketVenta.mockResolvedValue({ exito: true });
    mockRegistrarMostrador.mockResolvedValue({ id: 'mock-venta-id' });
    mockStoreState = {
      sesion: {
        rutaNegocio: 'negocios/marisqueria-01',
        usuario: { nombre: 'Cajero Pepe' },
      },
      dataSources: {},
      estadoEncendido: {
        capacidades_activas: ['menu', 'mostrador_y_pos', 'tickets_impresion'],
        roles_activos: ['cajero'],
      },
      negocio: { features: {} },
    };
  });

  test('1. Carrito se vacía al cobrar exitosamente', async () => {
    const { result } = renderCustomHook(() => useCajaCobro());

    // Agregar producto
    act(() => {
      result.current.agregarProducto(productoMock as any, 2);
    });

    expect(result.current.carrito.length).toBe(1);
    expect(result.current.total).toBe(300);

    // Cobrar
    let res: any;
    await act(async () => {
      res = await result.current.cobrar({ metodoPago: 'efectivo' });
    });

    expect(res.exito).toBe(true);
    expect(mockRegistrarMostrador).toHaveBeenCalledTimes(1);
    expect(result.current.carrito.length).toBe(0);
    expect(result.current.total).toBe(0);
  });

  test('2. Método de pago se registra contablemente y en la transacción', async () => {
    const { result } = renderCustomHook(() => useCajaCobro());

    act(() => {
      result.current.agregarProducto(productoMock as any, 1);
      result.current.setMetodoPago('tarjeta');
    });

    await act(async () => {
      await result.current.cobrar();
    });

    expect(mockRegistrarMostrador).toHaveBeenCalledWith(
      expect.objectContaining({
        metodoPago: 'tarjeta',
        total: 150,
        usuario: 'Cajero Pepe',
      })
    );
  });

  test('3. Sin tickets_impresion activa → cobra pero no emite ticket', async () => {
    // Configurar estadoEncendido sin tickets_impresion
    mockStoreState.estadoEncendido = {
      capacidades_activas: ['menu', 'mostrador_y_pos'], // tickets_impresion dormida
      roles_activos: ['cajero'],
    };

    const { result } = renderCustomHook(() => useCajaCobro());

    expect(result.current.ticketsImpresionActivo).toBe(false);

    act(() => {
      result.current.agregarProducto(productoMock as any, 1);
    });

    let res: any;
    await act(async () => {
      res = await result.current.cobrar({ metodoPago: 'transferencia' });
    });

    expect(res.exito).toBe(true);
    expect(res.ticketEmitido).toBe(false);
    expect(mockRegistrarMostrador).toHaveBeenCalledTimes(1);
    expect(mockImprimirTicketVenta).not.toHaveBeenCalled();
    expect(result.current.carrito.length).toBe(0);
  });

  test('4. Modificar cantidad y eliminar producto del carrito', () => {
    const { result } = renderCustomHook(() => useCajaCobro());

    act(() => {
      result.current.agregarProducto(productoMock as any, 1);
    });

    const itemId = result.current.carrito[0].id;

    // Actualizar cantidad a 3
    act(() => {
      result.current.actualizarCantidad(itemId, 3);
    });
    expect(result.current.carrito[0].cantidad).toBe(3);
    expect(result.current.total).toBe(450);

    // Actualizar cantidad a 0 lo elimina del carrito
    act(() => {
      result.current.actualizarCantidad(itemId, 0);
    });
    expect(result.current.carrito.length).toBe(0);
    expect(result.current.total).toBe(0);

    // Agregar de nuevo y eliminar con eliminarItem
    act(() => {
      result.current.agregarProducto(productoMock as any, 2);
    });
    expect(result.current.carrito.length).toBe(1);
    const nuevoItemId = result.current.carrito[0].id;

    act(() => {
      result.current.eliminarItem(nuevoItemId);
    });
    expect(result.current.carrito.length).toBe(0);
  });

  test('5. Aplicación de descuento reduce total contable correctamente', async () => {
    const { result } = renderCustomHook(() => useCajaCobro());

    act(() => {
      result.current.agregarProducto(productoMock as any, 2); // 300
      result.current.aplicarDescuento(50);
    });

    expect(result.current.subtotal).toBe(300);
    expect(result.current.descuento).toBe(50);
    expect(result.current.total).toBe(250);

    await act(async () => {
      await result.current.cobrar();
    });

    expect(mockRegistrarMostrador).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 250,
      })
    );
  });

  test('6. Búsqueda y filtrado de productos en catálogo', () => {
    const { result } = renderCustomHook(() => useCajaCobro());

    act(() => {
      result.current.setBusqueda('camaron');
    });
    expect(result.current.busqueda).toBe('camaron');

    act(() => {
      result.current.setCategoriaSeleccionada('cat-mariscos');
    });
    expect(result.current.categoriaSeleccionada).toBe('cat-mariscos');
  });

  test('7. Cobrar con carrito vacío devuelve error y no llama al repositorio', async () => {
    const { result } = renderCustomHook(() => useCajaCobro());

    let res: any;
    await act(async () => {
      res = await result.current.cobrar();
    });

    expect(res.exito).toBe(false);
    expect(res.error).toBeDefined();
    expect(result.current.errorCobro).toContain('carrito está vacío');
    expect(mockRegistrarMostrador).not.toHaveBeenCalled();
    expect(mockImprimirTicketVenta).not.toHaveBeenCalled();
  });
});
