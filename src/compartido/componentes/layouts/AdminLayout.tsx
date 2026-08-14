/**
 * 🏗️ ADMIN LAYOUT - Componente Reutilizable
 * Sidebar con navegación para todas las vistas de Admin
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  content: {
    flex: 1,
  },
});
