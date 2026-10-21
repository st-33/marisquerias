/**
 * 📥 CARGADOR DEL NPB 00 DESDE UNIDAD SECUNDARIA
 *
 * Resuelve la plantilla base de categoría y valida su compatibilidad estricta
 * antes de permitir cualquier arranque o encendido dinámico en el APK.
 */

import { get, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import type { NegocioPlantillaBase } from './tiposNPB';
import { validarCompatibilidadNPB } from './validarCompatibilidadNPB';

export async function cargarNPB(
  db: Database,
  slugCategoria: string,
  versionNpbOrigen?: number
): Promise<NegocioPlantillaBase> {
  const cleanSlug = slugCategoria.trim().replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) {
    throw new Error('El slug de categoría es requerido para cargar el NPB');
  }

  // 1. Consulta el nodo de la plantilla en Unidad Secundaria
  // Intenta primero la ruta canónica del Ecosistema: categorias/{slug}/plantilla_base
  // Fallbacks: {slug}/Negocio principal de categoría, plantillas/{slug}
  const rutasCandidatas = [
    `categorias/${cleanSlug}/plantilla_base`,
    `${cleanSlug}/Negocio principal de categoría`,
    `plantillas/${cleanSlug}`,
  ];

  let snapshot = null;
  let rutaUsada = '';

  for (const ruta of rutasCandidatas) {
    const snap = await get(ref(db, ruta));
    if (snap.exists()) {
      snapshot = snap;
      rutaUsada = ruta;
      break;
    }
  }

  if (!snapshot || !snapshot.exists()) {
    throw new Error(
      `No se encontró el Negocio Principal de Categoría para '${cleanSlug}' en Unidad Secundaria`
    );
  }

  let npb = snapshot.val() as NegocioPlantillaBase;

  // 2. Verificación de versión con respecto a version_npb_origen
  if (versionNpbOrigen !== undefined && npb.version_npb !== versionNpbOrigen) {
    // Intentar cargar del histórico en la misma jerarquía encontrada
    const rutasHistorico = [
      `${rutaUsada}/historico/${versionNpbOrigen}`,
      `categorias/${cleanSlug}/plantilla_base/historico/${versionNpbOrigen}`,
      `${cleanSlug}/Negocio principal de categoría/historico/${versionNpbOrigen}`,
    ];

    let histSnap = null;
    for (const rHist of rutasHistorico) {
      const snap = await get(ref(db, rHist));
      if (snap.exists()) {
        histSnap = snap;
        break;
      }
    }

    if (histSnap && histSnap.exists()) {
      npb = histSnap.val() as NegocioPlantillaBase;
    } else {
      throw new Error(
        `Versión de NPB solicitada (${versionNpbOrigen}) no coincide con la versión activa (${npb.version_npb}) y no existe en el histórico`
      );
    }
  }

  // 3. Validación de compatibilidad con catálogos cerrados del APK
  const validacion = validarCompatibilidadNPB(npb);
  if (!validacion.compatible) {
    throw new Error(`NPB incompatible con este APK. Faltantes: ${validacion.faltantes.join(', ')}`);
  }

  return npb;
}
