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
import { SoundBank } from '../../../sistema/audio/bancoSonidos';

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

export function useLogicaSelectorRoles() {
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

  const estadoEncendido = useStore((s) => s.estadoEncendido);

  // Obtener roles habilitados
  const { loading, getRolesHabilitados } = useEmpaquetadorRoles({ db, rutaNegocio });

  const roles = useMemo((): RolInfo[] => {
    // Si tenemos EstadoEncendido del arranque O(1), proyectar sus roles activos canónicos
    const rolesActivos = estadoEncendido?.activos?.roles ?? estadoEncendido?.roles_activos;
    if (rolesActivos && Array.isArray(rolesActivos) && rolesActivos.length > 0) {
      const iconos: Record<string, string> = {
        administrador: 'settings',
        mesero: 'restaurant',
        cocina: 'flame',
        mostrador: 'cart',
        cajero: 'card-outline',
        repartidor: 'bicycle',
        barman: 'wine',
        barista: 'cafe',
        parrillero: 'bonfire',
        empacador: 'cube',
      };

      const nombres: Record<string, string> = {
        administrador: 'Administrador',
        mesero: 'Mesero',
        cocina: 'Cocina (KDS)',
        mostrador: 'Venta Mostrador',
        cajero: 'Cajero / Cobro',
        repartidor: 'Repartidor',
        barman: 'Barra / Barman',
        barista: 'Cafetería / Barista',
        parrillero: 'Parrilla',
        empacador: 'Empaque',
      };

      const rutas: Record<string, string> = {
        administrador: '/_role/admin/dashboard',
        mesero: '/_role/mesero',
        cocina: '/_role/cocina',
        mostrador: '/_role/venta-crudo',
        cajero: '/_role/caja',
        repartidor: '/_role/repartidor',
        barman: '/_role/barman',
        barista: '/_role/barista',
        parrillero: '/_role/parrillero',
        empacador: '/_role/empacador',
      };

      return rolesActivos.map((rolId) => ({
        id: rolId,
        nombre: nombres[rolId] || rolId,
        icono: iconos[rolId] || 'apps',
        ruta: rutas[rolId] || `/_role/${rolId}`,
      }));
    }

    const habilitados = getRolesHabilitados();
    return habilitados.map((r) => ({
      id: r.ruta,
      nombre: r.nombre,
      icono: r.icono,
      ruta: r.ruta,
    }));
  }, [estadoEncendido, getRolesHabilitados]);

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

// Retrocompatibilidad
export const useRoleSelectorLogic = useLogicaSelectorRoles;
