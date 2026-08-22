/**
 * 🦐 MOSTRADOR ADMIN SCREEN
 * Componente visual específico para la categoría marisquerías
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useAdminFeatures } from '../../../../capacidades/admin';
import { usePosConfig, useVentaCrudoAdmin } from '../../../../capacidades/mostrador';

export function MostradorAdminScreen() {
  const router = useRouter();

  const { sales } = useVentaCrudoAdmin();
  const { config, updateConfig } = usePosConfig();
  const { features, loading: loadingFeatures } = useAdminFeatures();
  const mostradorHabilitado =
    features?.admin_mostrador === true && features?.module_venta_crudo === true;

  useEffect(() => {
    if (!loadingFeatures && !mostradorHabilitado) {
      router.replace('/_role/roles');
    }
  }, [loadingFeatures, mostradorHabilitado, router]);

  if (loadingFeatures) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0f172a',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  if (!mostradorHabilitado) return null;

  const toggleConfig = (key: keyof typeof config) => {
    updateConfig({ [key]: !config[key as keyof typeof config] });
  };

  const totalHoy = sales.reduce((acc, sale) => acc + Math.max(0, Number(sale.total || 0)), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Canal: Mostrador</Text>
          <Text style={styles.headerSubtitle}>Gobierno y Supervisión</Text>
        </View>
        <Ionicons name="storefront" size={24} color="#f59e0b" style={{ marginLeft: 'auto' }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Ventas Hoy</Text>
            <Text style={styles.kpiValue}>{totalHoy.toFixed(2)}</Text>
            <Ionicons name="cube-outline" size={20} color="#10b981" style={styles.kpiIcon} />
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Operaciones</Text>
            <Text style={styles.kpiValue}>{sales.length}</Text>
            <Ionicons name="receipt-outline" size={20} color="#3b82f6" style={styles.kpiIcon} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración de Comportamiento</Text>
          <Text style={styles.sectionDesc}>Define las reglas operativas del canal POS.</Text>

          <View style={styles.configCard}>
            <View style={styles.configRow}>
              <View style={styles.configText}>
                <Text style={styles.configLabel}>Stock Negativo</Text>
                <Text style={styles.configSub}>Permitir venta sin inventario suficiente</Text>
              </View>
              <Switch
                value={config.allowNegativeStock}
                onValueChange={() => toggleConfig('allowNegativeStock')}
                trackColor={{ false: '#334155', true: '#f59e0b' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.configRow}>
              <View style={styles.configText}>
                <Text style={styles.configLabel}>Clave para Cancelar</Text>
                <Text style={styles.configSub}>Requerir autorización para eliminar items</Text>
              </View>
              <Switch
                value={config.requirePasskeyForVoid}
                onValueChange={() => toggleConfig('requirePasskeyForVoid')}
                trackColor={{ false: '#334155', true: '#f59e0b' }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.configRow}>
              <View style={styles.configText}>
                <Text style={styles.configLabel}>Imágenes en POS</Text>
                <Text style={styles.configSub}>Mostrar fotos de productos en la grilla</Text>
              </View>
              <Switch
                value={config.showImagesInPos}
                onValueChange={() => toggleConfig('showImagesInPos')}
                trackColor={{ false: '#334155', true: '#f59e0b' }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registro de Ventas</Text>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Hora</Text>
              <Text style={[styles.th, { flex: 2 }]}>Venta</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Total</Text>
            </View>
            {sales.map((sale, index) => {
              const date = new Date(sale.timestamp);
              const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const items =
                sale.resumenItems?.map((item) => item.nombre).join(', ') || 'Sin detalle';
              return (
                <View
                  key={sale.id}
                  style={[styles.tableRow, index !== sales.length - 1 && styles.borderBottom]}
                >
                  <Text style={[styles.td, { flex: 1, color: '#94a3b8', fontSize: 12 }]}>
                    {time}
                  </Text>
                  <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
                    #{sale.numero} · {items}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      { flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#10b981' },
                    ]}
                  >
                    ${Number(sale.total || 0).toFixed(2)}
                  </Text>
                </View>
              );
            })}
            {sales.length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#64748b' }}>Sin ventas registradas hoy</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

export default MostradorAdminScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: { marginRight: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 12 },
  content: { padding: 20 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  kpiValue: { color: 'white', fontSize: 18, fontWeight: '900' },
  kpiIcon: { position: 'absolute', right: 12, top: 12, opacity: 0.5 },
  section: { marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  sectionDesc: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  configCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  configText: { flex: 1, marginRight: 16 },
  configLabel: { color: 'white', fontSize: 15, fontWeight: '600' },
  configSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155' },
  tableCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  tableHeader: { flexDirection: 'row', padding: 12, backgroundColor: '#334155' },
  th: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 16 },
  td: { color: 'white', fontSize: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#334155' },
});
