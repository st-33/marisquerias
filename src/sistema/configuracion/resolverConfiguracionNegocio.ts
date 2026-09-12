import type { ZodType } from 'zod';

type ObjetoPlano = Record<string, unknown>;

const CLAVES_BLOQUEADAS = new Set(['__proto__', 'prototype', 'constructor']);
const OMITIR = Symbol('omitir-config-insegura');

function esClaveSegura(clave: string): boolean {
  return !CLAVES_BLOQUEADAS.has(clave);
}

function esObjetoPlano(valor: unknown): valor is ObjetoPlano {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) {
    return false;
  }

  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

function tienePropiedad(objeto: ObjetoPlano, clave: string): boolean {
  return Object.prototype.hasOwnProperty.call(objeto, clave);
}

function clonarPredeterminado<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.map((elemento) => clonarPredeterminado(elemento)) as T;
  }

  if (esObjetoPlano(valor)) {
    const clon: ObjetoPlano = {};

    for (const clave of Object.keys(valor)) {
      if (esClaveSegura(clave)) {
        clon[clave] = clonarPredeterminado(valor[clave]);
      }
    }

    return clon as T;
  }

  if (valor instanceof Date) {
    return new Date(valor.getTime()) as T;
  }

  return valor;
}

function clonarValorRemoto(valor: unknown): unknown | typeof OMITIR {
  if (valor === undefined) {
    return OMITIR;
  }

  if (
    valor === null ||
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  ) {
    return valor;
  }

  if (Array.isArray(valor)) {
    const arregloClonado: unknown[] = [];

    for (const elemento of valor) {
      const elementoClonado = clonarValorRemoto(elemento);

      if (elementoClonado !== OMITIR) {
        arregloClonado.push(elementoClonado);
      }
    }

    return arregloClonado;
  }

  if (esObjetoPlano(valor)) {
    const clon: ObjetoPlano = {};

    for (const clave of Object.keys(valor)) {
      if (!esClaveSegura(clave)) {
        continue;
      }

      const valorClonado = clonarValorRemoto(valor[clave]);

      if (valorClonado !== OMITIR) {
        clon[clave] = valorClonado;
      }
    }

    return clon;
  }

  return OMITIR;
}

function tieneContratoHomogeneo(arreglo: unknown[]): boolean {
  if (arreglo.length === 0) {
    return false;
  }

  const primerTipo = typeof arreglo[0];

  if (primerTipo === 'undefined' || primerTipo === 'function' || primerTipo === 'symbol') {
    return false;
  }

  for (const elemento of arreglo) {
    if (elemento === null || typeof elemento !== primerTipo || Array.isArray(elemento)) {
      return false;
    }
  }

  return true;
}

function elementosCompatibles(remoto: unknown[], base: unknown[]): boolean {
  if (base.length === 0) {
    return false;
  }

  const tipoEsperado = typeof base[0];

  return remoto.every((elemento) => elemento !== null && typeof elemento === tipoEsperado);
}

function resolverArreglo(
  valorRemoto: unknown,
  valorBase: unknown[],
  usarSchema: boolean
): unknown[] {
  if (!Array.isArray(valorRemoto)) {
    return clonarPredeterminado(valorBase);
  }

  const arregloClonado = clonarValorRemoto(valorRemoto);

  if (!Array.isArray(arregloClonado)) {
    return clonarPredeterminado(valorBase);
  }

  if (usarSchema) {
    return arregloClonado;
  }

  if (!tieneContratoHomogeneo(valorBase) || !elementosCompatibles(arregloClonado, valorBase)) {
    return clonarPredeterminado(valorBase);
  }

  return arregloClonado;
}

function resolverValor(valorRemoto: unknown, valorBase: unknown, usarSchema: boolean): unknown {
  if (valorRemoto === undefined) {
    return clonarPredeterminado(valorBase);
  }

  if (Array.isArray(valorBase)) {
    return resolverArreglo(valorRemoto, valorBase, usarSchema);
  }

  if (valorBase === null) {
    if (usarSchema) {
      const valorClonado = clonarValorRemoto(valorRemoto);
      return valorClonado === OMITIR ? null : valorClonado;
    }

    return clonarPredeterminado(valorBase);
  }

  if (esObjetoPlano(valorBase)) {
    if (!esObjetoPlano(valorRemoto)) {
      return clonarPredeterminado(valorBase);
    }

    return resolverObjeto(valorRemoto, valorBase, usarSchema);
  }

  if (valorRemoto === null || typeof valorRemoto !== typeof valorBase) {
    return clonarPredeterminado(valorBase);
  }

  return valorRemoto;
}

function resolverObjeto(
  valorRemoto: ObjetoPlano,
  valorBase: ObjetoPlano,
  usarSchema: boolean
): ObjetoPlano {
  const resultado: ObjetoPlano = {};

  for (const clave of Object.keys(valorBase)) {
    if (!esClaveSegura(clave)) {
      continue;
    }

    resultado[clave] = resolverValor(
      tienePropiedad(valorRemoto, clave) ? valorRemoto[clave] : undefined,
      valorBase[clave],
      usarSchema
    );
  }

  return resultado;
}

export function resolverConfiguracionNegocio<T>(
  rawConfig: unknown,
  defaultConfig: T,
  schema?: ZodType<T>
): T {
  const configuracionPredeterminada = (): T => clonarPredeterminado(defaultConfig);

  if (!esObjetoPlano(defaultConfig) || !esObjetoPlano(rawConfig)) {
    return configuracionPredeterminada();
  }

  const configuracionResuelta = resolverObjeto(rawConfig, defaultConfig, schema !== undefined) as T;

  if (!schema) {
    return configuracionResuelta;
  }

  try {
    const validacion = schema.safeParse(configuracionResuelta);
    return validacion.success
      ? clonarPredeterminado(validacion.data)
      : configuracionPredeterminada();
  } catch {
    return configuracionPredeterminada();
  }
}
