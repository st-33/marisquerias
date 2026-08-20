import { router } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../../../src/sistema/store';
import type { FabItem } from '../../../src/plataforma/core/types/contratos';

export default function Admin() {
  const features = useStore((s) => s.negocio.features);

  // ✅ FAB se limpia automáticamente con el sistema context-aware

  const navEntries = useMemo(() => {
    const entries: { key: string; label: string; icon: React.ReactNode; route: string }[] = [];
    const has = (k: string) => Boolean((features as any)?.[k]?.enabled);

    if (has('admin_dashboard')) {
      entries.push({
        key: 'metricas',
        label: 'Métricas y Datos',
        icon: <Text style={{ color: 'white', fontSize: 22 }}>📊</Text>,
        route: '/_role/admin/dashboard',
      });
    }
    if (has('admin_menu')) {
      entries.push({
        key: 'menu',
        label: 'Menú',
        icon: <Text style={{ color: 'white', fontSize: 20 }}>🍽️</Text>,
        route: '/_role/admin/menu',
      });
    }
    if (has('admin_inventory')) {
      entries.push({
        key: 'inventario',
        label: 'Inventario',
        icon: <Text style={{ color: 'white', fontSize: 20 }}>📦</Text>,
        route: '/_role/admin/inventory',
      });
    }
    if (has('admin_tables')) {
      entries.push({
        key: 'mesas',
        label: 'Mesas',
        icon: <Text style={{ color: 'white', fontSize: 20 }}>🪑</Text>,
        route: '/_role/admin/tables',
      });
    }
    if (has('admin_devices')) {
      entries.push({
        key: 'dispositivos',
        label: 'Dispositivos',
        icon: <Text style={{ color: 'white', fontSize: 20 }}>🖨️</Text>,
        route: '/_role/admin/devices',
      });
    }
    if (has('admin_repart')) {
      entries.push({
        key: 'repart',
        label: 'ADI Repart',
        icon: <Text style={{ color: 'white', fontSize: 20 }}>🚚</Text>,
        route: '/_role/admin/repart',
      });
    }

    if (entries.length === 0) {
      entries.push({
        key: 'metricas',
        label: 'Métricas y Datos',
        icon: <Text style={{ color: 'white', fontSize: 22 }}>📊</Text>,
        route: '/_role/admin/dashboard',
      });
    }

    return entries;
  }, [features]);

  const navItems = useMemo<FabItem[]>(
    () =>
      navEntries.map(({ key, label, icon, route }) => ({
        key,
        label,
        icon,
        onPress: () => router.push(route),
      })),
    [navEntries]
  );

  const initialRoute = navEntries[0]?.route ?? null;

  useEffect(() => {
    if (!initialRoute) return;
    router.replace(initialRoute);
  }, [initialRoute]);

  if (navItems.length === 0) {
    return <View style={{ flex: 1, backgroundColor: '#0f172a' }} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text style={{ color: '#94a3b8', fontSize: 16, textAlign: 'center', lineHeight: 22 }}>
        Cargando...
      </Text>
    </View>
  );
}
