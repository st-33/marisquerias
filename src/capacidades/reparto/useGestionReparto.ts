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
import { validarHorariosReparto, validarUmbralesReparto } from './validarAjustes';

type PropsGestionReparto = {
  db?: Database;
  rutaNegocio?: string;
};

export function useGestionReparto(props?: PropsGestionReparto) {
  const storeRutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const ds = useStore((s: AppStore) => s.dataSources);
  const rutaNegocio = props?.rutaNegocio !== undefined ? props.rutaNegocio : storeRutaNegocio;
  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);
  const ajustesRepo = useMemo(
    () => new RepartoAjustesRepository(db, rutaNegocio),
    [db, rutaNegocio]
  );

  const [umbrales, setUmbrales] = useState<AjustesReparto['umbrales']>({
    stockBajo: 5,
    maxPedidosActivos: 10,
    tiempoMaxEntregaMin: 45,
  });
  const [horarios, setHorarios] = useState<AjustesReparto['horarios']>({
    habilitado: false,
    ventanas: [{ inicio: '09:00', fin: '18:00' }],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rutaNegocio) return;
    const unsubUmbrales = ajustesRepo.suscribirUmbrales((data) => {
      setUmbrales(data);
      setLoading(false);
    });
    const unsubHorarios = ajustesRepo.suscribirHorarios(setHorarios);
    return () => {
      unsubUmbrales();
      unsubHorarios();
    };
  }, [ajustesRepo, rutaNegocio]);

  const guardarUmbrales = async (u: Partial<AjustesReparto['umbrales']>) => {
    await ajustesRepo.actualizarUmbrales(validarUmbralesReparto(u));
  };
  const guardarHorarios = async (h: Partial<AjustesReparto['horarios']>) => {
    await ajustesRepo.actualizarHorarios(validarHorariosReparto(h));
  };
  const toggleHorarios = async () => {
    await ajustesRepo.toggleHorarios(!horarios.habilitado);
  };

  return {
    loading: rutaNegocio ? loading : false,
    umbrales,
    horarios,
    actions: { guardarUmbrales, guardarHorarios, toggleHorarios },
  };
}
