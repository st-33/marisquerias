import { onValue, ref } from 'firebase/database';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { getRtdb } from '../firebase';
import { useStore } from '../store';

export interface ConfiguracionTenant {
  ticket: {
    header: string;
    footer: string;
    includeQr: boolean;
  };
  features?: Record<string, boolean>;
}

interface ConfiguracionTenantContextType {
  config: ConfiguracionTenant | null;
  isLoading: boolean;
  error: Error | null;
}

const ConfiguracionTenantContext = createContext<ConfiguracionTenantContextType | undefined>(undefined);

interface ProveedorConfiguracionTenantProps {
  children: ReactNode;
  tenantId?: string;
}

export const ProveedorConfiguracionTenant: React.FC<ProveedorConfiguracionTenantProps> = ({
  children,
  tenantId: propTenantId,
}) => {
  const sessionTenantPath = useStore((state) => state.sesion.tenantPath);
  const setFeatures = useStore((state) => state.setFeatures);

  const effectivePath = propTenantId ? `tenants/${propTenantId}` : sessionTenantPath;

  // 1. Estados base del proveedor
  const [config, setConfig] = useState<ConfiguracionTenant | null>(null);
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
          setConfig(snapshot.val() as ConfiguracionTenant);
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
        console.error('[ProveedorConfiguracionTenant] Error reading config', err);
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
        console.error('[ProveedorConfiguracionTenant] Error reading flags', err);
      }
    );

    return () => {
      unsubscribeConfig();
      unsubscribeFlags();
    };
  }, [effectivePath, setFeatures]);

  return (
    <ConfiguracionTenantContext.Provider value={{ config, isLoading, error }}>
      {children}
    </ConfiguracionTenantContext.Provider>
  );
};

export const useConfiguracionTenant = (): ConfiguracionTenantContextType => {
  const context = useContext(ConfiguracionTenantContext);
  if (context === undefined) {
    throw new Error('useConfiguracionTenant must be used within a ProveedorConfiguracionTenant');
  }
  return context;
};
