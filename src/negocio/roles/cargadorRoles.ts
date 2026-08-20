/**
 * 🧠 CEREBRO: Cargador de Roles y Features
 * Hook de lógica pura para cargar características/features del tenant
 * SEPARACIÓN SAGRADA: Solo lógica, cero UI
 */

import { useCallback, useState } from 'react';
import type { Database } from 'firebase/database';
import { TenantRepository } from '../../sistema/persistencia/tenant.repo';
import {
  normalizarCaracteristicas,
  type CaracteristicasPlanas,
} from '../../sistema/utilidades/caracteristicas';
import type { Feature } from '../../sistema/tipos/contratos';

type PropsCargadorRoles = {
  db: Database;
  tenantPath: string;
  onFeaturesLoaded?: (features: Record<string, Feature>) => void;
};

/**
 * Adapta features planas (CaracteristicasPlanas) al formato normalizado del store
 */
function adaptarCaracteristicas(flat: CaracteristicasPlanas): Record<string, Feature> {
  const adapted: Record<string, Feature> = {};
  for (const [key, value] of Object.entries(flat)) {
    adapted[key] = { enabled: value };
  }
  return adapted;
}

export function useCargadorRoles({ db, tenantPath, onFeaturesLoaded }: PropsCargadorRoles) {
  const tenantRepo = useState(() => new TenantRepository(db, tenantPath))[0];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar features del tenant (solo si no están ya cargadas)
   */
  const loadFeatures = useCallback(
    async (force = false) => {
      if (!tenantPath) {
        setError('No hay tenantPath');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Asegurar bootstrap primero
        await tenantRepo.asegurarBootstrap();

        // Obtener características o features
        const rawFeat = await tenantRepo.obtenerCaracteristicasOFeatures();

        if (!rawFeat) {
          setError('No se encontraron características ni features');
          setLoading(false);
          return;
        }

        // Normalizar a formato plano
        const flat = normalizarCaracteristicas(rawFeat);

        // Adaptar al formato del store
        const adapted = adaptarCaracteristicas(flat);

        // Notificar al callback si está disponible
        onFeaturesLoaded?.(adapted);

        setLoading(false);
      } catch (err: any) {
        console.error('[useCargadorRoles] Error cargando features:', err);
        setError(err?.message || 'Error desconocido');
        setLoading(false);
      }
    },
    [tenantPath, tenantRepo, onFeaturesLoaded]
  );

  return {
    loading,
    error,
    loadFeatures,
  };
}
