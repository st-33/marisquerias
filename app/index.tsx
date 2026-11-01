import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { leerSesionO1 } from '../src/sistema/instalacion/npb/persistenciaSesionO1';
import { obtenerSesionOperativaLocal } from '../src/sistema/usuarios/servicio_sesion_dispositivo';

export default function Index() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let montado = true;

    async function resolverRutaInicial() {
      try {
        const sesionO1 = await leerSesionO1();
        if (!sesionO1.valida || !sesionO1.sesion) {
          if (montado) router.replace('/access');
          return;
        }

        if (Platform.OS === 'web') {
          if (montado) router.replace('/_role/roles');
          return;
        }

        // En nativo: verificar si ya existe una sesión operativa de operador local
        const sesionOperativa = await obtenerSesionOperativaLocal();
        if (
          sesionOperativa &&
          sesionOperativa.usuario_id &&
          sesionOperativa.estado === 'activa'
        ) {
          const cargo = sesionOperativa.cargo;
          if (cargo === 'administrador') {
            if (montado) router.replace('/_role/roles');
          } else if (cargo) {
            const { obtenerRutaPorRol } = await import('../src/negocio/roles/redireccionRol');
            const rutaDirecta = obtenerRutaPorRol(cargo as any);
            if (montado) router.replace(rutaDirecta as any);
          } else {
            if (montado) router.replace('/_role/roles');
          }
        } else {
          // Si el negocio ya está vinculado pero falta el perfil de piso, enviar a access (que saltará a registro)
          if (montado) router.replace('/access');
        }
      } catch {
        if (montado) router.replace('/access');
      } finally {
        if (montado) setCargando(false);
      }
    }

    void resolverRutaInicial();

    return () => {
      montado = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#38BDF8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
