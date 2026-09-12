/**
 * Identidad derivada de una ruta_negocio válida de mínimo 2 segmentos: [...contexto_path]/{categoria}/{negocio}.
 * El cliente nunca inventa estos valores; los deriva de la ruta_negocio recibida de RTDB.
 */
export type IdentidadNegocio = {
  /** La ruta completa tal como existe en RTDB, ej: "marisquerias/el-arrecife" */
  ruta_negocio: string;
  /** El segmento final de la ruta: identifica el negocio, ej: "el-arrecife" */
  negocio_id: string;
  /** El penúltimo segmento de la ruta: categoría del negocio, ej: "marisquerias" */
  categoria_id: string;
  /** El contexto superior a categoria_id, puede ser vacío, ej: "nicho" o "" */
  contexto_path: string;
  /** Versiones camelCase canónicas */
  rutaNegocio: string;
  negocioId: string;
  categoriaId: string;
  contextoPath: string;
  nichoId: string;
  negocioBaseId: string;
  /** Identidad canónica universal (ej: "puerto_libres" a partir de "marisqueria-puerto-libres") */
  negocio_id_canonico: string;
  negocioIdCanonico: string;
};

/**
 * Extrae y aisla el negocio_id canónico eliminando prefijos redundantes
 * de categoría (ej: "marisqueria-puerto-libres" -> "puerto_libres") y normalizando
 * a snake_case en minúsculas.
 */
export function extraer_negocio_id_canonico(
  rutaONegocioId: string,
  categoriaId?: string
): string {
  if (!rutaONegocioId || typeof rutaONegocioId !== 'string') return '';
  const parts = rutaONegocioId.split('/').filter(Boolean);
  let segment = parts[parts.length - 1] || '';

  let categoria = categoriaId;
  if (!categoria && parts.length >= 2) {
    categoria = parts[parts.length - 2];
  }

  if (categoria) {
    const catLower = categoria.toLowerCase();
    const catSingular = catLower.endsWith('s') ? catLower.slice(0, -1) : catLower;
    const regex = new RegExp(`^(${catLower}|${catSingular})[-_]`, 'i');
    segment = segment.replace(regex, '');
  }

  return segment
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/^_+|_+$/g, '');
}

export const extraerNegocioIdCanonico = extraer_negocio_id_canonico;

/**
 * Construye una ruta_negocio canónica de al menos 2 segmentos.
 * Solo para uso en bootstrap/tests. En producción, la ruta viene de RTDB.
 */
export function crear_ruta_negocio({
  contexto_path = '',
  categoria_id,
  negocio_id,
}: {
  contexto_path?: string;
  categoria_id: string;
  negocio_id: string;
}): string {
  if (contexto_path) {
    return `${contexto_path}/${categoria_id}/${negocio_id}`;
  }
  return `${categoria_id}/${negocio_id}`;
}

export const crearRutaNegocio = crear_ruta_negocio;

/**
 * Valida que una ruta sea de al menos 2 segmentos no vacíos y no sea legacy.
 * Formato esperado: [...contexto]/{categoria}/{negocio}
 */
export function validar_ruta_negocio(valor: string): boolean {
  if (!valor || typeof valor !== 'string') return false;
  if (es_ruta_legacy(valor)) return false;
  const parts = valor.split('/').filter(Boolean);
  return parts.length >= 2;
}

export const validarRutaNegocio = validar_ruta_negocio;

/**
 * Descompone una ruta_negocio de al menos 2 segmentos en su identidad estructurada.
 * Retorna null si el formato es inválido o es una ruta legacy.
 */
export function descomponer_ruta_negocio(ruta: string): IdentidadNegocio | null {
  if (!ruta || typeof ruta !== 'string' || es_ruta_legacy(ruta)) return null;
  const parts = ruta.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const negocio_id = parts[parts.length - 1];
  const categoria_id = parts[parts.length - 2];
  const contexto_path = parts.slice(0, parts.length - 2).join('/');
  const negocio_id_canonico = extraer_negocio_id_canonico(negocio_id, categoria_id);

  return {
    ruta_negocio: ruta,
    negocio_id,
    categoria_id,
    contexto_path,
    rutaNegocio: ruta,
    negocioId: negocio_id,
    categoriaId: categoria_id,
    contextoPath: contexto_path,
    nichoId: categoria_id,
    negocioBaseId: negocio_id,
    negocio_id_canonico,
    negocioIdCanonico: negocio_id_canonico,
  };
}

export const descomponerRutaNegocio = descomponer_ruta_negocio;

/** Detecta rutas legacy que no deben usarse en producción. */
export function es_ruta_legacy(ruta: string): boolean {
  return typeof ruta === 'string' && ruta.startsWith('restaurantero');
}

export const esRutaLegacy = es_ruta_legacy;
