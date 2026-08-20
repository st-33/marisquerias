/**
 * Identidad derivada de un tenantPath válido de mínimo 2 segmentos: [...contextoPath]/{categoria}/{negocio}.
 * El cliente nunca inventa estos valores; los deriva del tenantPath recibido de RTDB.
 */
export type IdentidadTenant = {
  /** El path completo tal como existe en RTDB, ej: "marisquerias/el-arrecife" o "nicho/marisquerias/el-arrecife" */
  tenantPath: string;
  /** El segmento final del path: identifica el negocio, ej: "el-arrecife" */
  tenantId: string;
  /** El penúltimo segmento del path: categoría del negocio, ej: "marisquerias" */
  categoriaId: string;
  /** El contexto superior al categoriaId, puede ser vacío, ej: "nicho" o "" */
  contextoPath: string;
  /** Alias de categoriaId para compatibilidad con consumidores que usan nichoId (deprecated) */
  nichoId: string;
  /** Alias de tenantId para compatibilidad (deprecated) */
  negocioBaseId: string;
};

/**
 * Construye un tenantPath canónico de al menos 2 segmentos.
 * Solo para uso en bootstrap/tests. En producción, el path viene de RTDB.
 */
export function crearRutaTenant({
  contextoPath = '',
  categoriaId,
  tenantId,
}: {
  contextoPath?: string;
  categoriaId: string;
  tenantId: string;
}): string {
  if (contextoPath) {
    return `${contextoPath}/${categoriaId}/${tenantId}`;
  }
  return `${categoriaId}/${tenantId}`;
}

/**
 * Valida que una ruta sea de al menos 2 segmentos no vacíos y no sea legacy.
 * Formato esperado: [...contexto]/{categoria}/{negocio}
 */
export function validarRutaTenant(valor: string): boolean {
  if (!valor || typeof valor !== 'string') return false;
  if (esRutaLegacy(valor)) return false;
  const parts = valor.split('/').filter(Boolean);
  return parts.length >= 2;
}

/**
 * Descompone un tenantPath de al menos 2 segmentos en su identidad estructurada.
 * Retorna null si el formato es inválido o es una ruta legacy.
 */
export function descomponerRutaTenant(ruta: string): IdentidadTenant | null {
  if (!ruta || typeof ruta !== 'string' || esRutaLegacy(ruta)) return null;
  const parts = ruta.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const tenantId = parts[parts.length - 1];
  const categoriaId = parts[parts.length - 2];
  const contextoPath = parts.slice(0, parts.length - 2).join('/');

  return {
    tenantPath: ruta,
    categoriaId,
    contextoPath,
    nichoId: categoriaId,
    tenantId,
    negocioBaseId: tenantId,
  };
}

/** Detecta rutas legacy que no deben usarse en producción. */
export function esRutaLegacy(ruta: string): boolean {
  return typeof ruta === 'string' && ruta.startsWith('restaurantero');
}
