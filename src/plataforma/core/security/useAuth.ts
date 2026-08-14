import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { logger, setUser } from '../monitoring';
import { EnsambladorInstalacion } from '../../instalacion';

export type ValidateResult = { ok: true } | { ok: false; error: string };

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const setSession = useStore((s) => s.setSession);
  const setFeatures = useStore((s) => s.setFeatures);

  const validateAccessCode = useCallback(
    async (code: string): Promise<ValidateResult> => {
      const clean = code.trim().toUpperCase();
      if (!clean) return { ok: false, error: 'Ingresa un código válido' };
      setLoading(true);
      try {
        const { getRtdb } = await import('../firebase');
        const db = getRtdb();

        // 1. Instalar el dispositivo y obtener configuración de forma endurecida
        const ensamblador = new EnsambladorInstalacion(db);
        const installRes = await ensamblador.instalar(clean);
        if (!installRes.ok) {
          return { ok: false, error: installRes.error };
        }

        // 2. Establecer características resueltas en el store centralizado
        setFeatures(installRes.features);

        const { dispositivo } = installRes;

        // 2.5 Registrar dispositivo de forma persistente en el sistema de seguridad
        const { deviceBinding } = await import('./deviceBinding');
        await deviceBinding.registerDevice(dispositivo.tenantPath);

        // 3. Guardar sesión con rol inicial asignado
        const rolInicial = dispositivo.rolActivo || null;
        await setSession({
          access_code: clean,
          tenantPath: dispositivo.tenantPath,
          tenantId: dispositivo.tenantId,
          niche: dispositivo.niche,
          category: dispositivo.category || null,
          rol: rolInicial,
        });

        // Configurar usuario en Sentry para tracking
        setUser({
          id: dispositivo.tenantId,
          tenantId: dispositivo.tenantId,
          rol: rolInicial || 'none',
        });

        logger.info('AUTH', 'Login exitoso con dispositivo endurecido', {
          tenantId: dispositivo.tenantId,
          niche: dispositivo.niche,
        });
        logger.event('login_success', {
          tenantId: dispositivo.tenantId,
          niche: dispositivo.niche,
        });

        return { ok: true };
      } catch (error: any) {
        logger.error('AUTH', 'Error en validateAccessCode', error as Error, { code: clean });
        return { ok: false, error: error.message || 'Error de conexión. Intenta de nuevo.' };
      } finally {
        setLoading(false);
      }
    },
    [setSession, setFeatures]
  );

  return { loading, validateAccessCode } as const;
}
