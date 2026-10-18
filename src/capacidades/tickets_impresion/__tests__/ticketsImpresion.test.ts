import { ServicioTicketsImpresion, servicioTicketsImpresion, useTicketsImpresion } from '../index';
import { servicioFierros } from '../../../sistema/impresion/fierros/servicio/ServicioFierros';

jest.mock('../../../sistema/impresion/fierros/servicio/ServicioFierros', () => ({
  servicioFierros: {
    imprimirComanda: jest.fn(async () => ({ exito: true, metodo: 'hub' })),
    imprimirCuenta: jest.fn(async () => ({ exito: true, metodo: 'hub' })),
    imprimirTicketVenta: jest.fn(async () => ({ exito: true, metodo: 'hub' })),
    imprimirEtiquetaBascula: jest.fn(async () => ({ exito: true, metodo: 'hub' })),
    estaConectado: true,
  },
}));

describe('tickets_impresion — Capacidad Canónica de Impresión de Tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('delega imprimirComanda a servicioFierros', async () => {
    const servicio = new ServicioTicketsImpresion();
    const datos = { items: [{ nombre: 'Ceviche', cantidad: 1 }] } as any;
    const res = await servicio.imprimirComanda(datos);
    expect(res.exito).toBe(true);
    expect(servicioFierros.imprimirComanda).toHaveBeenCalledWith(datos, { rol: 'cocina' });
  });

  test('delega imprimirCuenta a servicioFierros', async () => {
    const servicio = new ServicioTicketsImpresion();
    const datos = { subtotal: 150, total: 150 } as any;
    const res = await servicio.imprimirCuenta(datos);
    expect(res.exito).toBe(true);
    expect(servicioFierros.imprimirCuenta).toHaveBeenCalledWith(datos, { rol: 'caja' });
  });

  test('delega imprimirVenta a servicioFierros con config por defecto', async () => {
    const datos = { folio: '1001', total: 200 } as any;
    const res = await servicioTicketsImpresion.imprimirVenta(datos);
    expect(res.exito).toBe(true);
    expect(servicioFierros.imprimirTicketVenta).toHaveBeenCalledWith(
      datos,
      expect.objectContaining({ nombreNegocio: 'Marisquería' })
    );
  });

  test('delega imprimirEtiquetaBascula a servicioFierros', async () => {
    const item = { pesoGramos: 500, productoId: 'camaron-1' } as any;
    const res = await servicioTicketsImpresion.imprimirEtiquetaBascula(item);
    expect(res.exito).toBe(true);
    expect(servicioFierros.imprimirEtiquetaBascula).toHaveBeenCalledWith(
      item,
      expect.objectContaining({ nombreNegocio: 'Marisquería' })
    );
  });

  test('estaListoParaImprimir refleja estado de conexión de servicioFierros', () => {
    expect(servicioTicketsImpresion.estaListoParaImprimir()).toBe(true);
  });

  test('useTicketsImpresion expone las funciones operativas', () => {
    const hook = useTicketsImpresion();
    expect(typeof hook.imprimirComanda).toBe('function');
    expect(typeof hook.imprimirCuenta).toBe('function');
    expect(typeof hook.imprimirVenta).toBe('function');
    expect(typeof hook.imprimirEtiquetaBascula).toBe('function');
    expect(hook.estaListo).toBe(true);
  });
});
