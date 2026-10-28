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
import { AccionRadialFlotante } from '../src/ui/bloques/AccionRadialFlotante';
import { useAuthGuard, useGobernanzaRealtime } from '../src/sistema/seguridad';
import { ThemeProvider, useAppTheme } from '../src/compartido/temas';
import { useArranqueSistema } from '../src/sistema/instalacion/useArranqueSistema';
import { useAppListeners, useFabForRoute, useStore } from '../src/sistema/store';
import { normalizePathname } from '../src/sistema/navegacion/normalizePathname';
import { ProveedorFierros } from '../src/sistema/impresion/fierros';
import { ProveedorAudioNotificaciones } from '../src/sistema/proveedores/ProveedorAudioNotificaciones';
import { useInicializacionServiciosNegocio } from '../src/sistema/instalacion/hooks/useInicializacionServiciosNegocio';
import { useAdminFeatures } from '../src/capacidades/admin';
import { useSincronizarPedidosLogistica } from '../src/capacidades/logistica';
import { getRtdb } from '../src/sistema/firebase';
import type { CapacidadCanonica } from '../src/sistema/instalacion/npb/tiposNPB';
import type { RolDispositivoCanonico } from '../src/negocio/roles/catalogoRoles';

LogBox.ignoreLogs(['Unable to activate keep awake']);
console.info('[T046][MIGRACION_RTDB_AUTORIDAD]');

const PUBLIC_ROUTES = ['/', '/access', '/(auth)/access', '/vinculacion'];

const ROUTE_FEATURES: Record<
  string,
  {
    capacidad?: CapacidadCanonica;
    rol?: RolDispositivoCanonico;
    admin?: string[];
  }
> = {
  '/_role/venta-crudo': { capacidad: 'mostrador_y_pos', rol: 'mostrador' },
  '/_role/caja': { capacidad: 'mostrador_y_pos', rol: 'cajero' },
  '/_role/mesero': { capacidad: 'control_mesas', rol: 'mesero' },
  '/_role/cocina': { capacidad: 'comanda_cocina', rol: 'cocina' },
  '/_role/repartidor': { capacidad: 'reparto_logistica', rol: 'repartidor' },
  '/_role/barman': { capacidad: 'comanda_cocina', rol: 'barman' },
  '/_role/barista': { capacidad: 'comanda_cocina', rol: 'barista' },
  '/_role/parrillero': { capacidad: 'comanda_cocina', rol: 'parrillero' },
  '/_role/empacador': { capacidad: 'comanda_cocina', rol: 'empacador' },
  '/_role/admin/venta-crudo': {
    admin: ['admin_mostrador', 'module_venta_crudo'],
  },
  '/_role/admin/dashboard': { admin: ['admin_dashboard'] },
  '/_role/admin/menu': { admin: ['admin_menu'] },
  '/_role/admin/inventario': { admin: ['admin_inventory'] },
  '/_role/admin/mesas': { admin: ['admin_tables'] },
  '/_role/admin/dispositivos': { admin: ['admin_devices'] },
  '/_role/admin/reparto': { admin: ['admin_repart'] },
};

export default function RootLayout() {
  const isReady = useArranqueSistema();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
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

  // 🛡️ Guardia de Navegación de Capacidades y Perfiles en Runtime
  useEffect(() => {
    if (!isReady) return;

    const matchedRoute = Object.keys(ROUTE_FEATURES).find((route) => pathname.startsWith(route));
    if (matchedRoute) {
      const requirement = ROUTE_FEATURES[matchedRoute];
      if (requirement.admin && adminFeaturesLoading) return;

      const caps =
        estadoEncendido?.activos?.capacidades || estadoEncendido?.capacidades_activas || [];
      const roles =
        estadoEncendido?.activos?.roles || estadoEncendido?.roles_activos || [];

      const cumpleCapacidad =
        !requirement.capacidad || !estadoEncendido || caps.includes(requirement.capacidad);
      const cumpleRol =
        !requirement.rol || !estadoEncendido || roles.includes(requirement.rol);

      const isEnabled = requirement.admin
        ? requirement.admin.every(
            (feature) => (adminFeatures as Record<string, boolean>)[feature] === true
          )
        : cumpleCapacidad && cumpleRol;

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
    <ThemeProvider rutaNegocio={rutaNegocio || ''}>
      <RootLayoutContent isReady={isReady} pathname={pathname} rutaNegocio={rutaNegocio || null} />
    </ThemeProvider>
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
  const negocioId = useStore((state) => state.sesion.negocioId);
  const needsNegocio = pathname.startsWith('/_role') && !negocioId;

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
    <AccionRadialFlotante
      key={`${pathname}:${displayConfig.initialKey ?? ''}`}
      items={displayConfig.items}
      initialKey={displayConfig.initialKey}
      position={displayConfig.position ?? 'bottom-right'}
    />
  );
}
