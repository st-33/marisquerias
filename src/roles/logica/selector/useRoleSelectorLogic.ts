/**
 * 🧠 LÓGICA DEL SELECTOR DE ROLES ELITE
 * Hook cerebro que maneja toda la lógica del selector de roles.
 *
 * RESPONSABILIDADES:
 * - Obtener roles habilitados del negocio
 * - Obtener nombre del negocio
 * - Manejar sonido de ola y vibración al presionar
 * - Manejar navegación y logout
 */

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Vibration } from 'react-native';
import { onValue, ref } from 'firebase/database';
import { SoundBank } from '../../../sistema/audio/soundBank';
import { useStore } from '../../../sistema/store';
import { useEmpaquetadorRoles } from '../../../negocio/roles/empaquetadorRoles';
import { resolver_nombre_negocio } from '../../../sistema/rtdb/rutas/ruta_negocio';
import { getRtdb } from '../../../sistema/firebase';

export interface RolInfo {
  id: string;
  nombre: string;
  icono: string;
  ruta: string;
}

export function useRoleSelectorLogic() {
  const db = getRtdb();
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const clearSession = useStore((s) => s.clearSession);
  const negocioId = useStore((s) => s.sesion.negocioId);
  const accessCode = useStore((s) => s.sesion.access_code);
  const nombreConfigStore = useStore((s) => s.negocio?.configuracion?.nombre);

  const [nombreRemoto, setNombreRemoto] = useState<string | null>(null);

  // Escuchar nombre configurado en RTDB si existe
  useEffect(() => {
    if (!rutaNegocio) return;
    const unsubNombre = onValue(ref(db, `${rutaNegocio}/nombre`), (snap) => {
      if (snap.exists() && typeof snap.val() === 'string' && snap.val().trim()) {
        setNombreRemoto(snap.val().trim());
      }
    });
    const unsubConfigNombre = onValue(ref(db, `${rutaNegocio}/configuracion/nombre`), (snap) => {
      if (snap.exists() && typeof snap.val() === 'string' && snap.val().trim()) {
        setNombreRemoto(snap.val().trim());
      }
    });
    return () => {
      unsubNombre();
      unsubConfigNombre();
    };
  }, [db, rutaNegocio]);

  // Limpiar sonido de feedback al desmontar
  useEffect(() => {
    return () => {
      SoundBank.stop('roleSelect').catch(() => {});
    };
  }, []);

  // Obtener roles habilitados
  const { loading, getRolesHabilitados } = useEmpaquetadorRoles({ db, rutaNegocio });

  const roles = useMemo((): RolInfo[] => {
    const habilitados = getRolesHabilitados();
    return habilitados.map((r) => ({
      id: r.ruta,
      nombre: r.nombre,
      icono: r.icono,
      ruta: r.ruta,
    }));
  }, [getRolesHabilitados]);

  // Nombre del negocio formateado canónicamente (ej. "Marisquería Puerto Libres")
  const nombreNegocio = useMemo(() => {
    return resolver_nombre_negocio({
      nombreConfig: nombreRemoto || nombreConfigStore,
      negocioId,
      rutaNegocio,
      accessCode,
    });
  }, [nombreRemoto, nombreConfigStore, negocioId, rutaNegocio, accessCode]);

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
