import { useStore } from '../../sistema/store';

/** Resuelve una feature anidada del tenant. */
export function getFeatureValue(
  features: Record<string, any> | undefined,
  path: string
): boolean | undefined {
  if (!features) return undefined;
  const parts = path.split('.');
  let current: any = features;

  for (let i = 0; i < parts.length; i += 1) {
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

/** Hook reactivo para verificar una feature flag. */
export function useFeatureFlag(flagPath: string, defaultValue = false): boolean {
  return useStore((state) => {
    const value = getFeatureValue(state.negocio?.features, flagPath);
    return value !== undefined ? value : defaultValue;
  });
}

/** Verificación imperativa fuera de componentes React. */
export function isFeatureEnabled(flagPath: string, defaultValue = false): boolean {
  const features = useStore.getState().negocio?.features;
  const value = getFeatureValue(features, flagPath);
  return value !== undefined ? value : defaultValue;
}
