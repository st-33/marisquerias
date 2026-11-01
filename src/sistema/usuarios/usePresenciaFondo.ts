/**
 * 💓 HOOK DE PRESENCIA TÉCNICA DE FONDO Y VIGENCIA DE SESIÓN
 *
 * Mantiene viva la plaza del dispositivo mediante latido técnico cada 30s
 * sin requerir interacción táctil humana.
 *
 * Escucha reactivamente `/sesiones/{plaza}`:
 * - Si el token_sesion remoto cambia: detecta desplazamiento por otra terminal y activa alerta de revocación.
 * - Si el estado pasa a 'drenando': notifica ajuste de cupo por administración sin bloquear de inmediato.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { ref, onValue, off } from 'firebase/database';
import { getOperacionRtdb, tieneUrlOperativa } from '../firebase';
import {
  obtenerSesionOperativaLocal,
  registrarLatidoPresencia,
  liberarSesionDispositivo,
  INTERVALO_LATIDO_PRESENCIA_MS,
} from './servicio_sesion_dispositivo';
import type { SesionOperativaLocal, SesionOperativaRemota } from './tipos';

export interface EstadoPresenciaFondo {
  activa: boolean;
  plazaId: string | null;
  tokenSesion: string | null;
  revocada: boolean;
  motivoRevocacion: string | null;
  drenando: boolean;
  ultimoLatido: number | null;
}

export function usePresenciaFondo(activo: boolean = true) {
  const [estado, setEstado] = useState<EstadoPresenciaFondo>({
    activa: false,
    plazaId: null,
    tokenSesion: null,
    revocada: false,
    motivoRevocacion: null,
    drenando: false,
    ultimoLatido: null,
  });

  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const sesionLocalRef = useRef<SesionOperativaLocal | null>(null);

  // Emitir un ping técnico
  const emitirPing = useCallback(async () => {
    if (!tieneUrlOperativa()) return;
    const sesion = sesionLocalRef.current || (await obtenerSesionOperativaLocal());
    if (!sesion || !sesion.slot_id || !sesion.token_sesion) return;

    try {
      const db = getOperacionRtdb();
      const res = await registrarLatidoPresencia(db, {
        slotId: sesion.slot_id,
        tokenSesion: sesion.token_sesion,
      });

      if (res.revocada) {
        setEstado((prev) => ({
          ...prev,
          revocada: true,
          motivoRevocacion:
            'Esta terminal ha sido relevada o su plaza fue asignada a otro dispositivo por inactividad técnica.',
        }));
      } else if (res.ok) {
        setEstado((prev) => ({ ...prev, ultimoLatido: Date.now() }));
      }
    } catch {
      // Error silencioso en red inestable
    }
  }, []);

  useEffect(() => {
    if (!activo) return;

    let cancelado = false;
    let unsubListener: (() => void) | null = null;

    const iniciarMonitoreo = async () => {
      const sesion = await obtenerSesionOperativaLocal();
      if (cancelado || !sesion || !sesion.slot_id) return;
      sesionLocalRef.current = sesion;

      setEstado({
        activa: true,
        plazaId: sesion.slot_id,
        tokenSesion: sesion.token_sesion || null,
        revocada: false,
        motivoRevocacion: null,
        drenando: sesion.estado === 'drenando',
        ultimoLatido: Date.now(),
      });

      // 1. Iniciar temporizador de fondo cada 30 segundos
      void emitirPing();
      intervaloRef.current = setInterval(() => {
        void emitirPing();
      }, INTERVALO_LATIDO_PRESENCIA_MS);

      // 2. Listener reactivo a /sesiones/{plaza}
      if (tieneUrlOperativa()) {
        try {
          const db = getOperacionRtdb();
          const sesionRef = ref(db, `sesiones/${sesion.slot_id}`);

          onValue(sesionRef, (snap) => {
            if (!snap.exists()) return;
            const remota = snap.val() as SesionOperativaRemota;

            // Detección de token relevado
            if (
              sesion.token_sesion &&
              remota.token_sesion &&
              remota.token_sesion !== sesion.token_sesion
            ) {
              setEstado((prev) => ({
                ...prev,
                revocada: true,
                motivoRevocacion:
                  'La plaza fue reclamada por otra terminal. Su sesión ha sido revocada.',
              }));
            }

            // Detección de drenado ordenado
            if (remota.estado === 'drenando') {
              setEstado((prev) => ({
                ...prev,
                drenando: true,
              }));
            }
          });

          unsubListener = () => {
            off(sesionRef);
          };
        } catch {
          // Ignorar si no hay conexión
        }
      }
    };

    void iniciarMonitoreo();

    // Pausar/reanudar ping según AppState
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void emitirPing();
      }
    };

    const subApp = AppState.addEventListener('change', handleAppState);

    return () => {
      cancelado = true;
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      if (unsubListener) unsubListener();
      subApp.remove();
    };
  }, [activo, emitirPing]);

  const cerrarSesionLocal = useCallback(async () => {
    try {
      if (tieneUrlOperativa() && sesionLocalRef.current?.slot_id) {
        const db = getOperacionRtdb();
        await liberarSesionDispositivo(db, { slotId: sesionLocalRef.current.slot_id });
      }
    } catch {
      // Ignorar fallo de red al desconectar
    }
  }, []);

  return {
    ...estado,
    emitirPing,
    cerrarSesionLocal,
  };
}
