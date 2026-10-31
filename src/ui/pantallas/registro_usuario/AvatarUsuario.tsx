/**
 * 👤 AVATAR DEL USUARIO
 * Representación visual del operador según sexo ('H' | 'M') con soporte de temas.
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SexoUsuario } from '../../../sistema/usuarios/tipos';

interface AvatarUsuarioProps {
  sexo: SexoUsuario;
  size?: number;
  activo?: boolean;
}

export function AvatarUsuario({ sexo, size = 80, activo = false }: AvatarUsuarioProps) {
  const esHombre = sexo === 'H';
  const iconSize = Math.round(size * 0.55);

  const colorFondo = esHombre
    ? 'rgba(56, 189, 248, 0.15)' // Cyan / Ocean Blue
    : 'rgba(244, 114, 182, 0.15)'; // Rose / Magenta

  const colorBorde = esHombre
    ? (activo ? '#38BDF8' : 'rgba(56, 189, 248, 0.4)')
    : (activo ? '#F472B6' : 'rgba(244, 114, 182, 0.4)');

  const colorIcono = esHombre ? '#38BDF8' : '#F472B6';

  return (
    <View
      style={[
        estilos.contenedor,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorFondo,
          borderColor: colorBorde,
          borderWidth: activo ? 2.5 : 1.5,
        },
      ]}
    >
      <Ionicons
        name={esHombre ? 'person' : 'person'}
        size={iconSize}
        color={colorIcono}
      />
      <View
        style={[
          estilos.badgeSexo,
          {
            backgroundColor: esHombre ? '#0284C7' : '#DB2777',
            width: Math.max(20, Math.round(size * 0.3)),
            height: Math.max(20, Math.round(size * 0.3)),
            borderRadius: size * 0.15,
          },
        ]}
      >
        <Text style={[estilos.textoBadge, { fontSize: Math.max(10, Math.round(size * 0.18)) }]}>
          {esHombre ? '♂' : '♀'}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeSexo: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  textoBadge: {
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 14,
  },
});
