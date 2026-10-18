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

  // 1. Consulta el nodo principal en Unidad Secundaria
  const rutaPrincipal = `${cleanSlug}/Negocio principal de categoría`;
  const principalRef = ref(db, rutaPrincipal);
  const snapshot = await get(principalRef);

  if (!snapshot.exists()) {
    throw new Error(
      `No se encontró el Negocio Principal de Categoría para '${cleanSlug}' en Unidad Secundaria`
    );
  }

  let npb = snapshot.val() as NegocioPlantillaBase;

  // 2. Verificación de versión con respecto a version_npb_origen
  if (versionNpbOrigen !== undefined && npb.version_npb !== versionNpbOrigen) {
    // Intentar cargar del histórico
    const rutaHistorico = `${cleanSlug}/Negocio principal de categoría/historico/${versionNpbOrigen}`;
    const histRef = ref(db, rutaHistorico);
    const histSnap = await get(histRef);

    if (histSnap.exists()) {
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
