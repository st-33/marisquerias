/**
 * 🎭 ROLES SCREEN (Selector de Roles)
 * Componente visual para alimentos y bebidas
 */

import React from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../../sistema/store';
import { RoleSelectorElite } from '..';

export function RolesScreen() {
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const negocioId = useStore((s) => s.sesion.negocioId);

  if (!rutaNegocio || !negocioId) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#050506',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#8e7952', fontSize: 12, letterSpacing: 3 }}>CARGANDO SESIÓN...</Text>
      </View>
    );
  }

  return <RoleSelectorElite />;
}

export default RolesScreen;
