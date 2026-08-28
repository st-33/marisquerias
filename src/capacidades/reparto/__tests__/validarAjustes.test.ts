import {
  ErrorValidacionAjustesReparto,
  validarCostosReparto,
  validarHorariosReparto,
  validarUmbralesReparto,
} from '../validarAjustes';

describe('validarUmbralesReparto', () => {
  it('conserva un parche válido', () => {
    expect(
      validarUmbralesReparto({
        stockBajo: 5,
        maxPedidosActivos: 10,
        tiempoMaxEntregaMin: 45,
      })
    ).toEqual({ stockBajo: 5, maxPedidosActivos: 10, tiempoMaxEntregaMin: 45 });
  });

  it.each([
    ['valor negativo', { stockBajo: -1 }, 'valor_negativo'],
    ['valor fraccionario', { maxPedidosActivos: 2.5 }, 'valor_no_entero'],
    ['valor no finito', { tiempoMaxEntregaMin: Number.NaN }, 'valor_invalido'],
  ])('rechaza %s', (_caso, parche, codigo) => {
    expect(() => validarUmbralesReparto(parche)).toThrow(ErrorValidacionAjustesReparto);
    try {
      validarUmbralesReparto(parche);
    } catch (error) {
      expect(error).toMatchObject({ codigo });
    }
  });
});

describe('validarCostosReparto', () => {
  it('permite importes decimales no negativos', () => {
    expect(validarCostosReparto({ base: 20.5, porKm: 5.25, minimo: 20 })).toEqual({
      base: 20.5,
      porKm: 5.25,
      minimo: 20,
    });
  });

  it('rechaza importes negativos', () => {
    expect(() => validarCostosReparto({ base: -0.01 })).toThrow('base no puede ser menor que 0');
  });
});

describe('validarHorariosReparto', () => {
  it('acepta ventanas con formato y orden válidos', () => {
    expect(
      validarHorariosReparto({
        habilitado: true,
        ventanas: [{ inicio: '09:00', fin: '18:00' }],
      })
    ).toEqual({ habilitado: true, ventanas: [{ inicio: '09:00', fin: '18:00' }] });
  });

  it('rechaza horas inválidas y ventanas invertidas', () => {
    expect(() => validarHorariosReparto({ ventanas: [{ inicio: '9:00', fin: '18:00' }] })).toThrow(
      'formato HH:MM'
    );
    expect(() => validarHorariosReparto({ ventanas: [{ inicio: '18:00', fin: '09:00' }] })).toThrow(
      'inicio de una ventana'
    );
  });
});
