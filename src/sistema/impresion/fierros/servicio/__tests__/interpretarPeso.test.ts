import { interpretarRespuestaPeso, resultadoPesoError } from '../interpretarPeso';

describe('interpretarRespuestaPeso', () => {
  it('interpreta una lectura estable en kilogramos', () => {
    expect(interpretarRespuestaPeso('ST,GS,+  1.234kg')).toEqual({
      exito: true,
      peso: 1.234,
      unidad: 'kg',
      estable: true,
      cancelado: false,
    });
  });

  it('interpreta una lectura inestable sin ocultar la señal', () => {
    expect(interpretarRespuestaPeso('US,GS,+ 0,500 kg')).toEqual({
      exito: true,
      peso: 0.5,
      unidad: 'kg',
      estable: false,
      cancelado: false,
    });
  });

  it('no afirma estabilidad cuando el protocolo no la publica', () => {
    expect(interpretarRespuestaPeso('1.25 lb')).toMatchObject({
      exito: true,
      peso: 1.25,
      unidad: 'lb',
      cancelado: false,
    });
    expect(interpretarRespuestaPeso('1.25 lb').estable).toBeUndefined();
  });

  it('clasifica respuestas sin número como formato inválido', () => {
    expect(interpretarRespuestaPeso('ERR')).toEqual({
      exito: false,
      unidad: 'kg',
      estable: undefined,
      cancelado: false,
      codigoError: 'FORMATO_INVALIDO',
      mensaje: 'Formato de peso inválido',
    });
  });
});

describe('resultadoPesoError', () => {
  it('marca timeout y conserva un código estable', () => {
    expect(resultadoPesoError('Tiempo agotado', 'TIMEOUT')).toEqual({
      exito: false,
      unidad: 'kg',
      estable: undefined,
      cancelado: false,
      codigoError: 'TIMEOUT',
      timeout: true,
      mensaje: 'Tiempo agotado',
    });
  });

  it('permite expresar cancelación sin fingir una lectura', () => {
    expect(
      resultadoPesoError('Lectura cancelada', 'ERROR_COMUNICACION', {
        cancelado: true,
      })
    ).toMatchObject({
      exito: false,
      cancelado: true,
      codigoError: 'ERROR_COMUNICACION',
    });
  });
});
