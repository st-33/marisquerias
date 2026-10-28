/**
 * 🛑 COMPONENTE REUTILIZABLE: ERROR DE ARRANQUE O(1)
 *
 * Muestra las 7 variantes canónicas de error de vinculación y arranque,
 * con acciones delimitadas ('Reintentar' o 'Salir') y visor de detalle técnico colapsable.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InfoErrorArranque } from '../../sistema/instalacion/npb/erroresArranque';

export interface ErrorArranqueProps {
  errorInfo: InfoErrorArranque;
  onReintentar?: () => void;
  onSalir?: () => void;
}

export function ErrorArranque({ errorInfo, onReintentar, onSalir }: ErrorArranqueProps) {
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const getIcono = () => {
    switch (errorInfo.tipo) {
      case 'sin_conexion':
        return 'cloud-offline-outline';
      case 'codigo_revocado':
      case 'codigo_expirado':
        return 'lock-closed-outline';
      case 'npb_incompatible':
        return 'shield-half-outline';
      case 'codigo_invalido':
      case 'desconocido':
      default:
        return 'alert-circle-outline';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={getIcono() as any} size={40} color="#f87171" />
        <Text style={styles.titulo}>Atención al Iniciar</Text>
      </View>

      <Text style={styles.mensaje}>{errorInfo.mensaje}</Text>

      {errorInfo.tipo === 'desconocido' && errorInfo.detalleTecnico && (
        <View style={styles.seccionDetalle}>
          <Pressable
            onPress={() => setMostrarDetalle(!mostrarDetalle)}
            style={styles.botonToggleDetalle}
          >
            <Text style={styles.textoToggleDetalle}>
              {mostrarDetalle ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
            </Text>
            <Ionicons
              name={mostrarDetalle ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#9ca3af"
            />
          </Pressable>

          {mostrarDetalle && (
            <ScrollView style={styles.scrollDetalle} nestedScrollEnabled>
              <Text style={styles.textoDetalle}>{errorInfo.detalleTecnico}</Text>
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.acciones}>
        {errorInfo.permiteReintentar ? (
          <Pressable
            onPress={onReintentar}
            style={({ pressed }) => [
              styles.botonAccion,
              styles.botonReintentar,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.textoBoton}>Reintentar</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onSalir}
            style={({ pressed }) => [
              styles.botonAccion,
              styles.botonSalir,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.textoBoton}>Salir</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#ef444450',
    alignSelf: 'center',
    marginVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  titulo: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  mensaje: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  seccionDetalle: {
    marginBottom: 16,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
  },
  botonToggleDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  textoToggleDetalle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollDetalle: {
    maxHeight: 120,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  textoDetalle: {
    color: '#ef4444',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  acciones: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  botonAccion: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  botonReintentar: {
    backgroundColor: '#3b82f6',
  },
  botonSalir: {
    backgroundColor: '#475569',
  },
  textoBoton: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
