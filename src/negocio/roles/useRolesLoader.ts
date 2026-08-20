/**
 * 🧠 CEREBRO: Cargador de Roles y Features
 * Hook de lógica pura para cargar características/features del tenant
 * SEPARACIÓN SAGRADA: Solo lógica, cero UI
 */

import { useEffect, useState, useCallback } from 'react';
import type { Database } from 'firebase/database';
import { TenantRepository } from '../../plataforma/base/_persistencia/tenant.repo';
import { normalizeFeatures, type FlatFeatures } from '../../plataforma/core/utils/features';
import type { Feature } from '../../plataforma/core/types/contratos';

type UseRolesLoaderProps = {
  db: Database;
  tenantPath: string;
  onFeaturesLoaded?: (features: Record<string, Feature>) => void;
};

/**
 * Adapta features planas (FlatFeatures) al formato normalizado del store
 */
function adaptFeatures(flat: FlatFeatures): Record<string, Feature> {
  const adapted: Record<string, Feature> = {};
  for (const [key, value] of Object.entries(flat)) {
    adapted[key] = { enabled: value };
  }
  return adapted;
}

export function useRolesLoader({ db, tenantPath, onFeaturesLoaded }: UseRolesLoaderProps) {
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
        const flat = normalizeFeatures(rawFeat);

        // Adaptar al formato del store
        const adapted = adaptFeatures(flat);

        // Notificar al callback si está disponible
        onFeaturesLoaded?.(adapted);

        setLoading(false);
      } catch (err: any) {
        console.error('[useRolesLoader] Error cargando features:', err);
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
