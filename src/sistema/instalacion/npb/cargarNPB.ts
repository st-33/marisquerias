import { get, ref, type Database } from 'firebase/database';
import type { NegocioPlantillaBase } from './tiposNPB';
import { validarCompatibilidadNPB } from './validarCompatibilidadNPB';

/** La pertenencia del negocio determina una sola ruta; no hay nichos fijados ni búsquedas alternativas. */
export async function cargarNPB(db: Database, rutaNPB: string, versionNpbOrigen?: number): Promise<NegocioPlantillaBase> {
  const partes = rutaNPB.split('/');
  if (partes.length !== 3 || partes.some(p => !p.trim()) || partes[2] !== 'negocio_plantilla_base') {
    throw new Error('Se requiere la ruta completa de la plantilla de la categoría');
  }
  const snapshot = await get(ref(db, rutaNPB));
  if (!snapshot.exists()) throw new Error('No se encontró la plantilla de la categoría');
  let npb = snapshot.val() as NegocioPlantillaBase;
  if (versionNpbOrigen !== undefined && npb.version_npb !== versionNpbOrigen) {
    const historico = await get(ref(db, `${rutaNPB}/historico/${versionNpbOrigen}`));
    if (!historico.exists()) throw new Error('La versión de plantilla asignada no existe en el histórico');
    npb = historico.val();
  }
  if (versionNpbOrigen !== undefined && npb.version_npb !== versionNpbOrigen) throw new Error('La versión de la plantilla no coincide');
  if ((npb as any).estado !== 'sellado') throw new Error('La plantilla no está sellada');
  const validacion = validarCompatibilidadNPB(npb);
  if (!validacion.compatible) throw new Error(`NPB incompatible con este APK. Faltantes: ${validacion.faltantes.join(', ')}`);
  return npb;
}
