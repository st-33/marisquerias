/**
 * 🏢 CONTRATO DE NEGOCIO REAL (UNIDAD SECUNDARIA)
 *
 * Datos mínimos de identidad y versionado del negocio aprovisionado
 * por Torre de Control en Unidad Secundaria.
 */

export interface NegocioReal {
  negocio_id: string;
  categoria_id: string;
  slug_categoria: string;
  version_npb_origen: number; // versión del NPB con la que nació este negocio
  cliente_id: string;
  estado?: string;
  db_url_operativa?: string;
  [key: string]: unknown;
  // Los demás campos (contrato, perfiles, etc.) los define Torre de Control; el APK solo los lee.
}

export interface RespuestaAccessCode {
  negocio: NegocioReal;
  db_url_operativa: string;
  [key: string]: unknown;
}
