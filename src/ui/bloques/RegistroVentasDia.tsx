import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RegistroVenta } from '../../sistema/persistencia/registroVentas.repo';

function formatMesa(mesaId?: string): string {
  if (!mesaId) return 'Mostrador';
  const limpio = mesaId.replace(/^mesa[-_]?/i, '').trim();
  return limpio ? `M${limpio}` : 'Mesa';
}

function formatHora(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatFecha(timestamp: number, numerica: boolean): string {
  return new Date(timestamp).toLocaleDateString(
    'es-MX',
    numerica
      ? { day: '2-digit', month: '2-digit' }
      : { weekday: 'long', day: 'numeric', month: 'long' }
  );
}

function colorEstado(estado: RegistroVenta['estado']): string {
  switch (estado) {
    case 'pagada':
      return '#10b981';
    case 'cancelada_perdida':
      return '#ef4444';
    case 'cancelada_sin_perdida':
      return '#f59e0b';
    default:
      return '#3b82f6';
  }
}

export function RegistroVentasDia({
  registros,
  loading,
  error,
  onReload,
}: {
  registros: RegistroVenta[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
}) {
  const [fechaNumerica, setFechaNumerica] = useState(false);
  const [compacto, setCompacto] = useState(false);
  const [fechaActual] = useState(() => Date.now());
  const fechaReferencia = useMemo(
    () => registros[0]?.timestamp || fechaActual,
    [fechaActual, registros]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Ionicons name="receipt-outline" size={21} color="#3b82f6" />
          <Text style={styles.title}>Ventas del día</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar formato de fecha"
            onPress={() => setFechaNumerica((actual) => !actual)}
            style={styles.iconButton}
          >
            <Text style={styles.dateButtonText}>{formatFecha(fechaReferencia, fechaNumerica)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alternar vista compacta"
            onPress={() => setCompacto((actual) => !actual)}
            style={styles.iconButton}
          >
            <Ionicons
              name={compacto ? 'expand-outline' : 'flash-outline'}
              size={19}
              color="#f59e0b"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar ventas del día"
            onPress={onReload}
            style={styles.iconButton}
          >
            <Ionicons name="refresh-outline" size={19} color="#94a3b8" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#3b82f6" />
          <Text style={styles.muted}>Cargando ventas...</Text>
        </View>
      ) : error ? (
        <Pressable onPress={onReload} style={styles.empty}>
          <Text style={styles.error}>No se pudo cargar el registro.</Text>
          <Text style={styles.muted}>Toca para reintentar.</Text>
        </Pressable>
      ) : registros.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>Todavía no hay ventas registradas hoy.</Text>
        </View>
      ) : (
        <View style={styles.rows}>
          {registros.map((registro) => {
            const estado = colorEstado(registro.estado);
            return (
              <View key={`${registro.origen}-${registro.origenId}`} style={styles.row}>
                <Text style={[styles.number, { color: estado }]}>{registro.numero}</Text>
                <Text style={styles.mesa}>
                  {compacto
                    ? formatMesa(registro.mesaId)
                    : registro.mesaId
                      ? `Mesa ${registro.mesaId}`
                      : 'Mostrador'}
                </Text>
                <Text style={[styles.total, { color: estado }]}>${registro.total.toFixed(2)}</Text>
                <Text style={styles.hora}>{formatHora(registro.timestamp)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderColor: '#27324A',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  headerTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#f9fafb',
    fontSize: 17,
    fontWeight: '700',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    alignItems: 'center',
    borderColor: '#27324A',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dateButtonText: {
    color: '#cbd5f5',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  rows: {
    gap: 8,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 10,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  number: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 24,
  },
  mesa: {
    color: '#cbd5f5',
    flex: 1,
    fontSize: 13,
  },
  total: {
    fontSize: 14,
    fontWeight: '800',
  },
  hora: {
    color: '#94a3b8',
    fontSize: 12,
    minWidth: 78,
    textAlign: 'right',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minHeight: 72,
  },
  muted: {
    color: '#94a3b8',
    fontSize: 13,
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
  },
});
