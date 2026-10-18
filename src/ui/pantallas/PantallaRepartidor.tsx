/**
 * 🚚 PANTALLA REPARTIDOR — MÓVIL STANDALONE
 *
 * Pantalla ultra-optimizada para uso con una mano en dispositivos móviles:
 * - Tarjetas de pedido grandes y legibles al exterior
 * - Botones táctiles diferenciados: "Aceptar", "En camino", "Entregado", "Problema"
 * - Acceso directo a Google Maps con dirección del cliente
 * - Pestañas de navegación: Asignados / Disponibles / Historial
 * - Indicador de degradación offline y sincronización
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useOperacionRepartidor } from '../../roles/logica/repartidor';
import type { MisionDelivery } from '../../sistema/persistencia/reparto.repositorio';

type PestanaRepartidor = 'asignados' | 'disponibles' | 'historial';

export function PantallaRepartidor() {
  const {
    loading,
    repartidorActual,
    pedidosDisponibles,
    pedidosAsignados,
    historial,
    colaOffline,
    esOffline,
    asignarPedido,
    cambiarEstado,
    sincronizarOffline,
    abrirEnGoogleMaps,
  } = useOperacionRepartidor();

  const [pestana, setPestana] = useState<PestanaRepartidor>('asignados');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const handleAsignar = async (misionId: string) => {
    setProcesandoId(misionId);
    try {
      await asignarPedido(misionId);
      setPestana('asignados');
    } catch {
      Alert.alert('Error', 'No se pudo tomar el pedido.');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCambiarEstado = async (
    misionId: string,
    nuevoEstado: 'en_camino' | 'entregado' | 'no_entregado'
  ) => {
    setProcesandoId(misionId);
    try {
      await cambiarEstado(misionId, nuevoEstado);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado de la entrega.');
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando entregas...</Text>
      </View>
    );
  }

  const pedidosActivos =
    pestana === 'asignados'
      ? pedidosAsignados
      : pestana === 'disponibles'
        ? pedidosDisponibles
        : historial;

  return (
    <View style={styles.container}>
      {/* Header móvil */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Ionicons name="bicycle" size={26} color="#60a5fa" />
          <View>
            <Text style={styles.headerNombre}>{repartidorActual.nombre}</Text>
            <Text style={styles.headerSub}>Despacho y Logística</Text>
          </View>
        </View>

        {esOffline ? (
          <Pressable style={styles.badgeOffline} onPress={sincronizarOffline}>
            <Ionicons name="cloud-offline" size={14} color="#f59e0b" />
            <Text style={styles.badgeOfflineText}>
              Offline {colaOffline.length > 0 ? `(${colaOffline.length})` : ''}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.badgeOnline}>
            <Ionicons name="radio" size={12} color="#34d399" />
            <Text style={styles.badgeOnlineText}>Conectado</Text>
          </View>
        )}
      </View>

      {/* Selector de Pestañas */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabBtn, pestana === 'asignados' && styles.tabBtnActive]}
          onPress={() => setPestana('asignados')}
        >
          <Text style={[styles.tabText, pestana === 'asignados' && styles.tabTextActive]}>
            Mis Entregas ({pedidosAsignados.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, pestana === 'disponibles' && styles.tabBtnActive]}
          onPress={() => setPestana('disponibles')}
        >
          <Text style={[styles.tabText, pestana === 'disponibles' && styles.tabTextActive]}>
            Disponibles ({pedidosDisponibles.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, pestana === 'historial' && styles.tabBtnActive]}
          onPress={() => setPestana('historial')}
        >
          <Text style={[styles.tabText, pestana === 'historial' && styles.tabTextActive]}>
            Historial ({historial.length})
          </Text>
        </Pressable>
      </View>

      {/* Lista de Pedidos */}
      <ScrollView style={styles.pedidosScroll} contentContainerStyle={styles.pedidosContent}>
        {pedidosActivos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                pestana === 'asignados'
                  ? 'checkmark-done-circle-outline'
                  : pestana === 'disponibles'
                    ? 'file-tray-outline'
                    : 'time-outline'
              }
              size={56}
              color="#475569"
            />
            <Text style={styles.emptyTitle}>
              {pestana === 'asignados'
                ? 'No tienes entregas en curso'
                : pestana === 'disponibles'
                  ? 'No hay pedidos disponibles por ahora'
                  : 'Sin historial reciente'}
            </Text>
            {pestana === 'asignados' && pedidosDisponibles.length > 0 && (
              <Pressable style={styles.verDisponiblesBtn} onPress={() => setPestana('disponibles')}>
                <Text style={styles.verDisponiblesText}>Ver pedidos disponibles</Text>
              </Pressable>
            )}
          </View>
        ) : (
          pedidosActivos.map((pedido: MisionDelivery) => {
            const estaProcesando = procesandoId === pedido.id;
            const esMio = pedido.repartidor?.id === repartidorActual.id;

            return (
              <View key={pedido.id} style={styles.cardPedido}>
                {/* Cabecera de tarjeta */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardClienteNombre}>
                      {pedido.cliente?.nombre || 'Cliente'}
                    </Text>
                    {pedido.cliente?.telefono && (
                      <Text style={styles.cardClienteTel}>📞 {pedido.cliente.telefono}</Text>
                    )}
                  </View>
                  <View style={styles.cardTotalBadge}>
                    <Text style={styles.cardTotalText}>
                      ${Number(pedido.totales?.total || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Dirección y Botón Google Maps */}
                <View style={styles.cardDireccionBox}>
                  <Ionicons name="location" size={20} color="#38bdf8" />
                  <Text style={styles.cardDireccionText}>
                    {pedido.cliente?.ubicacion?.direccion ||
                      pedido.cliente?.ubicacion?.referencia ||
                      'Sin dirección detallada'}
                  </Text>
                </View>

                {pedido.cliente?.ubicacion && (
                  <Pressable
                    style={styles.mapsBtn}
                    onPress={() => abrirEnGoogleMaps(pedido.cliente.ubicacion)}
                  >
                    <Ionicons name="map-outline" size={18} color="#ffffff" />
                    <Text style={styles.mapsBtnText}>Abrir en Google Maps</Text>
                  </Pressable>
                )}

                {/* Resumen de Items */}
                <View style={styles.cardItemsBox}>
                  <Text style={styles.cardItemsHeader}>Contenido del pedido:</Text>
                  {Object.values(pedido.items || {}).map((item, idx) => (
                    <Text key={idx} style={styles.cardItemText}>
                      • {item.cantidad}x {item.nombre}
                    </Text>
                  ))}
                </View>

                {/* Botones de Acción Operativa */}
                <View style={styles.cardActions}>
                  {pestana === 'disponibles' && (
                    <Pressable
                      style={[styles.btnAceptar, estaProcesando && styles.btnDisabled]}
                      disabled={estaProcesando}
                      onPress={() => handleAsignar(pedido.id)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                      <Text style={styles.btnActionText}>Aceptar Pedido</Text>
                    </Pressable>
                  )}

                  {pestana === 'asignados' && esMio && (
                    <>
                      {pedido.estado === 'asignada' && (
                        <Pressable
                          style={[styles.btnCamino, estaProcesando && styles.btnDisabled]}
                          disabled={estaProcesando}
                          onPress={() => handleCambiarEstado(pedido.id, 'en_camino')}
                        >
                          <Ionicons name="navigate-outline" size={20} color="#ffffff" />
                          <Text style={styles.btnActionText}>Iniciar Ruta (En Camino)</Text>
                        </Pressable>
                      )}

                      {(pedido.estado === 'en_camino' || pedido.estado === 'en_ubicacion') && (
                        <View style={styles.dualActionsRow}>
                          <Pressable
                            style={[styles.btnEntregado, estaProcesando && styles.btnDisabled]}
                            disabled={estaProcesando}
                            onPress={() => handleCambiarEstado(pedido.id, 'entregado')}
                          >
                            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                            <Text style={styles.btnActionText}>Entregado</Text>
                          </Pressable>

                          <Pressable
                            style={[styles.btnProblema, estaProcesando && styles.btnDisabled]}
                            disabled={estaProcesando}
                            onPress={() => handleCambiarEstado(pedido.id, 'no_entregado')}
                          >
                            <Ionicons name="alert-circle-outline" size={20} color="#ffffff" />
                            <Text style={styles.btnActionText}>Problema</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}

                  {pestana === 'historial' && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>
                        Estado final: {pedido.estado.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  center: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerNombre: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  headerSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
  badgeOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  badgeOnlineText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeOfflineText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#38bdf8',
  },
  pedidosScroll: {
    flex: 1,
  },
  pedidosContent: {
    padding: 14,
    gap: 14,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  verDisponiblesBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  verDisponiblesText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardPedido: {
    backgroundColor: '#111c35',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardClienteNombre: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  cardClienteTel: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 2,
  },
  cardTotalBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTotalText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '900',
  },
  cardDireccionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c1322',
    padding: 10,
    borderRadius: 8,
  },
  cardDireccionText: {
    color: '#f8fafc',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    borderRadius: 8,
  },
  mapsBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardItemsBox: {
    backgroundColor: '#0a0f1d',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  cardItemsHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardItemText: {
    color: '#e2e8f0',
    fontSize: 12,
  },
  cardActions: {
    marginTop: 4,
  },
  btnAceptar: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnCamino: {
    backgroundColor: '#d97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  dualActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnEntregado: {
    flex: 2,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnProblema: {
    flex: 1,
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PantallaRepartidor;
