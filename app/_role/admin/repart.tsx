import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useAdminRepart } from '../../../src/capacidades/reparto';

function Card({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#111827',
        opacity: pressed ? 0.95 : 1,
        padding: 18,
        borderRadius: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#0b1220',
      })}
    >
      <Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>{title}</Text>
      {!!subtitle && <Text style={{ color: '#9ca3af', marginTop: 6 }}>{subtitle}</Text>}
    </Pressable>
  );
}

export default function AdminRepart() {
  const { loading, umbrales, horarios, costos, actions } = useAdminRepart();

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 16 }}>
          ADI-Repart
        </Text>
        {loading ? (
          <View
            style={{
              backgroundColor: '#111827',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#1f2937',
              padding: 16,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ActivityIndicator color="#3b82f6" />
            <Text style={{ color: '#9ca3af' }}>Cargando ajustes…</Text>
          </View>
        ) : (
          <>
            <Card
              title="Reabastecimiento"
              subtitle={`Umbral stock bajo: ${umbrales.stockBajo} · Máx. pedidos: ${umbrales.maxPedidosActivos} · SLA: ${umbrales.tiempoMaxEntregaMin} min`}
              onPress={async () => {
                await actions.guardarUmbrales({ stockBajo: umbrales.stockBajo + 1 });
              }}
            />
            <Card
              title="Horarios y ventanas"
              subtitle={`Servicio ${
                horarios.habilitado ? 'habilitado' : 'deshabilitado'
              } · Ventanas: ${horarios.ventanas.length}`}
              onPress={async () => {
                await actions.toggleHorarios();
              }}
            />
            <Card
              title="Costos y reglas"
              subtitle={`Base: $${costos.base} · Por km: $${costos.porKm} · Mínimo: $${costos.minimo}`}
              onPress={async () => {
                await actions.guardarCostos({ base: Math.max(0, (costos.base || 0) + 1) });
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
