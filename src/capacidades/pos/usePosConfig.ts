import { Database, onValue, ref, set } from 'firebase/database';
import { useEffect, useState, useMemo } from 'react';
import { useStore, type AppStore } from '../../plataforma/core/store';
import { getRtdb } from '../../plataforma/core/firebase';

export interface PosConfig {
  allowNegativeStock: boolean;
  requirePasskeyForVoid: boolean;
  showImagesInPos: boolean;
  quickCashButtons: boolean;
}

const DEFAULT_CONFIG: PosConfig = {
  allowNegativeStock: false,
  requirePasskeyForVoid: true,
  showImagesInPos: true,
  quickCashButtons: true,
};

export function usePosConfig(customDb?: Database, customTenantPath?: string) {
  const storeTenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s: AppStore) => s.dataSources);

  const tenantPath = customTenantPath !== undefined ? customTenantPath : storeTenantPath;

  const db = useMemo(() => {
    if (customDb) return customDb;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [customDb, ds?.operacionUrl]);

  const [config, setConfig] = useState<PosConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantPath) return;
    const configRef = ref(db, `${tenantPath}/config/pos`);

    const unsub = onValue(configRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setConfig({ ...DEFAULT_CONFIG, ...val });
      } else {
        // Initialize if empty
        set(configRef, DEFAULT_CONFIG);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [db, tenantPath]);

  const updateConfig = async (newConfig: Partial<PosConfig>) => {
    if (!tenantPath) return;
    const configRef = ref(db, `${tenantPath}/config/pos`);
    await set(configRef, { ...config, ...newConfig });
  };

  return { config, loading, updateConfig };
}
