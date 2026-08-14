import { onValue, ref } from 'firebase/database';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { getRtdb } from '../core/firebase';
import { useStore } from '../core/store';

export interface TenantConfig {
  ticket: {
    header: string;
    footer: string;
    includeQr: boolean;
  };
  features?: Record<string, boolean>;
}

interface TenantConfigContextType {
  config: TenantConfig | null;
  isLoading: boolean;
  error: Error | null;
}

const TenantConfigContext = createContext<TenantConfigContextType | undefined>(undefined);

interface TenantConfigProviderProps {
  children: ReactNode;
  tenantId?: string;
}

export const TenantConfigProvider: React.FC<TenantConfigProviderProps> = ({
  children,
  tenantId: propTenantId,
}) => {
  const sessionTenantPath = useStore((state) => state.sesion.tenantPath);
  const setFeatures = useStore((state) => state.setFeatures);

  const effectivePath = propTenantId ? `tenants/${propTenantId}` : sessionTenantPath;

  // 1. Estados base del proveedor
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!effectivePath);
  const [error, setError] = useState<Error | null>(null);

  // 2. Control de la ruta del render anterior para sincronización limpia
  const [prevPath, setPrevPath] = useState<string | null>(null);

  // 🟢 AJUSTE EN RENDER PHASE: React limpia el estado de una sola pasada antes del commit visual
  if (effectivePath !== prevPath) {
    setPrevPath(effectivePath);
    setConfig(null);
    setIsLoading(!!effectivePath);
    setError(null);
  }

  // Ref para evitar escribir el mismo features al store en bucle
  const lastFeaturesJsonRef = useRef<string>('');

  useEffect(() => {
    if (!effectivePath) {
      return;
    }

    const db = getRtdb();
    const configRef = ref(db, `${effectivePath}/config`);
    const flagsRef = ref(db, `${effectivePath}/flags`);

    const unsubscribeConfig = onValue(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setConfig(snapshot.val() as TenantConfig);
          setError(null);
        } else {
          setConfig({
            ticket: { header: 'Mi Negocio', footer: 'Gracias', includeQr: true },
            features: {},
          });
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('[TenantConfigProvider] Error reading config', err);
        setError(err);
        setIsLoading(false);
      }
    );

    const unsubscribeFlags = onValue(
      flagsRef,
      (snapshot) => {
        const incoming = snapshot.exists() ? snapshot.val() : {};
        const incomingJson = JSON.stringify(incoming);
        // Solo escribir si el contenido real cambió — evita referencias nuevas de {} vacío
        if (incomingJson !== lastFeaturesJsonRef.current) {
          lastFeaturesJsonRef.current = incomingJson;
          setFeatures(incoming);
        }
      },
      (err) => {
        console.error('[TenantConfigProvider] Error reading flags', err);
      }
    );

    return () => {
      unsubscribeConfig();
      unsubscribeFlags();
    };
  }, [effectivePath, setFeatures]);

  return (
    <TenantConfigContext.Provider value={{ config, isLoading, error }}>
      {children}
    </TenantConfigContext.Provider>
  );
};

export const useTenantConfig = (): TenantConfigContextType => {
  const context = useContext(TenantConfigContext);
  if (context === undefined) {
    throw new Error('useTenantConfig must be used within a TenantConfigProvider');
  }
  return context;
};
