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
    const clon: unknown[] = [];

    for (const elemento of valor) {
      const elementoSeguro = clonarValorRemoto(elemento);
      if (elementoSeguro === OMITIR) {
        return OMITIR;
      }
      clon.push(elementoSeguro);
    }

    return clon;
  }

  if (!esObjetoPlano(valor)) {
    return OMITIR;
  }

  const clon: ObjetoPlano = {};

  for (const clave of Object.keys(valor)) {
    if (!esClaveSegura(clave)) {
      continue;
    }

    const valorSeguro = clonarValorRemoto(valor[clave]);
    if (valorSeguro === OMITIR) {
      return OMITIR;
    }
    clon[clave] = valorSeguro;
  }

  return clon;
}

function coincideContrato(valor: unknown, ejemplo: unknown): boolean {
  if (ejemplo === null) {
    return valor === null;
  }

  if (Array.isArray(ejemplo)) {
    if (!Array.isArray(valor) || ejemplo.length === 0) {
      return false;
    }

    const contrato = ejemplo[0];
    if (!ejemplo.every((elemento) => coincideContrato(elemento, contrato))) {
      return false;
    }

    return valor.every((elemento) => coincideContrato(elemento, contrato));
  }

  if (esObjetoPlano(ejemplo)) {
    if (!esObjetoPlano(valor)) {
      return false;
    }

    const clavesContrato = Object.keys(ejemplo).filter(esClaveSegura);
    const clavesValor = Object.keys(valor).filter(esClaveSegura);
    if (
      clavesValor.some((clave) => !tienePropiedad(ejemplo, clave)) ||
      clavesContrato.some((clave) => !tienePropiedad(valor, clave))
    ) {
      return false;
    }

    return clavesContrato.every((clave) => coincideContrato(valor[clave], ejemplo[clave]));
  }

  return valor !== null && typeof valor === typeof ejemplo;
}

function obtenerContratoArreglo(valorBase: unknown[]): unknown | typeof OMITIR {
  if (valorBase.length === 0) {
    return OMITIR;
  }

  const contrato = valorBase[0];
  return valorBase.every((elemento) => coincideContrato(elemento, contrato)) ? contrato : OMITIR;
}

function resolverValor(valorRemoto: unknown, valorBase: unknown, usarSchema: boolean): unknown {
  if (valorRemoto === undefined) {
    return clonarPredeterminado(valorBase);
  }

  if (valorBase === null) {
    if (!usarSchema) {
      return null;
    }

    const valorSeguro = clonarValorRemoto(valorRemoto);
    return valorSeguro === OMITIR ? null : valorSeguro;
  }

  if (Array.isArray(valorBase)) {
    if (!Array.isArray(valorRemoto)) {
      return clonarPredeterminado(valorBase);
    }

    if (!usarSchema) {
      const contrato = obtenerContratoArreglo(valorBase);
      if (
        contrato === OMITIR ||
        !valorRemoto.every((elemento) => coincideContrato(elemento, contrato))
      ) {
        return clonarPredeterminado(valorBase);
      }
    }

    const arregloSeguro = clonarValorRemoto(valorRemoto);
    return arregloSeguro === OMITIR ? clonarPredeterminado(valorBase) : arregloSeguro;
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

export function resolverConfiguracionTenant<T>(
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
