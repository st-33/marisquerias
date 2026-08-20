/**
 * 🧠 LÓGICA DEL SELECTOR DE ROLES ELITE
 * Hook cerebro que maneja toda la lógica del selector de roles.
 *
 * RESPONSABILIDADES:
 * - Obtener roles habilitados del tenant
 * - Obtener nombre del negocio
 * - Manejar sonido de ola y vibración al presionar
 * - Manejar navegación y logout
 */

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Platform, Vibration } from 'react-native';
import { SoundBank } from '../../../sistema/audio/soundBank';
import { useStore } from '../../../sistema/store';
import { useEmpaquetadorRoles } from '../../../negocio/roles/empaquetadorRoles';

import { getRtdb } from '../../../sistema/firebase';

export interface RolInfo {
  id: string;
  nombre: string;
  icono: string;
  ruta: string;
}

export function useRoleSelectorLogic() {
  const db = getRtdb();
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const clearSession = useStore((s) => s.clearSession);
  const tenantId = useStore((s) => s.sesion.tenantId);

  // Limpiar sonido de feedback al desmontar
  useEffect(() => {
    return () => {
      SoundBank.stop('roleSelect').catch(() => {});
    };
  }, []);

  // Obtener roles habilitados
  const { loading, getRolesHabilitados } = useEmpaquetadorRoles({ db, tenantPath });

  const roles = useMemo((): RolInfo[] => {
    const habilitados = getRolesHabilitados();
    return habilitados.map((r) => ({
      id: r.ruta,
      nombre: r.nombre,
      icono: r.icono,
      ruta: r.ruta,
    }));
  }, [getRolesHabilitados]);

  // Nombre del negocio formateado
  const nombreNegocio = useMemo(() => {
    const idFromPath = (tenantId || '').split('/').pop() || '';
    const esMarisqueria = (tenantPath || '').includes('/marisquerias/');
    const base = idFromPath.replace(/^marisqueria-/, '').replace(/-/g, ' ');
    const titleCase = base.replace(/\b\w/g, (c: string) => c.toUpperCase());
    if (!titleCase) return 'Mi Negocio';
    return esMarisqueria ? `Marisquería ${titleCase}` : titleCase;
  }, [tenantPath, tenantId]);

  // Reproducir feedback (sonido + vibración)
  const playFeedback = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }
    await SoundBank.play('roleSelect');
  }, []);

  // Manejar selección de rol
  const handleRolPress = useCallback(
    async (ruta: string) => {
      await playFeedback();
      router.push(ruta as any);
    },
    [playFeedback]
  );

  // Manejar menú cliente
  const handleMenuCliente = useCallback(async () => {
    await playFeedback();
    console.log('[RoleSelector] Menú cliente');
  }, [playFeedback]);

  // Manejar logout
  const handleLogout = useCallback(async () => {
    await playFeedback();
    await clearSession();
    router.replace('/(auth)/access');
  }, [clearSession, playFeedback]);

  return {
    loading,
    roles,
    nombreNegocio,
    handleRolPress,
    handleMenuCliente,
    handleLogout,
    playFeedback,
  };
}
