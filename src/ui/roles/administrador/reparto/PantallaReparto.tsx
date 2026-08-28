/**
 * 🚚 REPARTO (rol Administrador) — pantalla de ajustes del servicio a domicilio
 * y reabastecimiento. Antes `repart.tsx` con componente `AdminRepart` (UI inline
 * en `app/_role/admin/repart.tsx`, reunida aquí en la fase 3 por M3).
 */

import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGestionReparto } from '../../../../capacidades/reparto';
import { TarjetaConfig } from './componentes/TarjetaConfig';

export function PantallaReparto() {
  const { loading, umbrales, horarios, costos, actions } = useGestionReparto();

  const ejecutarGuardado = async (guardado: () => Promise<void>) => {
    try {
      await guardado();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No fue posible guardar el ajuste.';
      Alert.alert('Ajuste no guardado', mensaje);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.titulo}>ADI-Repart</Text>
        {loading ? (
          <View style={styles.cargando}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={styles.textoCargando}>Cargando ajustes…</Text>
          </View>
        ) : (
          <>
            <TarjetaConfig
              titulo="Reabastecimiento"
              subtitulo={`Umbral stock bajo: ${umbrales.stockBajo} · Máx. pedidos: ${umbrales.maxPedidosActivos} · SLA: ${umbrales.tiempoMaxEntregaMin} min`}
              onPress={() =>
                ejecutarGuardado(() =>
                  actions.guardarUmbrales({ stockBajo: umbrales.stockBajo + 1 })
                )
              }
            />
            <TarjetaConfig
              titulo="Horarios y ventanas"
              subtitulo={`Servicio ${
                horarios.habilitado ? 'habilitado' : 'deshabilitado'
              } · Ventanas: ${horarios.ventanas.length}`}
              onPress={() => ejecutarGuardado(actions.toggleHorarios)}
            />
            <TarjetaConfig
              titulo="Costos y reglas"
              subtitulo={`Base: $${costos.base} · Por km: $${costos.porKm} · Mínimo: $${costos.minimo}`}
              onPress={() =>
                ejecutarGuardado(() =>
                  actions.guardarCostos({ base: Math.max(0, (costos.base || 0) + 1) })
                )
              }
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contenido: {
    padding: 20,
  },
  titulo: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
  },
  cargando: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  textoCargando: {
    color: '#9ca3af',
  },
});

export default PantallaReparto;
