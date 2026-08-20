import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, LogBox, View } from 'react-native';
import { usePathname, Stack, useRouter } from 'expo-router';
import { logger } from '../src/sistema/monitoreo';
import { isFeatureEnabled } from '../src/negocio/roles/FeatureManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HubManager } from '../src/sistema/impresion/legacy/HubManager';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FabRadial from '../src/ui/bloques/FabRadial';
import { useAuthGuard } from '../src/sistema/seguridad';
import { ThemeProvider } from '../src/compartido/temas';
import { theme } from '../src/compartido/theme';
import { useBootstrapper } from '../src/sistema/estado/useBootstrapper';
import { useAppListeners, useFabForRoute, useStore } from '../src/sistema/store';
import { normalizePathname } from '../src/sistema/navegacion/normalizePathname';
import { HardwareProvider } from '../src/sistema/providers/HardwareProvider';
import { NotificationsAudioProvider } from '../src/sistema/providers/NotificationsAudioProvider';
import { TenantConfigProvider } from '../src/sistema/providers/TenantConfigProvider';
import { useInicializacionServiciosTenant } from '../src/sistema/instalacion/hooks/useInicializacionServiciosTenant';

LogBox.ignoreLogs(['Unable to activate keep awake']);
console.info('[T046][MIGRACION_RTDB_AUTORIDAD]');

const PUBLIC_ROUTES = ['/'];

const ROUTE_FEATURES: Record<string, string> = {
  '/_role/venta-crudo': 'venta_crudo',
  '/_role/admin/venta-crudo': 'venta_crudo',
  '/_role/admin/tables': 'restaurante.mesas',
  '/_role/mesero': 'restaurante.mesas',
  '/_role/cocina': 'restaurante.kds',
  '/_role/admin/repart': 'reparto',
};

export default function RootLayout() {
  const isReady = useBootstrapper();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.includes(route)) || pathname === '/';
  useAuthGuard(isReady && !isPublicRoute);
  useAppListeners(isReady);

  // 🛡️ Guardia de Navegación de la Fábrica en Runtime (Fase 3)
  useEffect(() => {
    if (!isReady) return;

    const matchedRoute = Object.keys(ROUTE_FEATURES).find((route) => pathname.startsWith(route));
    if (matchedRoute) {
      const requiredFeature = ROUTE_FEATURES[matchedRoute];
      const isEnabled = isFeatureEnabled(requiredFeature, true);

      if (!isEnabled) {
        logger.warn(
          'ROUTE_GUARD',
          `[Fábrica] Acceso denegado a "${pathname}" (requiere feature flag "${requiredFeature}" activa). Redirigiendo al selector de roles.`
        );
        router.replace('/_role/roles');
      }
    }
  }, [pathname, isReady, router]);

  const tenantPath = useStore((state) => state.sesion.tenantPath);
  const estadoInstalacion = useStore((state) => state.estadoInstalacion);

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
      <HardwareProvider>
        <TenantConfigProvider>
          <GlobalHubManager />

          <GestureHandlerRootView
            style={{ flex: 1, backgroundColor: theme.colors.background, minHeight: '100%' }}
          >
            <NotificationsAudioProvider>
              <View style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
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
              </View>
            </NotificationsAudioProvider>
          </GestureHandlerRootView>
        </TenantConfigProvider>
      </HardwareProvider>
    </ThemeProvider>
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

// D. --- Componente Auxiliar para aislar la lógica del Hub ---
function GlobalHubManager() {
  const [isHubEnabled, setIsHubEnabled] = useState(false);
  const [hubDeviceId, setHubDeviceId] = useState('hub_local');
  const [hubDestination, setHubDestination] = useState<string>('standard');

  const tenantPath = useStore((s) => s.sesion.tenantPath);

  useEffect(() => {
    const checkHubStatus = async () => {
      const enabled = await AsyncStorage.getItem('adi_hub_mode_enabled');
      setIsHubEnabled(enabled === 'true');

      const storedId = await AsyncStorage.getItem('adi_hub_device_id');
      if (storedId) setHubDeviceId(storedId);

      const storedDestino = await AsyncStorage.getItem('adi_hub_destino');
      if (storedDestino) setHubDestination(storedDestino);
    };

    checkHubStatus();
    const interval = setInterval(checkHubStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isHubEnabled || !tenantPath) return null;

  return (
    <HubManager
      enabled={true}
      tenantPath={tenantPath}
      deviceId={hubDeviceId}
      channel={hubDestination === 'restaurante' ? 'standard' : hubDestination}
    />
  );
}
