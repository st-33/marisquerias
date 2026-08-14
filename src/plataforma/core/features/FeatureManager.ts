import { useStore } from '../store';

/**
 * 🚩 FEATURE MANAGER (Jefe de Capacidades)
 * Gestor unificado para resolver la habilitación de características (feature flags).
 */

/**
 * Helper para resolver el valor de una feature flag anidada.
 */
export function getFeatureValue(
  features: Record<string, any> | undefined,
  path: string
): boolean | undefined {
  if (!features) return undefined;
  const parts = path.split('.');
  let current: any = features;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
    if (!current) return undefined;

    if (i === parts.length - 1) {
      return typeof current.enabled === 'boolean' ? current.enabled : undefined;
    }

    current = current.features;
  }
  return undefined;
}

/**
 * Hook reactivo para verificar si una feature flag está habilitada.
 */
export function useFeatureFlag(flagPath: string, defaultValue = false): boolean {
  return useStore((state) => {
    const val = getFeatureValue(state.negocio?.features, flagPath);
    return val !== undefined ? val : defaultValue;
  });
}

/**
 * Función síncrona / imperativa para verificar una feature flag fuera de componentes React.
 */
export function isFeatureEnabled(flagPath: string, defaultValue = false): boolean {
  const features = useStore.getState().negocio?.features;
  const val = getFeatureValue(features, flagPath);
  return val !== undefined ? val : defaultValue;
}
