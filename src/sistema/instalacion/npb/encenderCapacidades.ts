/**
 * 💡 MOTOR DE ENCENDIDO DINÁMICO DE CAPACIDADES Y ROLES
 *
 * Activa exclusivamente las capacidades autorizadas para el negocio
 * a partir del universo funcional de la aplicación compartida (NPB 00),
 * subordinando estrictamente roles y cajones a las capacidades activas.
 */

import {
  CATALOGO_ROLES_DISPOSITIVO,
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
  categoria_id?: string;
  slug_categoria?: string;
  capacidades_autorizadas?: CapacidadCanonica[] | Record<string, boolean>;
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
  categoria_id: string;
  slug_categoria: string;
  tipo_acceso?: TipoAccesoCodigo;
  negocio_id?: string;
  timestamp: number;
}

/**
 * Representación canónica local de todo lo desarrollado en el proyecto Marisquerías (NPB 00).
 * La aplicación ya contiene la implementación funcional de la categoría y no necesita
 * descargar el árbol completo del NPB 00 en cada inicio de negocio.
 */
export const PLANTILLA_CATEGORIA_MARISQUERIAS: NegocioPlantillaBase = {
  categoria_id: 'marisquerias',
  slug_categoria: 'marisquerias',
  estado: 'sellado',
  roles_dispositivo: ROLES_DISPOSITIVO_CANONICOS.map((id) => ({
    id,
    pantallas_visibles: CATALOGO_ROLES_DISPOSITIVO[id].pantallas_visibles_default,
  })),
  capacidades: CAPACIDADES_CANONICAS.map((id) => ({
    id,
    configuracion_giro: 'Capacidad implementada en la aplicación compartida de Marisquerías',
  })),
  cajones_activos: [...CAJONES_CANONICOS],
  cajones_desactivados_justificacion: {},
};

function esObjetoPlantilla(
  entrada: NegocioPlantillaBase | NegocioReal | AutorizacionesNegocio
): entrada is NegocioPlantillaBase {
  return (
    Array.isArray((entrada as NegocioPlantillaBase).capacidades) ||
    Array.isArray((entrada as NegocioPlantillaBase).roles_dispositivo) ||
    Array.isArray((entrada as NegocioPlantillaBase).cajones_activos)
  );
}

/**
 * 💡 MOTOR DE ENCENDIDO DINÁMICO DE CAPACIDADES Y ROLES
 *
 * Puede invocarse directamente con la configuración del negocio `encenderCapacidades(negocio)`
 * (usando el universo funcional implementado en la aplicación) o con una definición de plantilla
 * explícita `encenderCapacidades(npb, negocio)`.
 */
export function encenderCapacidades(
  npbONegocio: NegocioPlantillaBase | NegocioReal | AutorizacionesNegocio,
  negocioOpcional?: NegocioReal | AutorizacionesNegocio
): EstadoEncendido {
  const npb: NegocioPlantillaBase = esObjetoPlantilla(npbONegocio)
    ? npbONegocio
    : PLANTILLA_CATEGORIA_MARISQUERIAS;
  const negocio: NegocioReal | AutorizacionesNegocio | undefined = esObjetoPlantilla(npbONegocio)
    ? negocioOpcional
    : npbONegocio;

  const capacidadesDisponiblesNPB = new Set(
    (npb.capacidades || []).map((c) => c.id as CapacidadCanonica)
  );

  const tieneCapacidadesParticulares =
    negocio !== undefined &&
    negocio.capacidades_autorizadas !== undefined &&
    (Array.isArray(negocio.capacidades_autorizadas)
      ? negocio.capacidades_autorizadas.length > 0
      : Object.keys(negocio.capacidades_autorizadas || {}).length > 0);

  const esPlantilla =
    negocio?.tipo_acceso === 'plantilla' ||
    negocio?.negocio_id === '00' ||
    negocio?.negocio_id === '__plantilla_base' ||
    (!negocio && (npb as Record<string, unknown>).tipo_acceso === 'plantilla');

  let idsCapacidadesActivas = new Set<CapacidadCanonica>();

  if (!negocio || (esPlantilla && !tieneCapacidadesParticulares)) {
    idsCapacidadesActivas = new Set(capacidadesDisponiblesNPB);
  } else if (Array.isArray(negocio.capacidades_autorizadas)) {
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
      if (enabled === true && capacidadesDisponiblesNPB.has(cap as CapacidadCanonica)) {
        idsCapacidadesActivas.add(cap as CapacidadCanonica);
      }
    }
  }

  // Subordinación de capacidades compuestas:
  // - comanda_cocina requiere menu
  if (idsCapacidadesActivas.has('comanda_cocina') && !idsCapacidadesActivas.has('menu')) {
    idsCapacidadesActivas.delete('comanda_cocina');
  }
  // - control_mesas requiere menu
  if (idsCapacidadesActivas.has('control_mesas') && !idsCapacidadesActivas.has('menu')) {
    idsCapacidadesActivas.delete('control_mesas');
  }

  // Clasificar capacidades activas y dormidas
  const capacidades_activas: CapacidadCanonica[] = [];
  const capacidades_dormidas: CapacidadCanonica[] = [];

  for (const cap of CAPACIDADES_CANONICAS) {
    if (idsCapacidadesActivas.has(cap)) {
      capacidades_activas.push(cap);
    } else {
      capacidades_dormidas.push(cap);
    }
  }

  // Resolver roles de dispositivo subordinados estrictamente a las capacidades activas
  const idsRolesDeclarados = new Set(
    (npb.roles_dispositivo || []).map((r) => (r.id === 'admin' ? 'administrador' : r.id))
  );
  const rolesPermitidosNegocio = Array.isArray(negocio?.roles_permitidos)
    ? new Set(negocio.roles_permitidos.map((r) => (r === 'admin' ? 'administrador' : r)))
    : null;

  const roles_activos: RolDispositivoCanonico[] = [];
  const roles_dormidos: RolDispositivoCanonico[] = [];

  for (const rol of ROLES_DISPOSITIVO_CANONICOS) {
    const definicionRol = CATALOGO_ROLES_DISPOSITIVO[rol];
    const cumpleNPB = idsRolesDeclarados.has(rol);
    const cumpleNegocio = rolesPermitidosNegocio ? rolesPermitidosNegocio.has(rol) : true;
    const cumpleCapacidadesRequeridas = definicionRol.capacidades_requeridas.every((capReq) =>
      idsCapacidadesActivas.has(capReq)
    );

    if (cumpleNPB && cumpleNegocio && cumpleCapacidadesRequeridas) {
      roles_activos.push(rol);
    } else {
      roles_dormidos.push(rol);
    }
  }

  // Resolver cajones según capacidades autorizadas y cajones dormidos forzados
  const cajonesDeclaradosNPB = new Set((npb.cajones_activos || []).map((c) => c as CajonOperativo));
  const forzadosDormidos = new Set(
    (negocio?.cajones_dormidos_forzados || []).map((c) => c as CajonOperativo)
  );

  const cajones_activos: CajonOperativo[] = [];
  const cajones_dormidos: CajonOperativo[] = [];

  for (const cajon of CAJONES_CANONICOS) {
    let activo = cajonesDeclaradosNPB.has(cajon) && !forzadosDormidos.has(cajon);

    if (cajon === 'menu' && !idsCapacidadesActivas.has('menu')) activo = false;
    if (
      (cajon === 'mesas' || cajon === 'mesas_pendientes') &&
      !idsCapacidadesActivas.has('control_mesas')
    ) {
      activo = false;
    }
    if (
      cajon === 'pedidos' &&
      !idsCapacidadesActivas.has('control_mesas') &&
      !idsCapacidadesActivas.has('comanda_cocina') &&
      !idsCapacidadesActivas.has('mostrador_y_pos') &&
      !idsCapacidadesActivas.has('reparto_logistica')
    ) {
      activo = false;
    }
    if (cajon === 'ventas' && !idsCapacidadesActivas.has('mostrador_y_pos')) activo = false;
    if (cajon === 'inventario' && !idsCapacidadesActivas.has('inventario')) activo = false;
    if (cajon === 'reparto_ajustes' && !idsCapacidadesActivas.has('reparto_logistica')) {
      activo = false;
    }
    if (cajon === 'tickets' && !idsCapacidadesActivas.has('tickets_impresion')) activo = false;
    if (
      cajon === 'dispositivos' &&
      !idsCapacidadesActivas.has('aparatos_conectados') &&
      !idsCapacidadesActivas.has('tickets_impresion') &&
      idsCapacidadesActivas.size === 0
    ) {
      activo = false;
    }

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
        justificacion[cajon] = 'Capacidad no autorizada para este establecimiento';
      }
    }
  }

  const categoriaId = String(negocio?.categoria_id || npb.categoria_id || 'marisquerias');
  const slugCategoria = String(negocio?.slug_categoria || npb.slug_categoria || 'marisquerias');

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
    categoria_id: categoriaId,
    slug_categoria: slugCategoria,
    tipo_acceso: esPlantilla ? 'plantilla' : 'negocio_real',
    negocio_id: negocio?.negocio_id,
    timestamp: Date.now(),
  };
}
