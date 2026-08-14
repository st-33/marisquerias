import { acumularVendedorSeguro, type ResumenVendedor } from '../metricasVendedores';

describe('acumularVendedorSeguro', () => {
  test.each(['__proto__', 'prototype', 'constructor'])(
    'rechaza el vendedor venenoso %s sin contaminar Object.prototype',
    (nombre) => {
      const vendedores = new Map<string, ResumenVendedor>();

      acumularVendedorSeguro(vendedores, nombre, 100);

      expect(vendedores.size).toBe(0);
      expect(Object.prototype).not.toHaveProperty('monto');
      expect(Object.prototype).not.toHaveProperty('subpedidos');
    }
  );

  test('acumula vendedores legítimos sin perder sus totales', () => {
    const vendedores = new Map<string, ResumenVendedor>();

    acumularVendedorSeguro(vendedores, 'María', 20);
    acumularVendedorSeguro(vendedores, 'María', 30);

    expect(vendedores.get('María')).toEqual({
      nombre: 'María',
      monto: 50,
      subpedidos: 2,
    });
  });
});
