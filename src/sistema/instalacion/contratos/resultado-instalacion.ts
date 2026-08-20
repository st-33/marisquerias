import { DispositivoVinculado } from './dispositivo-vinculado';
import type { Feature } from '../../../plataforma/core/types/contratos';

/**
 * 📦 RESULTADO DE LA OPERACIÓN DE INSTALACIÓN
 * Tipo de unión discriminada para retornar éxito o error.
 */
export type ResultadoInstalacion =
  | {
      ok: true;
      dispositivo: DispositivoVinculado;
      features: Record<string, Feature>;
    }
  | {
      ok: false;
      error: string;
    };
