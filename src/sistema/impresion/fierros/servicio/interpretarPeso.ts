import type { ResultadoPeso } from '../contratos/tipos';

const PESO_REGEX = /[-+]?\d+(?:[.,]\d+)?/;

/**
 * Interpreta una respuesta textual de báscula sin depender del transporte Bluetooth.
 *
 * La estabilidad solo se afirma cuando el protocolo la informa explícitamente:
 * `ST` significa estable y `US` significa inestable. En cualquier otro caso queda
 * como `undefined` para no convertir una ausencia de señal en una afirmación.
 */
export function interpretarRespuestaPeso(respuesta: string): ResultadoPeso {
  const texto = respuesta.trim();
  const numero = texto.match(PESO_REGEX);

  if (!numero) {
    return {
      exito: false,
      unidad: detectarUnidad(texto),
      estable: undefined,
      cancelado: false,
      codigoError: 'FORMATO_INVALIDO',
      mensaje: 'Formato de peso inválido',
    };
  }

  const peso = Number(numero[0].replace(',', '.'));
  if (!Number.isFinite(peso)) {
    return {
      exito: false,
      unidad: detectarUnidad(texto),
      estable: undefined,
      cancelado: false,
      codigoError: 'LECTURA_INVALIDA',
      mensaje: 'La lectura de peso no es válida',
    };
  }

  return {
    exito: true,
    peso,
    unidad: detectarUnidad(texto),
    estable: detectarEstabilidad(texto),
    cancelado: false,
  };
}

function detectarUnidad(texto: string): 'kg' | 'lb' {
  return /(?:lb|lbs|pound)/i.test(texto) ? 'lb' : 'kg';
}

function detectarEstabilidad(texto: string): boolean | undefined {
  if (/\bST\b/i.test(texto)) return true;
  if (/\bUS\b/i.test(texto)) return false;
  return undefined;
}

export function resultadoPesoError(
  mensaje: string,
  codigoError: 'BASCULA_NO_CONECTADA' | 'TIMEOUT' | 'ERROR_COMUNICACION',
  opciones?: { cancelado?: boolean }
): ResultadoPeso {
  return {
    exito: false,
    unidad: 'kg',
    estable: undefined,
    cancelado: opciones?.cancelado ?? false,
    codigoError,
    timeout: codigoError === 'TIMEOUT',
    mensaje,
  };
}
