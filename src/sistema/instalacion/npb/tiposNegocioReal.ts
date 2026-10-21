/**
 * 🏢 CONTRATO DE NEGOCIO REAL (UNIDAD SECUNDARIA)
 *
 * Datos mínimos de identidad y versionado del negocio aprovisionado
 * por Torre de Control en Unidad Secundaria.
 */

import type { CapacidadCanonica } from './tiposNPB';
import type { CajonOperativo } from '../../rtdb/rutas/ruta_negocio';
import type { RolDispositivoCanonico } from '../../../negocio/roles/catalogoRoles';

export type TipoAccesoCodigo = 'plantilla' | 'negocio_real';

export interface NegocioReal {
  negocio_id: string;
  categoria_id: string;
  slug_categoria: string;
  version_npb_origen: number; // versión del NPB con la que nació este negocio
  cliente_id: string;
  estado?: 'activo' | 'usado' | 'revocado' | 'expirado' | string;
  db_url_operativa?: string;
  tipo_acceso?: TipoAccesoCodigo;
  nombre_comercial?: string;
  capacidades_autorizadas?: CapacidadCanonica[];
  cajones_dormidos_forzados?: CajonOperativo[];
  roles_permitidos?: (RolDispositivoCanonico | string)[];
  configuracion_operativa?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RespuestaAccessCode {
  negocio: NegocioReal;
  db_url_operativa: string;
  tipo_acceso?: TipoAccesoCodigo;
  [key: string]: unknown;
}
