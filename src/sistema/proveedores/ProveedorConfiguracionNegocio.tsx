import { onValue, ref } from 'firebase/database';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { getRtdb } from '../firebase';
import { useStore } from '../store';

export interface ConfiguracionNegocio {
  ticket: {
    header: string;
    footer: string;
    includeQr: boolean;
  };
  features?: Record<string, boolean>;
}

interface ConfiguracionNegocioContextType {
  config: ConfiguracionNegocio | null;
  isLoading: boolean;
  error: Error | null;
}

const ConfiguracionNegocioContext = createContext<ConfiguracionNegocioContextType | undefined>(
  undefined
);

interface ProveedorConfiguracionNegocioProps {
  children: ReactNode;
  negocioId?: string;
}

export const ProveedorConfiguracionNegocio: React.FC<ProveedorConfiguracionNegocioProps> = ({
  children,
  negocioId: propNegocioId,
}) => {
  const sessionRutaNegocio = useStore((state) => state.sesion.rutaNegocio);
  const setFeatures = useStore((state) => state.setFeatures);

  const effectivePath = propNegocioId ? `negocios/${propNegocioId}` : sessionRutaNegocio;

  // 1. Estados base del proveedor
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null);
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
          setConfig(snapshot.val() as ConfiguracionNegocio);
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
        console.error('[ProveedorConfiguracionNegocio] Error reading config', err);
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
        console.error('[ProveedorConfiguracionNegocio] Error reading flags', err);
      }
    );

    return () => {
      unsubscribeConfig();
      unsubscribeFlags();
    };
  }, [effectivePath, setFeatures]);

  return (
    <ConfiguracionNegocioContext.Provider value={{ config, isLoading, error }}>
      {children}
    </ConfiguracionNegocioContext.Provider>
  );
};

export const useConfiguracionNegocio = (): ConfiguracionNegocioContextType => {
  const context = useContext(ConfiguracionNegocioContext);
  if (context === undefined) {
    throw new Error('useConfiguracionNegocio must be used within a ProveedorConfiguracionNegocio');
  }
  return context;
};
