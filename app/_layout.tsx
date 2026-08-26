import { useEffect, useState } from 'react';
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
import { estaCaracteristicaHabilitada } from '../src/negocio/roles/GestorCaracteristicas';
import { GestorHubGlobal } from '../src/sistema/impresion/fierros/hub/GestorHub';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FabRadial from '../src/ui/bloques/FabRadial';
import { useAuthGuard } from '../src/sistema/seguridad';
import { ThemeProvider, useAppTheme } from '../src/compartido/temas';
import { useBootstrapper } from '../src/sistema/estado/useBootstrapper';
import { useAppListeners, useFabForRoute, useStore } from '../src/sistema/store';
import { normalizePathname } from '../src/sistema/navegacion/normalizePathname';
import { ProveedorFierros } from '../src/sistema/impresion/fierros';
import { ProveedorAudioNotificaciones } from '../src/sistema/proveedores/ProveedorAudioNotificaciones';
import { ProveedorConfiguracionTenant } from '../src/sistema/proveedores/ProveedorConfiguracionTenant';
import { useInicializacionServiciosTenant } from '../src/sistema/instalacion/hooks/useInicializacionServiciosTenant';
import { useAdminFeatures } from '../src/capacidades/admin';

LogBox.ignoreLogs(['Unable to activate keep awake']);
console.info('[T046][MIGRACION_RTDB_AUTORIDAD]');

const PUBLIC_ROUTES = ['/'];

const ROUTE_FEATURES: Record<string, { generic?: string; admin?: string[] }> = {
  '/_role/venta-crudo': { generic: 'venta_crudo' },
  '/_role/admin/venta-crudo': {
    admin: ['admin_mostrador', 'module_venta_crudo'],
  },
  '/_role/admin/dashboard': { admin: ['admin_dashboard'] },
  '/_role/admin/menu': { admin: ['admin_menu'] },
  '/_role/admin/inventory': { admin: ['admin_inventory'] },
  '/_role/admin/tables': { admin: ['admin_tables'] },
  '/_role/admin/devices': { admin: ['admin_devices'] },
  '/_role/admin/repart': { admin: ['admin_repart'] },
  '/_role/mesero': { generic: 'restaurante.mesas' },
  '/_role/cocina': { generic: 'restaurante.kds' },
};

export default function RootLayout() {
  const isReady = useBootstrapper();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.includes(route)) || pathname === '/';
  useAuthGuard(isReady && !isPublicRoute);
  useAppListeners(isReady);

  const tenantPath = useStore((state) => state.sesion.tenantPath);
  const estadoInstalacion = useStore((state) => state.estadoInstalacion);
  const { features: adminFeatures, loading: adminFeaturesLoading } = useAdminFeatures({
    tenantPath: tenantPath || undefined,
  });

  // 🛡️ Guardia de Navegación de la Fábrica en Runtime (Fase 3)
  useEffect(() => {
    if (!isReady) return;

    const matchedRoute = Object.keys(ROUTE_FEATURES).find((route) => pathname.startsWith(route));
    if (matchedRoute) {
      const requirement = ROUTE_FEATURES[matchedRoute];
      if (requirement.admin && adminFeaturesLoading) return;

      const isEnabled = requirement.admin
        ? requirement.admin.every(
            (feature) => (adminFeatures as Record<string, boolean>)[feature] === true
          )
        : estaCaracteristicaHabilitada(requirement.generic || '', true);

      if (!isEnabled) {
        logger.warn(
          'ROUTE_GUARD',
          `[Fábrica] Acceso denegado a "${pathname}". Redirigiendo al selector de roles.`
        );
        router.replace('/_role/roles');
      }
    }
  }, [adminFeatures, adminFeaturesLoading, pathname, isReady, router]);

  // Orquestador de servicios (DOGMA: Cero lógica de negocio en layout)
  useInicializacionServiciosTenant({ estadoInstalacion, tenantPath });

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
    <ThemeProvider tenantPath={tenantPath || ''}>
      <RootLayoutContent isReady={isReady} pathname={pathname} tenantPath={tenantPath || null} />
    </ThemeProvider>
  );
}

function RootLayoutContent({
  isReady,
  pathname,
  tenantPath,
}: {
  isReady: boolean;
  pathname: string;
  tenantPath: string | null;
}) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const needsTenant = pathname.startsWith('/_role') && !tenantPath;

  useEffect(() => {
    if (!isReady || !needsTenant) return;
    router.replace('/access');
  }, [isReady, needsTenant, router]);

  if (needsTenant) {
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
      <ProveedorConfiguracionTenant>
        <GestorHubGlobal tenantPath={tenantPath} />

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
                <Stack.Screen name="_role/admin/index" />
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
      </ProveedorConfiguracionTenant>
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
  const displayConfig = useFabForRoute(pathname);

  if (!displayConfig || displayConfig.enabled === false || displayConfig.items.length === 0) {
    return null;
  }

  return (
    <FabRadial
      key={`${pathname}:${displayConfig.initialKey ?? ''}`}
      items={displayConfig.items}
      initialKey={displayConfig.initialKey}
      position={displayConfig.position ?? 'bottom-right'}
    />
  );
}
