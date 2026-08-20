/**
 * 🧠 CEREBRO: Gestión de Ventas de Crudo (Admin)
 * Hook de lógica pura para administrar y escuchar ventas
 * SEPARACIÓN SAGRADA: Solo lógica, cero UI
 */

import { useEffect, useState, useMemo } from 'react';
import type { Database } from 'firebase/database';
import { useStore, type AppStore } from '../../plataforma/core/store';
import { getRtdb } from '../../plataforma/core/firebase';
import { InventoryV2Repository } from '../../plataforma/base/_persistencia/inventory.v2.repo';

type UseVentaCrudoAdminProps = {
  db?: Database;
  tenantPath?: string;
};

export function useVentaCrudoAdmin(props?: UseVentaCrudoAdminProps) {
  const storeTenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s: AppStore) => s.dataSources);

  const tenantPath = props?.tenantPath !== undefined ? props.tenantPath : storeTenantPath;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const inventoryRepo = useMemo(() => new InventoryV2Repository(db, tenantPath), [db, tenantPath]);

  useEffect(() => {
    if (!tenantPath) {
      setTimeout(() => {
        setLoading(false);
      }, 0);
      return;
    }
    setTimeout(() => {
      setLoading(true);
    }, 0);

    const unsub = inventoryRepo.suscribirMovimientosRecientes(50, (movements) => {
      // Filter for 'salida' (Sales) and sort desc
      const list = Object.entries(movements)
        .map(([k, v]: any) => ({ ...v, id: k }))
        .filter((m: any) => m.tipo === 'salida' && m.razon === 'Venta Mostrador')
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      setSales(list);
      setLoading(false);
    });

    return unsub;
  }, [inventoryRepo, tenantPath]);

  return {
    sales,
    loading,
  };
}
