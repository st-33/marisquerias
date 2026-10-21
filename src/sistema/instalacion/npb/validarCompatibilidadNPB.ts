/**
 * 🛡️ VALIDADOR PURO DE COMPATIBILIDAD NPB 00
 *
 * Verifica que el NegocioPlantillaBase sellado en Unidad Secundaria no contenga
 * capacidades, roles o cajones que el APK operativo desconozca o no soporte.
 */

import { ROLES_DISPOSITIVO_CANONICOS } from '../../../negocio/roles/catalogoRoles';
import { CAJONES_CANONICOS } from '../../rtdb/rutas/ruta_negocio';
import { CAPACIDADES_CANONICAS, type NegocioPlantillaBase } from './tiposNPB';

export interface ResultadoValidacionNPB {
  compatible: boolean;
  faltantes: string[];
}

export function validarCompatibilidadNPB(npb: NegocioPlantillaBase): ResultadoValidacionNPB {
  const faltantes: string[] = [];

  if (!npb || typeof npb !== 'object') {
    return {
      compatible: false,
      faltantes: ['npb:invalido_o_nulo'],
    };
  }

  // 1. Validar Capacidades
  if (Array.isArray(npb.capacidades)) {
    for (const cap of npb.capacidades) {
      if (!cap || !cap.id || !(CAPACIDADES_CANONICAS as readonly string[]).includes(cap.id)) {
        faltantes.push(`capacidad:${cap?.id || 'desconocida'}`);
      }
    }
  } else {
    faltantes.push('npb:capacidades_no_es_arreglo');
  }

  // 2. Validar Roles de Dispositivo
  if (Array.isArray(npb.roles_dispositivo)) {
    for (const rol of npb.roles_dispositivo) {
      if (!rol || !rol.id || !(ROLES_DISPOSITIVO_CANONICOS as readonly string[]).includes(rol.id)) {
        faltantes.push(`rol:${rol?.id || 'desconocido'}`);
      }
    }
  } else {
    faltantes.push('npb:roles_dispositivo_no_es_arreglo');
  }

  // 3. Validar Cajones Activos
  if (Array.isArray(npb.cajones_activos)) {
    for (const cajon of npb.cajones_activos) {
      if (!cajon || !(CAJONES_CANONICOS as readonly string[]).includes(cajon as any)) {
        faltantes.push(`cajon:${cajon || 'desconocido'}`);
      }
    }
  } else {
    faltantes.push('npb:cajones_activos_no_es_arreglo');
  }

  return {
    compatible: faltantes.length === 0,
    faltantes,
  };
}
