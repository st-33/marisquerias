/**
 * 🎯 FAB DE NAVEGACIÓN ADMINISTRATIVA (ADMIN RADIAL)
 *
 * Módulo de navegación exclusivo para el rol Administrador.
 * Gestiona el intercambio dinámico de íconos: el módulo activo toma la burbuja principal
 * y los demás módulos (junto con "Salir a Roles") se despliegan en el abanico radial.
 */

import React, { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AccionRadialFlotante } from '../../bloques/AccionRadialFlotante';
import type { FabItem } from '../../../sistema/tipos/contratos';
import { useStore } from '../../../sistema/store';

export interface FabNavegacionAdminProps {
  pathname: string;
}

import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export function FabNavegacionAdmin({ pathname }: FabNavegacionAdminProps) {
  const router = useRouter();
  const estadoEncendido = useStore((s) => s.estadoEncendido);
  const caps = estadoEncendido?.activos?.capacidades || estadoEncendido?.capacidades_activas || [];

  const activeKey = useMemo(() => {
    if (pathname.startsWith('/_role/admin/menu')) return 'menu';
    if (pathname.startsWith('/_role/admin/inventario')) return 'inventario';
    if (pathname.startsWith('/_role/admin/mesas')) return 'mesas';
    if (pathname.startsWith('/_role/admin/dispositivos')) return 'dispositivos';
    return 'metricas';
  }, [pathname]);

  const items = useMemo<FabItem[]>(() => {
    const list: FabItem[] = [
      {
        key: 'metricas',
        label: 'Métricas y Datos',
        icon: <Ionicons name="stats-chart" size={26} color="#FFFFFF" />,
        onPress: () => {
          if (pathname !== '/_role/admin/dashboard') {
            router.push('/_role/admin/dashboard');
          }
        },
      },
    ];

    // Módulo Menú
    list.push({
      key: 'menu',
      label: 'Menú',
      icon: <Ionicons name="restaurant" size={24} color="#FFFFFF" />,
      onPress: () => {
        if (!pathname.startsWith('/_role/admin/menu')) {
          router.push('/_role/admin/menu');
        }
      },
    });

    // Módulo Inventario (si no está explícitamente apagado)
    if (!estadoEncendido || caps.length === 0 || caps.includes('inventario')) {
      list.push({
        key: 'inventario',
        label: 'Inventario',
        icon: <Ionicons name="cube" size={22} color="#FFFFFF" />,
        onPress: () => {
          if (!pathname.startsWith('/_role/admin/inventario')) {
            router.push('/_role/admin/inventario');
          }
        },
      });
    }

    // Módulo Mesas
    if (!estadoEncendido || caps.length === 0 || caps.includes('control_mesas')) {
      list.push({
        key: 'mesas',
        label: 'Mesas',
        icon: <Ionicons name="grid" size={22} color="#FFFFFF" />,
        onPress: () => {
          if (!pathname.startsWith('/_role/admin/mesas')) {
            router.push('/_role/admin/mesas');
          }
        },
      });
    }

    // Módulo de Dispositivos (Impresoras, Básculas, Hardware)
    list.push({
      key: 'dispositivos',
      label: 'Dispositivos',
      icon: <Ionicons name="hardware-chip" size={22} color="#FFFFFF" />,
      onPress: () => {
        if (!pathname.startsWith('/_role/admin/dispositivos')) {
          router.push('/_role/admin/dispositivos');
        }
      },
    });

    // Acción permanente: Salir al selector de roles
    list.push({
      key: 'roles',
      label: 'Salir a Roles',
      icon: <Ionicons name="people" size={22} color="#FFFFFF" />,
      onPress: () => {
        router.replace('/_role/roles');
      },
    });

    return list;
  }, [pathname, caps, estadoEncendido, router]);

  return (
    <>
      <View style={styles.regresoContainer} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Salir al selector de roles"
          onPress={() => router.replace('/_role/roles')}
          style={({ pressed }) => [
            styles.regresoButton,
            pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="arrow-back" size={16} color="#94A3B8" />
          <Text style={styles.regresoText}>Roles</Text>
        </Pressable>
      </View>
      <AccionRadialFlotante
        key={`admin-nav:${activeKey}`}
        items={items}
        initialKey={activeKey}
        position="bottom-right"
      />
    </>
  );
}

const styles = StyleSheet.create({
  regresoContainer: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    zIndex: 9999,
  },
  regresoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  regresoText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export default FabNavegacionAdmin;
