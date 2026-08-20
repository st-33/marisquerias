/**
 * 🧠 CEREBRO - ADI-REPART Ajustes
 * Hook para leer y escribir ajustes de reparto
 * SEPARACIÓN SAGRADA: Solo lógica, sin UI
 */

import { useEffect, useMemo, useState } from 'react';
import type { Database } from 'firebase/database';
import {
  RepartoAjustesRepository,
  type AjustesReparto,
} from '../../../sistema/persistencia/reparto-ajustes.repo';

export function useAdminRepart({ db, tenantPath }: { db: Database; tenantPath: string }) {
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

  // Suscripciones
  useEffect(() => {
    if (!tenantPath) {
      return;
    }

    const unsubUmbrales = ajustesRepo.suscribirUmbrales((data) => {
      setUmbrales(data);
      setLoading(false);
    });

    const unsubHorarios = ajustesRepo.suscribirHorarios((data) => {
      setHorarios(data);
    });

    const unsubCostos = ajustesRepo.suscribirCostos((data) => {
      setCostos(data);
    });

    return () => {
      unsubUmbrales();
      unsubHorarios();
      unsubCostos();
    };
  }, [ajustesRepo, tenantPath]);

  // Acciones
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
    actions: {
      guardarUmbrales,
      guardarHorarios,
      guardarCostos,
      toggleHorarios,
    },
  };
}
