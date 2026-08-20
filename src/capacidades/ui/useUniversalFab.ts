import type { Database } from 'firebase/database';
import { off, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import type { FabItem } from './useFabRadial';

type FabActionData = Omit<FabItem, 'onPress'> & {
  roles: string[];
  action: string;
};

export function useUniversalFab(db: Database, tenantPath: string, userRole: string) {
  const [actions, setActions] = useState<FabItem[]>([]);

  useEffect(() => {
    if (!tenantPath) return;

    const actionsRef = ref(db, `${tenantPath}/ajustes/features/fab-actions`);
    const callback = onValue(actionsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, FabActionData> | null;
      if (!data) {
        setActions([]);
        return;
      }

      const filtered: FabItem[] = Object.entries(data)
        .filter(([, item]) => {
          if (!item) return false;
          if (!item.roles || item.roles.length === 0) return true;
          return item.roles.includes(userRole);
        })
        .map(([key, item]) => ({
          key,
          label: item.label,
          icon: item.icon,
          enabled: item.enabled !== false,
          action: item.action,
          onPress: () => {},
        }));

      setActions(filtered);
    });

    return () => off(actionsRef, 'value', callback as any);
  }, [db, tenantPath, userRole]);

  return actions;
}
