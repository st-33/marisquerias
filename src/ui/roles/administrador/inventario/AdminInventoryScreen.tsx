import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdminLayout } from '../../../../compartido/componentes/layouts/AdminLayout';
import { getRtdb } from '../../../../sistema/firebase';
import { useStore } from '../../../../sistema/store';
import { PanelInventario } from './PanelInventario';

export function AdminInventoryScreen() {
  const tenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s) => s.dataSources);
  const db = useMemo(() => getRtdb(ds?.operacionUrl || undefined), [ds]);

  if (!tenantPath) return null;

  return (
    <AdminLayout>
      <View style={styles.container}>
        <PanelInventario db={db} tenantPath={tenantPath} />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AdminInventoryScreen;
