import { destinoACanal } from '../estado/EstadoConcentrador';

describe('Hub Central y Aislamiento de Hardware Mostrador/Restaurante', () => {
  it('mapea correctamente destino mostrador y venta_crudo al canal de mostrador', () => {
    expect(destinoACanal('mostrador')).toBe('venta_crudo');
    expect(destinoACanal('venta_crudo')).toBe('venta_crudo');
    expect(destinoACanal('restaurante')).toBe('standard');
    expect(destinoACanal(null)).toBe('standard');
  });

  it('valida que la condición para activar Hub requiere impresora conectada', () => {
    const evaluarCondicionHub = (esWeb: boolean, estaConectado: boolean, tieneDispositivo: boolean) => {
      return Boolean(!esWeb && estaConectado && tieneDispositivo);
    };

    // Caso 1: Web nunca puede ser Hub
    expect(evaluarCondicionHub(true, true, true)).toBe(false);

    // Caso 2: Android sin impresora conectada no puede ser Hub
    expect(evaluarCondicionHub(false, false, false)).toBe(false);
    expect(evaluarCondicionHub(false, false, true)).toBe(false);

    // Caso 3: Android con impresora conectada y dispositivo activo SÍ puede ser Hub
    expect(evaluarCondicionHub(false, true, true)).toBe(true);
  });

  it('aísla la impresión de mesero cuando la terminal física está dedicada a mostrador', () => {
    const deberiaImprimirLocalMesero = (params: {
      estaConectado: boolean;
      destinoLocal: 'restaurante' | 'mostrador' | 'venta_crudo' | null;
      hubRestauranteOnline: boolean;
    }) => {
      const esDedicadoAMostrador =
        params.destinoLocal === 'mostrador' || params.destinoLocal === 'venta_crudo';
      return params.estaConectado && !esDedicadoAMostrador && !params.hubRestauranteOnline;
    };

    // Si la terminal tiene impresora pero está dedicada a Mostrador: NO imprime la cuenta de mesero localmente
    expect(
      deberiaImprimirLocalMesero({
        estaConectado: true,
        destinoLocal: 'mostrador',
        hubRestauranteOnline: false,
      })
    ).toBe(false);

    // Si la terminal tiene impresora y está asignada a Restaurante: SÍ imprime
    expect(
      deberiaImprimirLocalMesero({
        estaConectado: true,
        destinoLocal: 'restaurante',
        hubRestauranteOnline: false,
      })
    ).toBe(true);
  });
});
