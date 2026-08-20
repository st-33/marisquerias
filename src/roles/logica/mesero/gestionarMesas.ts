/**
 * 🧠 CEREBRO - GESTIÓN DE MESAS
 * Modulo encargado de mapear y orquestar el estado de las mesas
 * SEPARACIÓN SAGRADA: Solo lógica pura
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MesasRepository } from '../../../sistema/persistencia';
import { useMesas } from '../../../sistema/store';
import { createLogger } from '../../../plataforma/core/utils/logger';

const log = createLogger('gestionarMesas');

export type Table = {
  id: string;
  state: 'libre' | 'ocupada' | 'cuenta';
  pedidoActivoId?: string;
  updatedAt?: number;
};

type GestionarMesasProps = {
  mesasRepo: MesasRepository;
};

export function useGestionarMesas({ mesasRepo }: GestionarMesasProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mesasDelStore = useMesas();

  const tables = useMemo(() => {
    const INVALID_IDS = new Set([
      'estado',
      'undefined',
      'null',
      'true',
      'false',
      'length',
      'constructor',
    ]);

    const list: Table[] = Object.entries(mesasDelStore || {})
      .filter(([id, data]) => {
        if (!id || INVALID_IDS.has(id.toLowerCase())) return false;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
        return true;
      })
      .map(([id, data]: [string, any]): Table => {
        const rawState = data?.estado || data?.state || 'libre';
        const mappedState = rawState === 'solicitar_cuenta' ? 'cuenta' : rawState;
        return {
          id,
          state: (mappedState === 'reservada' ? 'ocupada' : mappedState) as
            | 'libre'
            | 'ocupada'
            | 'cuenta',
          pedidoActivoId: data?.pedidoActivoId,
          updatedAt: Number(data?.updatedAt || 0),
        };
      })
      .filter((t) => !!t && !!t.id && !INVALID_IDS.has(t.id.toLowerCase()));

    list.sort((a, b) => {
      const an = /^\d+$/.test(a.id) ? Number(a.id) : NaN;
      const bn = /^\d+$/.test(b.id) ? Number(b.id) : NaN;
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      if (!Number.isNaN(an)) return -1;
      if (!Number.isNaN(bn)) return 1;
      return a.id.localeCompare(b.id);
    });

    return list;
  }, [mesasDelStore]);

  const tablesRef = useRef<Table[]>(tables);
  useEffect(() => {
    tablesRef.current = tables;
    if (tables.length > 0 || Object.keys(mesasDelStore).length > 0) {
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  }, [tables, mesasDelStore]);

  const selectedTablePedidoRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedTable) {
      const selectedTableData = tables.find((t) => t.id === selectedTable);
      if (selectedTableData) {
        selectedTablePedidoRef.current = selectedTableData.pedidoActivoId || null;
      }
    } else {
      selectedTablePedidoRef.current = null;
    }
  }, [selectedTable, tables]);

  const selectTable = useCallback(
    (tableId: string | null) => {
      const invalid = tableId == null || String(tableId).trim() === '' || tableId === 'undefined';
      if (invalid) {
        setSelectedTable(null);
        return;
      }

      const prevTableId = selectedTable;
      if (prevTableId && prevTableId !== tableId) {
        (async () => {
          try {
            const prevTable = tablesRef.current.find((t) => t.id === prevTableId);
            const prevDrafts = await mesasRepo.obtenerItemsBorrador(prevTableId);
            const prevHasPendingItems = Array.isArray(prevDrafts) && prevDrafts.length > 0;

            if (prevTable && !prevHasPendingItems && !prevTable.pedidoActivoId) {
              await mesasRepo.liberar(prevTableId);
            }
          } catch (e) {
            log.warn('Error verificando mesa anterior', { mesaId: prevTableId, e });
          }
        })();
      }

      setSelectedTable(tableId);

      if (tableId) {
        const t = tablesRef.current.find((tt) => tt.id === tableId);
        if (t && (t.state === 'libre' || t.state === 'cuenta')) {
          mesasRepo.actualizarEstado(tableId, 'ocupada').catch((e: any) => {
            log.warn('No se pudo ocupar mesa libre', { mesaId: tableId, e });
          });
        }
      }
    },
    [mesasRepo, selectedTable]
  );

  const occupyTable = useCallback(
    async (tableId: string) => {
      try {
        await mesasRepo.actualizarEstado(tableId, 'ocupada');
        return { success: true };
      } catch (error) {
        log.error('Error al ocupar mesa:', error);
        return { success: false, error: 'Error al ocupar mesa' };
      }
    },
    [mesasRepo]
  );

  const freeTable = useCallback(
    async (tableId: string) => {
      try {
        await mesasRepo.liberar(tableId);
        return { success: true };
      } catch (error) {
        log.error('Error al liberar mesa:', error);
        return { success: false, error: 'Error al liberar mesa' };
      }
    },
    [mesasRepo]
  );

  return {
    tables,
    selectedTable,
    setSelectedTable,
    loading,
    tablesRef,
    selectedTablePedidoRef,
    selectTable,
    occupyTable,
    freeTable,
  };
}
