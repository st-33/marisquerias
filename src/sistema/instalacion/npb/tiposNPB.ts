/**
 * 📜 CONTRATO DEL NPB 00 (NEGOCIO PLANTILLA BASE)
 *
 * Contrato canónico congelado y sincronizado con el Ecosistema.
 * Sellado por Torre de Control en Unidad Secundaria.
 */

export type CapacidadCanonica =
  | 'menu'
  | 'control_mesas'
  | 'comanda_cocina'
  | 'mostrador_y_pos'
  | 'inventario'
  | 'aparatos_conectados'
  | 'reparto_logistica'
  | 'metricas_y_cierres'
  | 'tickets_impresion';

export const CAPACIDADES_CANONICAS: readonly CapacidadCanonica[] = [
  'menu',
  'control_mesas',
  'comanda_cocina',
  'mostrador_y_pos',
  'inventario',
  'aparatos_conectados',
  'reparto_logistica',
  'metricas_y_cierres',
  'tickets_impresion',
] as const;

export interface RolDispositivoNPB {
  id: string;
  pantallas_visibles: string[];
  [key: string]: unknown;
}

export interface CapacidadNPB {
  id: string;
  configuracion_giro: string; // 15-200 chars, adaptación específica al giro
  [key: string]: unknown;
}

export interface NegocioPlantillaBase {
  categoria_id: string;
  slug_categoria: string;
  estado: 'borrador' | 'sellado';
  roles_dispositivo: RolDispositivoNPB[];
  capacidades: CapacidadNPB[];
  cajones_activos: string[];
  cajones_desactivados_justificacion: Record<string, string>;
  sellado_por?: string;
  sellado_en?: string;
  [key: string]: unknown;
}
