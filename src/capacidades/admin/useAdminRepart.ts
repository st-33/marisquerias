/**
 * Ajustes operativos de ADI-REPART para el rol administrador.
 * Capacidad de administración: sin UI ni acceso directo a rutas RTDB.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Database } from 'firebase/database';
import { useStore, type AppStore } from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import {
  RepartoAjustesRepository,
  type AjustesReparto,
} from '../../sistema/persistencia/reparto-ajustes.repo';

type UseAdminRepartProps = {
  db?: Database;
  tenantPath?: string;
};

export function useAdminRepart(props?: UseAdminRepartProps) {
  const storeTenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s: AppStore) => s.dataSources);
  const tenantPath = props?.tenantPath !== undefined ? props.tenantPath : storeTenantPath;
  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);
  const ajustesRepo = useMemo(() => new RepartoAjustesRepository(db, tenantPath), [db, tenantPath]);

  const [umbrales, setUmbrales] = useState<AjustesReparto['umbrales']>({
    stockBajo: 5,
    maxPedidosActivos: 10,
    tiempoMaxEntregaMin: 45,
  });
  const [horarios, setHorarios] = useState<AjustesReparto['horarios']>({
    habilitado: false,
    ventanas: [{ inicio: '09:00', fin: '18:00' }],
  });
  const [costos, setCostos] = useState<AjustesReparto['costos']>({
    base: 20,
    porKm: 5,
    minimo: 20,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantPath) return;
    const unsubUmbrales = ajustesRepo.suscribirUmbrales((data) => {
      setUmbrales(data);
      setLoading(false);
    });
    const unsubHorarios = ajustesRepo.suscribirHorarios(setHorarios);
    const unsubCostos = ajustesRepo.suscribirCostos(setCostos);
    return () => {
      unsubUmbrales();
      unsubHorarios();
      unsubCostos();
    };
  }, [ajustesRepo, tenantPath]);

  const guardarUmbrales = async (u: Partial<AjustesReparto['umbrales']>) => {
    await ajustesRepo.actualizarUmbrales(u);
  };
  const guardarHorarios = async (h: Partial<AjustesReparto['horarios']>) => {
    await ajustesRepo.actualizarHorarios(h);
  };
  const guardarCostos = async (c: Partial<AjustesReparto['costos']>) => {
    await ajustesRepo.actualizarCostos(c);
  };
  const toggleHorarios = async () => {
    await ajustesRepo.toggleHorarios(!horarios.habilitado);
  };

  return {
    loading: tenantPath ? loading : false,
    umbrales,
    horarios,
    costos,
    actions: { guardarUmbrales, guardarHorarios, guardarCostos, toggleHorarios },
  };
}
