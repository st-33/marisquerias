/**
 * 💡 MOTOR DE ENCENDIDO DINÁMICO DE CAPACIDADES Y ROLES
 *
 * Aplica la plantilla base (NPB 00) validada.
 * Activa exclusivamente lo declarado y duerme todo lo demás.
 */

import {
  ROLES_DISPOSITIVO_CANONICOS,
  type RolDispositivoCanonico,
} from '../../../negocio/roles/catalogoRoles';
import { CAJONES_CANONICOS, type CajonOperativo } from '../../rtdb/rutas/ruta_negocio';
import {
  CAPACIDADES_CANONICAS,
  type CapacidadCanonica,
  type NegocioPlantillaBase,
} from './tiposNPB';
import type { NegocioReal, TipoAccesoCodigo } from './tiposNegocioReal';

export interface AutorizacionesNegocio {
  tipo_acceso?: TipoAccesoCodigo;
  negocio_id?: string;
  capacidades_autorizadas?: CapacidadCanonica[];
  roles_permitidos?: (RolDispositivoCanonico | string)[];
  cajones_dormidos_forzados?: CajonOperativo[];
  [key: string]: unknown;
}

export interface EstadoEncendido {
  capacidades_activas: CapacidadCanonica[];
  capacidades_dormidas: CapacidadCanonica[];
  roles_activos: RolDispositivoCanonico[];
  roles_dormidos: RolDispositivoCanonico[];
  cajones_activos: CajonOperativo[];
  cajones_dormidos: CajonOperativo[];
  activos?: {
    capacidades: CapacidadCanonica[];
    roles: RolDispositivoCanonico[];
    cajones: CajonOperativo[];
  };
  dormidos: {
    capacidades: CapacidadCanonica[];
    roles: RolDispositivoCanonico[];
    cajones: CajonOperativo[];
  };
  justificacion_cajones_desactivados: Record<string, string>;
  version_npb: number;
  categoria_id: string;
  slug_categoria: string;
  tipo_acceso?: TipoAccesoCodigo;
  negocio_id?: string;
  timestamp: number;
}

/**
 * 💡 MOTOR DE ENCENDIDO DINÁMICO DE CAPACIDADES Y ROLES
 *
 * Aplica la regla de intersección:
 *   Capacidades Activas = Capacidades Disponibles en NPB 00 ∩ Capacidades Autorizadas del Negocio
 *
 * Si es una plantilla de pruebas (tipo_acceso === 'plantilla' o negocio_id === '00'):
 *   Enciende todas las capacidades disponibles en el NPB.
 *
 * Para un negocio real:
 *   Enciende únicamente lo autorizado contractualmente para esa instancia.
 *   Los cajones y roles se subordinan estrictamente a las capacidades activas.
 */
export function encenderCapacidades(
  npb: NegocioPlantillaBase,
  negocio?: NegocioReal | AutorizacionesNegocio
): EstadoEncendido {
  const capacidadesDisponiblesNPB = new Set(
    (npb.capacidades || []).map((c) => c.id as CapacidadCanonica)
  );

  const esPlantilla =
    negocio?.tipo_acceso === 'plantilla' ||
    negocio?.negocio_id === '00' ||
    negocio?.negocio_id === '__plantilla_base' ||
    (!negocio && (npb as any).tipo_acceso === 'plantilla');

  let idsCapacidadesActivas = new Set<CapacidadCanonica>();

  if (!negocio || esPlantilla) {
    // Modo Plantilla Base: el techo máximo disponible en la categoría
    idsCapacidadesActivas = new Set(capacidadesDisponiblesNPB);
  } else {
    // Modo Negocio Real:
    if (Array.isArray(negocio.capacidades_autorizadas)) {
      // Intersección estricta si se especificaron capacidades autorizadas
      for (const cap of negocio.capacidades_autorizadas) {
        if (capacidadesDisponiblesNPB.has(cap)) {
          idsCapacidadesActivas.add(cap);
        }
      }
    } else if (
      negocio.capacidades_autorizadas &&
      typeof negocio.capacidades_autorizadas === 'object'
    ) {
      for (const [cap, enabled] of Object.entries(negocio.capacidades_autorizadas)) {
        if (enabled && capacidadesDisponiblesNPB.has(cap as CapacidadCanonica)) {
          idsCapacidadesActivas.add(cap as CapacidadCanonica);
        }
      }
    } else {
      // Si el negocio real no tiene capacidades_autorizadas explícitas en el payload
      // (ej. códigos provisionados estándar o heredados), adopta las del NPB
      idsCapacidadesActivas = new Set(capacidadesDisponiblesNPB);
    }
  }

  // 1. Resolver dependencias entre capacidades
  // Si cualquier rol KDS está declarado en el NPB y comanda_cocina no se prohibió explícitamente, asegurar comanda_cocina
  const idsRolesDeclarados = new Set(
    (npb.roles_dispositivo || []).map((r) => (r.id === 'admin' ? 'administrador' : r.id))
  );
  const rolesKDS: RolDispositivoCanonico[] = [
    'cocina',
    'barman',
    'barista',
    'parrillero',
    'empacador',
  ];
  if (
    rolesKDS.some((r) => idsRolesDeclarados.has(r)) &&
    (!Array.isArray(negocio?.capacidades_autorizadas) ||
      negocio.capacidades_autorizadas.includes('comanda_cocina'))
  ) {
    idsCapacidadesActivas.add('comanda_cocina');
  }

  // - comanda_cocina requiere menu
  if (idsCapacidadesActivas.has('comanda_cocina') && !idsCapacidadesActivas.has('menu')) {
    idsCapacidadesActivas.delete('comanda_cocina');
  }
  // - control_mesas requiere menu
  if (idsCapacidadesActivas.has('control_mesas') && !idsCapacidadesActivas.has('menu')) {
    idsCapacidadesActivas.delete('control_mesas');
  }

  // 2. Clasificar capacidades activas y dormidas
  const capacidades_activas: CapacidadCanonica[] = [];
  const capacidades_dormidas: CapacidadCanonica[] = [];

  for (const cap of CAPACIDADES_CANONICAS) {
    if (idsCapacidadesActivas.has(cap)) {
      capacidades_activas.push(cap);
    } else {
      capacidades_dormidas.push(cap);
    }
  }

  // 3. Resolver roles de dispositivo según capacidades y autorizaciones (orden canónico)
  const rolesPermitidosNegocio = Array.isArray(negocio?.roles_permitidos)
    ? new Set(negocio!.roles_permitidos.map((r) => (r === 'admin' ? 'administrador' : r)))
    : null;

  const roles_activos: RolDispositivoCanonico[] = [];
  const roles_dormidos: RolDispositivoCanonico[] = [];

  for (const rol of ROLES_DISPOSITIVO_CANONICOS) {
    let cumpleNPB = idsRolesDeclarados.has(rol);
    let cumpleNegocio = rolesPermitidosNegocio ? rolesPermitidosNegocio.has(rol) : true;

    if (cumpleNPB && cumpleNegocio) {
      roles_activos.push(rol);
    } else {
      roles_dormidos.push(rol);
    }
  }

  // 4. Resolver cajones según capacidades y cajones dormidos forzados
  const cajonesDeclaradosNPB = new Set((npb.cajones_activos || []).map((c) => c as CajonOperativo));
  const forzadosDormidos = new Set(
    (negocio?.cajones_dormidos_forzados || []).map((c) => c as CajonOperativo)
  );

  const cajones_activos: CajonOperativo[] = [];
  const cajones_dormidos: CajonOperativo[] = [];

  for (const cajon of CAJONES_CANONICOS) {
    let activo = cajonesDeclaradosNPB.has(cajon) && !forzadosDormidos.has(cajon);

    // Subordinación de cajones a capacidades cuando corresponda
    if (cajon === 'menu' && !idsCapacidadesActivas.has('menu')) activo = false;
    if (
      (cajon === 'mesas' || cajon === 'mesas_pendientes') &&
      !idsCapacidadesActivas.has('control_mesas')
    )
      activo = false;
    if (cajon === 'ventas' && !idsCapacidadesActivas.has('mostrador_y_pos')) activo = false;
    if (cajon === 'inventario' && !idsCapacidadesActivas.has('inventario')) activo = false;
    if (cajon === 'reparto_ajustes' && !idsCapacidadesActivas.has('reparto_logistica'))
      activo = false;
    if (cajon === 'tickets' && !idsCapacidadesActivas.has('tickets_impresion')) activo = false;

    if (activo) {
      cajones_activos.push(cajon);
    } else {
      cajones_dormidos.push(cajon);
    }
  }

  const justificacion = { ...(npb.cajones_desactivados_justificacion || {}) };
  for (const cajon of cajones_dormidos) {
    if (!justificacion[cajon]) {
      if (forzadosDormidos.has(cajon)) {
        justificacion[cajon] = 'Desactivado por política contractual del negocio';
      } else {
        justificacion[cajon] = 'Capacidad no autorizada o no disponible en la plantilla';
      }
    }
  }

  return {
    capacidades_activas,
    capacidades_dormidas,
    roles_activos,
    roles_dormidos,
    cajones_activos,
    cajones_dormidos,
    activos: {
      capacidades: capacidades_activas,
      roles: roles_activos,
      cajones: cajones_activos,
    },
    dormidos: {
      capacidades: capacidades_dormidas,
      roles: roles_dormidos,
      cajones: cajones_dormidos,
    },
    justificacion_cajones_desactivados: justificacion,
    version_npb: npb.version_npb,
    categoria_id: npb.categoria_id,
    slug_categoria: npb.slug_categoria,
    tipo_acceso: esPlantilla ? 'plantilla' : 'negocio_real',
    negocio_id: negocio?.negocio_id,
    timestamp: Date.now(),
  };
}
