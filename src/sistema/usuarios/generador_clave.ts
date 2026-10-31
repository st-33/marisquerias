/**
 * 🔑 RESOLVEDOR DE CLAVE NOMINAL PARA USUARIOS
 *
 * Reglas de negocio:
 * 1. La clave nominal se deriva del nombre completo.
 * 2. Primer intento: Primer nombre (capitalizado).
 * 3. Si el primer nombre ya está en uso: Segundo nombre (capitalizado).
 * 4. Si ambos nombres ya están en uso (o no hay segundo nombre):
 *    Se detecta conflicto EXPLÍCITO sin añadir sufijos silenciosos ni números aleatorios.
 * 5. La comparación es insensible a mayúsculas, minúsculas y espacios.
 */

import type { ClaveNominalResultado, UsuarioNegocio } from './tipos';

function capitalizarPalabra(palabra: string): string {
  if (!palabra) return '';
  const limpia = palabra.trim();
  return limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase();
}

function normalizarParaComparacion(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remover tildes para comparación estricta sin ambigüedad
}

export function resolverClaveNominal(
  nombreCompleto: string,
  usuariosExistentes: UsuarioNegocio[] | Record<string, UsuarioNegocio> | null | undefined
): ClaveNominalResultado {
  const nombreLimpio = (nombreCompleto || '').trim();
  const palabras = nombreLimpio.split(/\s+/).filter(Boolean);

  if (palabras.length === 0) {
    return {
      clave: '',
      tieneConflicto: true,
      primerNombreCandidato: '',
      segundoNombreCandidato: null,
      error: 'El nombre completo es requerido para resolver la clave nominal.',
    };
  }

  const primerNombre = capitalizarPalabra(palabras[0]);
  const segundoNombre = palabras.length > 1 ? capitalizarPalabra(palabras[1]) : null;

  // Extraer claves existentes normalizadas
  const clavesEnUso = new Set<string>();
  if (usuariosExistentes) {
    const lista = Array.isArray(usuariosExistentes)
      ? usuariosExistentes
      : Object.values(usuariosExistentes);

    for (const u of lista) {
      if (u && typeof u.clave === 'string' && u.clave.trim()) {
        clavesEnUso.add(normalizarParaComparacion(u.clave));
      }
    }
  }

  const normPrimer = normalizarParaComparacion(primerNombre);
  if (!clavesEnUso.has(normPrimer)) {
    return {
      clave: primerNombre,
      tieneConflicto: false,
      primerNombreCandidato: primerNombre,
      segundoNombreCandidato: segundoNombre,
    };
  }

  // Primer nombre en uso, verificar segundo nombre
  if (segundoNombre) {
    const normSegundo = normalizarParaComparacion(segundoNombre);
    if (!clavesEnUso.has(normSegundo)) {
      return {
        clave: segundoNombre,
        tieneConflicto: false,
        primerNombreCandidato: primerNombre,
        segundoNombreCandidato: segundoNombre,
      };
    }

    return {
      clave: '',
      tieneConflicto: true,
      primerNombreCandidato: primerNombre,
      segundoNombreCandidato: segundoNombre,
      error: `Colisión nominal: tanto "${primerNombre}" como "${segundoNombre}" ya están registrados como claves en este negocio. Modifique el nombre para diferenciarlo.`,
    };
  }

  return {
    clave: '',
    tieneConflicto: true,
    primerNombreCandidato: primerNombre,
    segundoNombreCandidato: null,
    error: `Colisión nominal: la clave "${primerNombre}" ya está registrada y no se proporcionó un segundo nombre para alternar.`,
  };
}
