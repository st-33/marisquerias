/**
 * 🧠 CEREBRO: Gestión de Ventas de Mostrador (Admin)
 * Hook de lógica pura para escuchar el registro financiero diario.
 * Las salidas de inventario permanecen separadas de las ventas.
 */

import { useEffect, useState, useMemo } from 'react';
import type { Database } from 'firebase/database';
import { useStore, type AppStore } from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import {
  RegistroVentasRepository,
  type RegistroVenta,
} from '../../sistema/persistencia/registroVentas.repo';

type UseVentaCrudoAdminProps = {
  db?: Database;
  rutaNegocio?: string;
};

export type RegistroVentaMostrador = RegistroVenta & {
  id: string;
};

export function useVentaCrudoAdmin(props?: UseVentaCrudoAdminProps) {
  const storeRutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const ds = useStore((s: AppStore) => s.dataSources);

  const rutaNegocio = props?.rutaNegocio !== undefined ? props.rutaNegocio : storeRutaNegocio;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  const [sales, setSales] = useState<RegistroVentaMostrador[]>([]);
  const [loading, setLoading] = useState(true);
  const registroVentasRepo = useMemo(
    () => new RegistroVentasRepository(db, rutaNegocio),
    [db, rutaNegocio]
  );

  useEffect(() => {
    if (!rutaNegocio) {
      setTimeout(() => {
        setSales([]);
        setLoading(false);
      }, 0);
      return;
    }

    setTimeout(() => {
      setLoading(true);
    }, 0);

    const unsub = registroVentasRepo.suscribirDia(Date.now(), (registros) => {
      const list = Object.entries(registros)
        .map(([id, registro]) => ({ ...registro, id }))
        .filter(
          (registro): registro is RegistroVentaMostrador =>
            registro.origen === 'mostrador' &&
            registro.canal === 'mostrador' &&
            registro.estado === 'pagada'
        )
        .sort((a, b) => b.timestamp - a.timestamp);
      setSales(list);
      setLoading(false);
    });

    return unsub;
  }, [registroVentasRepo, rutaNegocio]);

  return {
    sales,
    loading,
  };
}
