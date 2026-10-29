import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DisenoAdministrador as AdminLayout } from '../../../../compartido/componentes/layouts/DisenoAdministrador';
import { useStore } from '../../../../sistema/store';
import { PanelInventario } from './PanelInventario';

export function PantallaInventario() {
  const rutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';

  if (!rutaNegocio) return null;

  return (
    <AdminLayout>
      <View style={styles.container}>
        <PanelInventario />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PantallaInventario;
