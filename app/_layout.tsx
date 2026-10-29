import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Animated,
  Easing,
  LogBox,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, Stack, useRouter } from 'expo-router';
import { logger } from '../src/sistema/monitoreo';
import { GestorHubGlobal } from '../src/sistema/impresion/fierros/hub/GestorConcentrador';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FabNavegacionAdmin } from '../src/ui/roles/administrador/FabNavegacionAdmin';
import { useAuthGuard, useGobernanzaRealtime } from '../src/sistema/seguridad';
import { ThemeProvider, useAppTheme } from '../src/compartido/temas';
import { useArranqueSistema } from '../src/sistema/instalacion/useArranqueSistema';
import { useAppListeners, useFabForRoute, useStore } from '../src/sistema/store';
import { normalizePathname } from '../src/sistema/navegacion/normalizePathname';
import { ProveedorFierros } from '../src/sistema/impresion/fierros';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProveedorAudioNotificaciones } from '../src/sistema/proveedores/ProveedorAudioNotificaciones';
import { ProveedorConfiguracionNegocio } from '../src/sistema/proveedores/ProveedorConfiguracionNegocio';
import { useInicializacionServiciosNegocio } from '../src/sistema/instalacion/hooks/useInicializacionServiciosNegocio';
import { useAdminFeatures } from '../src/capacidades/admin';
import { useSincronizarPedidosLogistica } from '../src/capacidades/logistica';
import { getRtdb } from '../src/sistema/firebase';

LogBox.ignoreLogs(['Unable to activate keep awake']);
console.info('[T046][MIGRACION_RTDB_AUTORIDAD]');

const PUBLIC_ROUTES = ['/index', '/(auth)', '/vinculacion'];

const ROUTE_FEATURES: Record<string, { generic?: string; admin?: string[] }> = {
  '/_role/venta-crudo': { generic: 'venta_crudo' },
  '/_role/admin/venta-crudo': {
    admin: ['admin_mostrador', 'module_venta_crudo'],
  },
  '/_role/admin/dashboard': { admin: ['admin_dashboard'] },
  '/_role/admin/menu': { admin: ['admin_menu'] },
  '/_role/admin/inventario': { admin: ['admin_inventory'] },
  '/_role/admin/mesas': { admin: ['admin_tables'] },
  '/_role/admin/dispositivos': { admin: ['admin_devices'] },
  '/_role/admin/ajustes': { admin: ['admin'] },
  '/_role/admin/reparto': { admin: ['admin_repart'] },
  '/_role/mesero': { generic: 'restaurante.mesas' },
  '/_role/cocina': { generic: 'restaurante.kds' },
};

export default function RootLayout() {
  const isReady = useArranqueSistema();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = pathname === '/' || PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  useAuthGuard(isReady && !isPublicRoute);
  useGobernanzaRealtime(isReady && !isPublicRoute);
  useAppListeners(isReady);

  const rutaNegocio = useStore((state) => state.sesion.rutaNegocio);
  const negocioId = useStore((state) => state.sesion.negocioId);
  const dataSources = useStore((state) => state.dataSources);
  const estadoInstalacion = useStore((state) => state.estadoInstalacion);
  const operacionDb = useMemo(
    () => (isReady && dataSources?.operacionUrl ? getRtdb(dataSources.operacionUrl) : null),
    [dataSources?.operacionUrl, isReady]
  );
  useSincronizarPedidosLogistica({
    db: operacionDb,
    negocioId,
    rutaNegocio,
  });
  const { features: adminFeatures, loading: adminFeaturesLoading } = useAdminFeatures({
    rutaNegocio: rutaNegocio || undefined,
  });

  const estadoEncendido = useStore((state) => state.estadoEncendido);

  // 🛡️ Guardia de Navegación de la Fábrica en Runtime (Fase 3)
  useEffect(() => {
    if (!isReady) return;

    // Acceso directo garantizado al dashboard administrativo, dispositivos y ajustes para rol administrador
    if (
      pathname.startsWith('/_role/admin/dashboard') ||
      pathname.startsWith('/_role/admin/dispositivos') ||
      pathname.startsWith('/_role/admin/ajustes')
    ) {
      const rolActivo = useStore.getState().sesion.rol;
      const roles = estadoEncendido?.activos?.roles ?? estadoEncendido?.roles_activos ?? [];
      const adminRoleEnabled =
        rolActivo === 'admin' ||
        rolActivo === 'administrador' ||
        roles.includes('administrador') ||
        roles.includes('admin' as any);
      if (adminRoleEnabled) return;
    }

    const matchedRoute = Object.keys(ROUTE_FEATURES).find((route) => pathname.startsWith(route));
    if (matchedRoute) {
      const requirement = ROUTE_FEATURES[matchedRoute];
      if (requirement.admin && adminFeaturesLoading) return;

      const caps =
        estadoEncendido?.activos?.capacidades || estadoEncendido?.capacidades_activas || [];

      let isGenericEnabled = true;
      if (requirement.generic === 'restaurante.mesas') {
        isGenericEnabled = !estadoEncendido || caps.includes('control_mesas');
      } else if (requirement.generic === 'restaurante.kds') {
        isGenericEnabled = !estadoEncendido || caps.includes('comanda_cocina');
      } else if (requirement.generic === 'venta_crudo') {
        isGenericEnabled = !estadoEncendido || caps.includes('mostrador_y_pos');
      }

      const isEnabled = requirement.admin
        ? requirement.admin.every(
            (feature) => (adminFeatures as Record<string, boolean>)[feature] === true
          )
        : isGenericEnabled;

      if (!isEnabled) {
        logger.warn(
          'ROUTE_GUARD',
          `[Fábrica] Acceso denegado a "${pathname}". Redirigiendo al selector de roles.`
        );
        router.replace('/_role/roles');
      }
    }
  }, [adminFeatures, adminFeaturesLoading, estadoEncendido, pathname, isReady, router]);

  // Orquestador de servicios (DOGMA: Cero lógica de negocio en layout)
  useInicializacionServiciosNegocio({ estadoInstalacion, rutaNegocio });

  // B. 🛡️ Manejo Seguro del Lifecycle de Bluetooth (prevenir SecurityException)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        logger.debug('BLUETOOTH', '🧹 App yendo a background, limpiando estado BT');
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider rutaNegocio={rutaNegocio || ''}>
        <RootLayoutContent isReady={isReady} pathname={pathname} rutaNegocio={rutaNegocio || null} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent({
  isReady,
  pathname,
  rutaNegocio,
}: {
  isReady: boolean;
  pathname: string;
  rutaNegocio: string | null;
}) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const needsNegocio = pathname.startsWith('/_role') && !rutaNegocio;

  useEffect(() => {
    if (!isReady || !needsNegocio) return;
    router.replace('/access');
  }, [isReady, needsNegocio, router]);

  if (needsNegocio) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: theme.colors.secondary,
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          Cargando sesión...
        </Text>
      </View>
    );
  }

  return (
    <ProveedorFierros>
      <ProveedorConfiguracionNegocio>
        <GestorHubGlobal rutaNegocio={rutaNegocio} />

        <GestureHandlerRootView
          style={{ flex: 1, backgroundColor: theme.colors.background, minHeight: '100%' }}
        >
          <ProveedorAudioNotificaciones>
            <View style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: Platform.OS === 'web' ? 'none' : 'fade',
                  animationDuration: 240,
                  contentStyle: { backgroundColor: theme.colors.background },
                }}
              >
                <Stack.Screen name="index" options={{ title: 'Inicio' }} />
                <Stack.Screen name="(auth)/access" />
                <Stack.Screen name="_role/roles" />
                <Stack.Screen name="_role/admin/dashboard" />
                <Stack.Screen name="_role/venta-crudo" />
              </Stack>
              <GlobalFabSlot />
              <RouteTransitionOverlay
                pathname={pathname}
                backgroundColor={theme.colors.background}
              />
            </View>
          </ProveedorAudioNotificaciones>
        </GestureHandlerRootView>
      </ProveedorConfiguracionNegocio>
    </ProveedorFierros>
  );
}

function RouteTransitionOverlay({
  pathname,
  backgroundColor,
}: {
  pathname: string;
  backgroundColor: string;
}) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [initialPathname] = useState(pathname);

  useEffect(() => {
    if (pathname === initialPathname) return;

    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    opacity.setValue(0.18);
    animation.start();
    return () => animation.stop();
  }, [initialPathname, opacity, pathname]);

  if (Platform.OS !== 'web') return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor, opacity, zIndex: 1000 }]}
    />
  );
}

function GlobalFabSlot() {
  const rawPathname = usePathname();
  const pathname = normalizePathname(rawPathname);

  // 🛡️ REGLA CANÓNICA: El FAB Radial pertenece EXCLUSIVAMENTE a las vistas del Administrador.
  // Queda estrictamente prohibido renderizar el FAB fuera de las rutas de administrador.
  if (!pathname.startsWith('/_role/admin')) {
    return null;
  }

  return <FabNavegacionAdmin pathname={pathname} />;
}
