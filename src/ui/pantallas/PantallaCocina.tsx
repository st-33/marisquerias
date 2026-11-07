/**
 * 🍳 COCINA SCREEN (KDS - Kitchen Display System)
 * Componente visual puro para comandas de alimentos/bebidas + acceso discreto al Libro de Platillos y Producción.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLibroPlatillosYProduccion } from '../../capacidades/cocina/useLibroPlatillosYProduccion';
import { useNotificaciones as useNotifications } from '../../compartido/hooks/useNotificaciones';
import { useNotificacionesAlmacen as useStoreNotifications } from '../../compartido/hooks/useNotificacionesAlmacen';
import { useAppTheme } from '../../compartido/temas';
import { useLogicaCocina } from '../../roles/logica/cocina';
import { filtrarComandasPorEstacion } from '../../roles/logica/cocina/filtrosKDS';
import { logger } from '../../sistema/monitoreo';
import { useProductos, useStore } from '../../sistema/store';
import { TarjetaComanda } from '../bloques/TarjetaComanda';
import { ModalLibroYProduccionCocina } from './ModalLibroYProduccionCocina';

export interface PantallaCocinaProps {
  estacion?: string;
}

export function PantallaCocina({ estacion }: PantallaCocinaProps = {}) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const params = useLocalSearchParams<{ vista?: string }>();

  const productos = useProductos();
  const inventoryAutoDiscount =
    useStore((s) => s.negocio.features?.inventory_auto_discount?.enabled) !== false;

  const { platillos, lotesActivos } = useLibroPlatillosYProduccion();
  const [modalLibroAbierto, setModalLibroAbierto] = useState(false);
  const [pestanaLibro, setPestanaLibro] = useState<'libro' | 'produccion'>('libro');

  useEffect(() => {
    if (params?.vista === 'libro') {
      setPestanaLibro('libro');
      setModalLibroAbierto(true);
    } else if (params?.vista === 'produccion') {
      setPestanaLibro('produccion');
      setModalLibroAbierto(true);
    }
  }, [params?.vista]);

  // 🔔 Sistema de notificaciones (solo audio en cocina)
  const { notify } = useNotifications();

  // 👂 Detectar cambios en store (sin crear listeners adicionales)
  useStoreNotifications({
    enabled: true,
    onNotification: React.useCallback(
      ({ mesaId, type }) => {
        logger.debug('[CocinaScreen.tsx]', '🔔 Notificación', { mesaId, type });
        notify({ type, mesaId }, 'cocina');
      },
      [notify]
    ),
  });

  // 🧠 CEREBRO: Hook de lógica pura (usa repositorios)
  const { orders, stats, loading, actions } = useLogicaCocina({
    urgentThresholdMinutes: 15,
    autoDescuentoInventario: inventoryAutoDiscount,
  });

  // Filtrado por estación si está definida
  const comandasFiltradas = useMemo(
    () => filtrarComandasPorEstacion(orders, productos, estacion),
    [orders, productos, estacion]
  );

  const statsFiltradas = useMemo(() => {
    if (!estacion) return stats;
    const total = comandasFiltradas.length;
    const urgentes = comandasFiltradas.filter((o) => o.esUrgente).length;
    const itemsPendientes = comandasFiltradas.reduce((acc, o) => acc + o.itemsPendientes, 0);
    const itemsListos = comandasFiltradas.reduce((acc, o) => acc + o.itemsListos, 0);
    return { total, urgentes, itemsPendientes, itemsListos };
  }, [comandasFiltradas, stats, estacion]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: c.textSecondary }]}>Cargando cocina...</Text>
        </View>
      </View>
    );
  }

  const tituloHeader = estacion
    ? `Cocina — ${estacion.charAt(0).toUpperCase() + estacion.slice(1)}`
    : 'Cocina';

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header con estadísticas y acceso discreto al Libro de Platillos y Producción */}
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver a selección de roles"
              onPress={() => router.replace('/_role/roles')}
              style={({ pressed }) => [
                styles.rolesBtn,
                { borderColor: c.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="chevron-back" size={16} color={c.textSecondary} />
              <Text style={[styles.rolesBtnText, { color: c.textSecondary }]}>ROLES</Text>
            </Pressable>
            <Ionicons name="restaurant" size={24} color={c.primary} />
            <View>
              <Text style={[styles.title, { color: c.text }]}>{tituloHeader}</Text>
            </View>
          </View>

          {/* Acceso discreto a Libro de Platillos y Producción */}
          <View style={styles.headerActionsRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Libro de Platillos"
              onPress={() => {
                setPestanaLibro('libro');
                setModalLibroAbierto(true);
              }}
              style={[
                styles.bookBtn,
                { backgroundColor: c.background, borderColor: c.primary },
              ]}
            >
              <Ionicons name="book-outline" size={17} color={c.primary} />
              <Text style={[styles.bookBtnText, { color: c.text }]}>
                Libro de Platillos ({platillos.length})
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir Producción de Cocina"
              onPress={() => {
                setPestanaLibro('produccion');
                setModalLibroAbierto(true);
              }}
              style={[
                styles.bookBtn,
                {
                  backgroundColor:
                    lotesActivos.length > 0 ? `${c.warning}22` : c.background,
                  borderColor: lotesActivos.length > 0 ? c.warning : c.border,
                },
              ]}
            >
              <Ionicons
                name="flame-outline"
                size={17}
                color={lotesActivos.length > 0 ? c.warning : c.textSecondary}
              />
              <Text style={[styles.bookBtnText, { color: c.text }]}>
                Producción{lotesActivos.length > 0 ? ` (${lotesActivos.length})` : ''}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: c.background }]}>
            <Text style={[styles.statValue, { color: c.text }]}>{statsFiltradas.total}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Órdenes</Text>
          </View>
          {statsFiltradas.urgentes > 0 && (
            <View style={[styles.statBadge, styles.statBadgeUrgent]}>
              <Ionicons name="alert-circle" size={16} color="#ffffff" />
              <Text style={styles.statValue}>{statsFiltradas.urgentes}</Text>
              <Text style={styles.statLabel}>Urgentes</Text>
            </View>
          )}
          <View style={[styles.statBadge, { backgroundColor: c.background }]}>
            <Text style={[styles.statValue, { color: c.text }]}>
              {statsFiltradas.itemsPendientes}
            </Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>Pendientes</Text>
          </View>
        </View>
      </View>

      {/* Tablero Kanban */}
      <ScrollView style={styles.board} contentContainerStyle={styles.boardContent}>
        {comandasFiltradas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={64} color={c.textMuted} />
            <Text style={[styles.emptyStateText, { color: c.text }]}>Sin órdenes activas</Text>
            <Text style={[styles.emptyStateSubtext, { color: c.textSecondary }]}>
              {estacion
                ? `No hay comandas pendientes para la estación ${estacion}`
                : 'Las comandas aparecerán aquí cuando se envíen desde Mesero. Puedes consultar o editar el Libro de Platillos y registrar lotes de Producción desde el botón superior.'}
            </Text>
          </View>
        ) : (
          comandasFiltradas.map((order) => (
            <TarjetaComanda
              key={order.id}
              order={order}
              onStartItem={(itemId) => actions.startItem(order.id, itemId)}
              onFinishItem={(itemId) => actions.finishItem(order.id, itemId)}
              onFinishOrder={() => actions.finishOrder(order.id)}
            />
          ))
        )}
      </ScrollView>

      <ModalLibroYProduccionCocina
        visible={modalLibroAbierto}
        pestanaInicial={pestanaLibro}
        onClose={() => setModalLibroAbierto(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rolesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    marginRight: 4,
  },
  rolesBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statBadgeUrgent: {
    backgroundColor: '#dc2626',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  board: {
    flex: 1,
  },
  boardContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    maxWidth: 560,
  },
});
