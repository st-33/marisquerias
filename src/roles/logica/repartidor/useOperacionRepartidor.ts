/**
 * 🚚 HOOK DE OPERACIÓN DE REPARTIDOR (MÓVIL STANDALONE)
 *
 * Gestiona el ciclo operativo de despacho a domicilio:
 * - Lista de pedidos en cola de reparto
 * - Asignación de pedido al repartidor activo
 * - Transición de estados (en_camino, entregado, no_entregado)
 * - Registro de ajustes en RepositorioAjustesReparto
 * - Resiliencia offline (encola acciones y sincroniza al reconectar)
 * - Abrir dirección en Google Maps vía Linking
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import {
  RepartoRepository,
  type MisionDelivery,
  type EstadoMision,
  type Repartidor,
  type Ubicacion,
} from '../../../sistema/persistencia/reparto.repositorio';
import {
  RepositorioAjustesReparto,
  type AjustesReparto,
} from '../../../sistema/persistencia/reparto-ajustes.repositorio';
import { useStore } from '../../../sistema/store';
import { getRtdb } from '../../../sistema/firebase';

export type EstadoEntregaRepartidor = 'en_camino' | 'entregado' | 'no_entregado';

export interface AccionOfflineReparto {
  id: string;
  tipo: 'asignar' | 'cambiar_estado' | 'ajuste';
  payload: any;
  timestamp: number;
}

export interface UseOperacionRepartidorProps {
  repartoRepo?: RepartoRepository;
  ajustesRepo?: RepositorioAjustesReparto;
  repartidorInicial?: Repartidor;
  forzarOffline?: boolean;
}

export function useOperacionRepartidor(props?: UseOperacionRepartidorProps) {
  const storeRutaNegocio = useStore((s) => s.sesion.rutaNegocio) || 'negocios/marisqueria-01';
  const usuarioStore = useStore((s) => s.sesion.usuario?.nombre) || 'Repartidor';
  const ds = useStore((s) => s.dataSources);

  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds?.operacionUrl]);

  const repartoRepo = useMemo(
    () => props?.repartoRepo ?? new RepartoRepository(),
    [props?.repartoRepo]
  );

  const ajustesRepo = useMemo(
    () => props?.ajustesRepo ?? new RepositorioAjustesReparto(db, storeRutaNegocio),
    [props?.ajustesRepo, db, storeRutaNegocio]
  );

  const repartidorActual = useMemo((): Repartidor => {
    return (
      props?.repartidorInicial ?? {
        id: `rep_${usuarioStore.toLowerCase().replace(/\s+/g, '_')}`,
        nombre: usuarioStore,
        telefono: '555-000-0000',
      }
    );
  }, [props?.repartidorInicial, usuarioStore]);

  const [loading, setLoading] = useState(true);
  const [misiones, setMisiones] = useState<Record<string, MisionDelivery>>({});
  const [colaOffline, setColaOffline] = useState<AccionOfflineReparto[]>([]);
  const [esOffline, setEsOffline] = useState(props?.forzarOffline ?? false);
  const [umbrales, setUmbrales] = useState<AjustesReparto['umbrales']>({
    stockBajo: 5,
    maxPedidosActivos: 10,
    tiempoMaxEntregaMin: 45,
  });

  // Suscribirse a misiones de reparto
  useEffect(() => {
    let unsubMisiones: (() => void) | undefined;
    try {
      const fnSuscripcion =
        typeof repartoRepo.suscribirTodas === 'function'
          ? (cb: any) => repartoRepo.suscribirTodas(cb)
          : (cb: any) => (repartoRepo as any).suscribirMisiones(cb);

      unsubMisiones = fnSuscripcion((data: Record<string, any>) => {
        const misionesDelivery: Record<string, MisionDelivery> = {};
        for (const [id, m] of Object.entries(data || {})) {
          if ((m as any)?.tipo === 'delivery') {
            misionesDelivery[id] = m as MisionDelivery;
          }
        }
        setMisiones(misionesDelivery);
        setLoading(false);
      });
    } catch {
      queueMicrotask(() => {
        setLoading(false);
      });
    }

    let unsubUmbrales: (() => void) | undefined;
    try {
      unsubUmbrales = ajustesRepo.suscribirUmbrales((u) => {
        if (u) setUmbrales(u);
      });
    } catch {
      // Ignorar fallback
    }

    return () => {
      if (unsubMisiones) unsubMisiones();
      if (unsubUmbrales) unsubUmbrales();
    };
  }, [repartoRepo, ajustesRepo]);

  // Listas segmentadas
  const misionesArray = useMemo(() => Object.values(misiones), [misiones]);

  const pedidosDisponibles = useMemo(() => {
    return misionesArray.filter((m) => m.estado === 'pendiente');
  }, [misionesArray]);

  const pedidosAsignados = useMemo(() => {
    return misionesArray.filter(
      (m) =>
        m.repartidor?.id === repartidorActual.id &&
        (m.estado === 'asignada' || m.estado === 'en_camino' || m.estado === 'en_ubicacion')
    );
  }, [misionesArray, repartidorActual.id]);

  const historial = useMemo(() => {
    return misionesArray.filter(
      (m) => m.estado === 'completada' || m.estado === 'cancelada' || m.estado === 'fallida'
    );
  }, [misionesArray]);

  // Asignar pedido a uno mismo
  const asignarPedido = useCallback(
    async (misionId: string) => {
      if (esOffline) {
        // Encolar y actualizar estado local
        const accion: AccionOfflineReparto = {
          id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          tipo: 'asignar',
          payload: { misionId, repartidor: repartidorActual },
          timestamp: Date.now(),
        };
        setColaOffline((prev) => [...prev, accion]);
        setMisiones((prev) => {
          const actual = prev[misionId];
          if (!actual) return prev;
          return {
            ...prev,
            [misionId]: {
              ...actual,
              estado: 'asignada',
              repartidor: repartidorActual,
              asignadaAt: Date.now(),
            },
          };
        });
        return;
      }

      await repartoRepo.asignarRepartidor(misionId, repartidorActual);
    },
    [esOffline, repartoRepo, repartidorActual]
  );

  // Mapear estado UX a EstadoMision canónico
  const mapearEstado = (nuevoEstado: EstadoEntregaRepartidor): EstadoMision => {
    switch (nuevoEstado) {
      case 'en_camino':
        return 'en_camino';
      case 'entregado':
        return 'completada';
      case 'no_entregado':
        return 'fallida';
    }
  };

  // Cambiar estado de la misión
  const cambiarEstado = useCallback(
    async (misionId: string, nuevoEstado: EstadoEntregaRepartidor) => {
      const estadoCanonico = mapearEstado(nuevoEstado);

      if (esOffline) {
        const accion: AccionOfflineReparto = {
          id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          tipo: 'cambiar_estado',
          payload: { misionId, estado: estadoCanonico },
          timestamp: Date.now(),
        };
        setColaOffline((prev) => [...prev, accion]);
        setMisiones((prev) => {
          const actual = prev[misionId];
          if (!actual) return prev;
          return {
            ...prev,
            [misionId]: {
              ...actual,
              estado: estadoCanonico,
              ...(estadoCanonico === 'completada' ? { completadaAt: Date.now() } : {}),
            },
          };
        });
        return;
      }

      await repartoRepo.actualizarEstado(misionId, estadoCanonico);

      // Intento de notificación push al cliente (si la infraestructura existe)
      try {
        const globalAny = global as any;
        if (typeof globalAny.__notificarClienteEntrega === 'function') {
          globalAny.__notificarClienteEntrega(misionId, estadoCanonico);
        }
      } catch {
        // Omitir sin romper
      }
    },
    [esOffline, repartoRepo]
  );

  // Registrar ajustes de reparto
  const registrarAjuste = useCallback(
    async (ajuste: Partial<AjustesReparto['umbrales']>) => {
      if (esOffline) {
        setColaOffline((prev) => [
          ...prev,
          {
            id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            tipo: 'ajuste',
            payload: ajuste,
            timestamp: Date.now(),
          },
        ]);
        setUmbrales((prev) => ({ ...prev, ...ajuste }));
        return;
      }

      await ajustesRepo.actualizarUmbrales(ajuste);
    },
    [esOffline, ajustesRepo]
  );

  // Sincronizar cola offline
  const sincronizarOffline = useCallback(async () => {
    if (colaOffline.length === 0) return;

    for (const accion of colaOffline) {
      try {
        if (accion.tipo === 'asignar') {
          await repartoRepo.asignarRepartidor(accion.payload.misionId, accion.payload.repartidor);
        } else if (accion.tipo === 'cambiar_estado') {
          await repartoRepo.actualizarEstado(accion.payload.misionId, accion.payload.estado);
        } else if (accion.tipo === 'ajuste') {
          await ajustesRepo.actualizarUmbrales(accion.payload);
        }
      } catch (err) {
        console.warn('[useOperacionRepartidor] Error sincronizando acción offline:', err);
      }
    }

    setColaOffline([]);
  }, [colaOffline, repartoRepo, ajustesRepo]);

  // Abrir en Google Maps
  const abrirEnGoogleMaps = useCallback((ubicacion?: Ubicacion) => {
    if (!ubicacion) return;
    const destino = ubicacion.direccion
      ? encodeURIComponent(ubicacion.direccion)
      : `${ubicacion.lat},${ubicacion.lng}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${destino}`;
    try {
      if (Linking && typeof Linking.openURL === 'function') {
        Linking.openURL(url).catch((err) =>
          console.warn('[useOperacionRepartidor] No se pudo abrir Maps:', err)
        );
      }
    } catch (err) {
      console.warn('[useOperacionRepartidor] Error abriendo URL:', err);
    }
  }, []);

  return {
    loading,
    repartidorActual,
    misiones,
    pedidosDisponibles,
    pedidosAsignados,
    historial,
    colaOffline,
    esOffline,
    setEsOffline,
    umbrales,
    asignarPedido,
    cambiarEstado,
    registrarAjuste,
    sincronizarOffline,
    abrirEnGoogleMaps,
  };
}
