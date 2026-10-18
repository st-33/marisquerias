/**
 * 💡 MOTOR DE ENCENDIDO DINÁMICO DE CAPACIDADES Y ROLES
 *
 * Aplica la plantilla base (NPB 00) validada.
 * Activa exclusivamente lo declarado y duerme todo lo demás.
 */

import { CAPACIDADES_CANONICAS, type CapacidadCanonica } from '../../utilidades/caracteristicas';
import {
  ROLES_DISPOSITIVO_CANONICOS,
  type RolDispositivoCanonico,
} from '../../../negocio/roles/catalogoRoles';
import { CAJONES_CANONICOS, type CajonOperativo } from '../../rtdb/rutas/ruta_negocio';
import type { NegocioPlantillaBase } from './tiposNPB';

export interface EstadoEncendido {
  capacidades_activas: CapacidadCanonica[];
  capacidades_dormidas: CapacidadCanonica[];
  roles_activos: RolDispositivoCanonico[];
  roles_dormidos: RolDispositivoCanonico[];
  cajones_activos: CajonOperativo[];
  cajones_dormidos: CajonOperativo[];
  dormidos: {
    capacidades: CapacidadCanonica[];
    roles: RolDispositivoCanonico[];
    cajones: CajonOperativo[];
  };
  justificacion_cajones_desactivados: Record<string, string>;
  version_npb: number;
  categoria_id: string;
  slug_categoria: string;
  timestamp: number;
}

export function encenderCapacidades(npb: NegocioPlantillaBase): EstadoEncendido {
  const idsCapacidadesActivas = new Set(
    (npb.capacidades || []).map((c) => c.id as CapacidadCanonica)
  );
  const idsRolesActivos = new Set(
    (npb.roles_dispositivo || []).map((r) => r.id as RolDispositivoCanonico)
  );
  const idsCajonesActivos = new Set((npb.cajones_activos || []).map((c) => c as CajonOperativo));

  // Si cualquier rol KDS (cocina, barman, barista, parrillero, empacador) está activo,
  // garantizar que la capacidad comanda_cocina esté activa.
  const rolesKDS: RolDispositivoCanonico[] = [
    'cocina',
    'barman',
    'barista',
    'parrillero',
    'empacador',
  ];
  if (rolesKDS.some((r) => idsRolesActivos.has(r))) {
    idsCapacidadesActivas.add('comanda_cocina');
  }

  const capacidades_activas: CapacidadCanonica[] = [];
  const capacidades_dormidas: CapacidadCanonica[] = [];

  for (const cap of CAPACIDADES_CANONICAS) {
    if (idsCapacidadesActivas.has(cap)) {
      capacidades_activas.push(cap);
    } else {
      capacidades_dormidas.push(cap);
    }
  }

  const roles_activos: RolDispositivoCanonico[] = [];
  const roles_dormidos: RolDispositivoCanonico[] = [];

  for (const rol of ROLES_DISPOSITIVO_CANONICOS) {
    if (idsRolesActivos.has(rol)) {
      roles_activos.push(rol);
    } else {
      roles_dormidos.push(rol);
    }
  }

  const cajones_activos: CajonOperativo[] = [];
  const cajones_dormidos: CajonOperativo[] = [];

  for (const cajon of CAJONES_CANONICOS) {
    if (idsCajonesActivos.has(cajon)) {
      cajones_activos.push(cajon);
    } else {
      cajones_dormidos.push(cajon);
    }
  }

  return {
    capacidades_activas,
    capacidades_dormidas,
    roles_activos,
    roles_dormidos,
    cajones_activos,
    cajones_dormidos,
    dormidos: {
      capacidades: capacidades_dormidas,
      roles: roles_dormidos,
      cajones: cajones_dormidos,
    },
    justificacion_cajones_desactivados: npb.cajones_desactivados_justificacion || {},
    version_npb: npb.version_npb,
    categoria_id: npb.categoria_id,
    slug_categoria: npb.slug_categoria,
    timestamp: Date.now(),
  };
}
