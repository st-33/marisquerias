/**
 * 🧠 CEREBRO - GESTIÓN DE MESAS
 * Hook para administrar mesas y su configuración
 * SEPARACIÓN SAGRADA: Solo lógica, sin UI
 */

import type { Database } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import {
  MesasRepository,
  type EstadoMesa,
  type Mesa,
  type MesaLayoutInput,
} from '../../sistema/persistencia';

type UseMesasManagementProps = {
  db: Database;
  tenantPath: string;
};

export type { EstadoMesa, Mesa };

export type MesaConLayout = Mesa & {
  posX: number;
  posY: number;
  shape: 'square' | 'round';
};

const DEFAULT_SHAPE: MesaConLayout['shape'] = 'square';

const normalizeCoordinate = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
};

const mapMesaToLayout = (mesa: Mesa, index: number): MesaConLayout => {
  const fallback = ((index % 6) + 1) / 7; // distribuir aproximado si no hay coordenadas
  return {
    ...mesa,
    posX: normalizeCoordinate(mesa.posX, fallback),
    posY: normalizeCoordinate(mesa.posY, fallback),
    shape: mesa.shape ?? DEFAULT_SHAPE,
  };
};

export function useMesasManagement({ db, tenantPath }: UseMesasManagementProps) {
  const [mesas, setMesas] = useState<Record<string, Mesa>>({});
  const [cantidad, setCantidad] = useState<number>(8);
  const [loading, setLoading] = useState(true);

  const mesasRepo = useMemo(() => new MesasRepository(db, tenantPath), [db, tenantPath]);

  // Suscribirse a mesas y sincronizar cantidad configurada
  useEffect(() => {
    if (!tenantPath) return;
    const unsub = mesasRepo.suscribirTodas((mesasData) => {
      setMesas(mesasData);
      const keys = Object.keys(mesasData || {});
      if (keys.length > 0) {
        const numKeys = keys.map((k) => Number(k)).filter((n) => Number.isFinite(n) && n > 0);
        if (numKeys.length > 0) {
          setCantidad(Math.max(...numKeys));
        } else {
          setCantidad(keys.length);
        }
      } else {
        setCantidad(0);
      }
      setLoading(false);
    });
    return unsub;
  }, [mesasRepo, tenantPath]);

  // Acciones
  const actualizarEstado = async (id: string, estado: EstadoMesa) => {
    try {
      await mesasRepo.actualizarEstado(id, estado);
    } catch (err) {
      console.error('[MesasManagement] Error updating estado:', err);
      throw err;
    }
  };

  const refresh = async () => {
    try {
      const mesasData = await mesasRepo.obtenerTodas();
      setMesas(mesasData);
    } catch (err) {
      console.error('[MesasManagement] Error refreshing mesas:', err);
      throw err;
    }
  };

  const liberarMesa = async (id: string) => {
    try {
      await mesasRepo.liberar(id);
    } catch (err) {
      console.error('[MesasManagement] Error liberating mesa:', err);
      throw err;
    }
  };

  const asignarPedido = async (id: string, pedidoId: string) => {
    try {
      await mesasRepo.asignarPedido(id, pedidoId);
    } catch (err) {
      console.error('[MesasManagement] Error assigning pedido:', err);
      throw err;
    }
  };

  const solicitarCuenta = async (id: string) => {
    try {
      await mesasRepo.solicitarCuenta(id);
    } catch (err) {
      console.error('[MesasManagement] Error requesting cuenta:', err);
      throw err;
    }
  };

  const aplicarCantidad = async (nuevaCantidad: number) => {
    if (nuevaCantidad < 0 || !Number.isFinite(nuevaCantidad)) {
      throw new Error('Cantidad inválida');
    }

    try {
      // Crear mesas faltantes
      for (let i = 1; i <= nuevaCantidad; i++) {
        const id = String(i);
        if (!mesas[id]) {
          await mesasRepo.actualizarEstado(id, 'libre');
        }
      }

      // Identificar mesas bloqueadas (no libres) y eliminar las libres sobrantes
      const mesasBloqueadas: string[] = [];

      for (const [id, mesa] of Object.entries(mesas)) {
        const num = Number(id);
        if (Number.isFinite(num) && num > nuevaCantidad) {
          if (mesa.estado !== 'libre') {
            mesasBloqueadas.push(id);
          } else {
            // Eliminar mesa libre sobrante de Firebase
            await mesasRepo.eliminar(id);
          }
        }
      }

      setCantidad(nuevaCantidad);

      return {
        bloqueadas: mesasBloqueadas,
      };
    } catch (err) {
      console.error('[MesasManagement] Error applying cantidad:', err);
      throw err;
    }
  };

  // Helpers
  const mesasArray = useMemo(() => {
    return Object.values(mesas).map((mesa, index) => mapMesaToLayout(mesa, index));
  }, [mesas]);

  const resumen = useMemo(() => {
    const libres = mesasArray.filter((m) => m.estado === 'libre').length;
    const ocupadas = mesasArray.filter((m) => m.estado === 'ocupada').length;
    const solicitarCuenta = mesasArray.filter((m) => m.estado === 'solicitar_cuenta').length;
    return { libres, ocupadas, solicitarCuenta, total: mesasArray.length };
  }, [mesasArray]);

  const getMesaById = (id: string): Mesa | undefined => {
    return mesas[id];
  };

  return {
    // Estado
    mesas: mesasArray,
    cantidad,
    resumen,
    loading,

    // Acciones
    actions: {
      actualizarEstado,
      liberarMesa,
      asignarPedido,
      solicitarCuenta,
      aplicarCantidad,
      refresh,
      guardarLayout: async (layout: MesaLayoutInput[]) => {
        try {
          await mesasRepo.guardarLayout(layout);

          setMesas((prev) => {
            const next = { ...prev };
            layout.forEach(({ id, posX, posY, shape }) => {
              const current = next[id];
              if (current) {
                next[id] = {
                  ...current,
                  posX,
                  posY,
                  shape: shape ?? current.shape,
                  updatedAt: Date.now(),
                };
              }
            });
            return next;
          });
        } catch (err) {
          console.error('[MesasManagement] Error saving layout:', err);
          throw err;
        }
      },
    },

    // Helpers
    getMesaById,
  };
}
