/**
 * 🏗️ ADMIN LAYOUT - Componente Reutilizable
 * Sidebar con navegación para todas las vistas de Admin
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

export type DisenoAdministradorProps = {
  children: React.ReactNode;
};
export type AdminLayoutProps = DisenoAdministradorProps;

export function DisenoAdministrador({ children }: DisenoAdministradorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export const AdminLayout = DisenoAdministrador;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  content: {
    flex: 1,
  },
});
