/**
 * 🧠 CEREBRO: Gestión de Dispositivos e Impresión
 * Hook de lógica pura para administración de dispositivos
 * SEPARACIÓN SAGRADA: Solo lógica, cero UI
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Database } from 'firebase/database';
import { useStore, type AppStore } from '../../../../core/store';
import { getRtdb } from '../../../../core/firebase';
import {
  DevicesRepository,
  type TicketConfig,
  type HubConfig,
} from '../../../../base/_persistencia/devices.repo';
import {
  mergeWithDefaultPolicies,
  DEFAULT_PRINT_POLICIES,
  type PrintPolicies,
  type PrinterRef,
} from '../../../../core/printing/policies';

type UseDevicesManagementProps = {
  db?: Database;
  tenantPath?: string;
};

const DEFAULT_TICKET_CONFIG: TicketConfig = {
  businessName: 'Mi Negocio',
  printLogo: true,
  paperWidth: 58,
  fontSize: 'normal',
  printDate: true,
  printTime: true,
  printCashier: true,
};

export function useDevicesManagement(props?: UseDevicesManagementProps) {
  const storeTenantPath = useStore((s) => s.sesion.tenantPath) || '';
  const ds = useStore((s: AppStore) => s.dataSources);

  const tenantPath = props?.tenantPath !== undefined ? props.tenantPath : storeTenantPath;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  const devicesRepo = useMemo(() => new DevicesRepository(db, tenantPath), [db, tenantPath]);

  // Estado: Políticas de impresión
  const [rawPolicies, setRawPolicies] = useState<Partial<PrintPolicies> | null>(null);
  const policies = useMemo(
    () => mergeWithDefaultPolicies(rawPolicies || DEFAULT_PRINT_POLICIES),
    [rawPolicies]
  );

  // Estado: Impresora por defecto
  const [defaultPrinter, setDefaultPrinter] = useState<PrinterRef | null>(null);

  // Estado: Mensaje de prueba
  const [testMessage, setTestMessage] = useState<string>('');

  // Estado: Configuración de ticket
  const [rawTicketConfig, setRawTicketConfig] = useState<Partial<TicketConfig> | null>(null);
  const ticketConfig = useMemo(
    () => ({ ...DEFAULT_TICKET_CONFIG, ...(rawTicketConfig || {}) } as TicketConfig),
    [rawTicketConfig]
  );

  // Estado: Configuración de Hub Central
  const [hubConfig, setHubConfig] = useState<Partial<HubConfig> | null>(null);

  // Estado: Loading
  const [loading, setLoading] = useState(true);

  // Suscripciones
  useEffect(() => {
    if (!tenantPath) {
      setTimeout(() => {
        setLoading(false);
      }, 0);
      return;
    }

    setTimeout(() => {
      setLoading(true);
    }, 0);

    const unsubPolicies = devicesRepo.suscribirPoliticasImpresion((data) => {
      setRawPolicies(data);
      setLoading(false);
    });

    const unsubPrinter = devicesRepo.suscribirDefaultPrinter((data) => {
      setDefaultPrinter(data);
    });

    const unsubTestMessage = devicesRepo.suscribirTestMessage((data) => {
      setTestMessage(data);
    });

    const unsubTicketConfig = devicesRepo.suscribirTicketConfig((data) => {
      setRawTicketConfig(data);
    });

    const unsubHubConfig = devicesRepo.suscribirHubConfig((data) => {
      setHubConfig(data);
    });

    return () => {
      unsubPolicies();
      unsubPrinter();
      unsubTestMessage();
      unsubTicketConfig();
      unsubHubConfig();
    };
  }, [devicesRepo, tenantPath]);

  // Acciones: Políticas
  const togglePermitirMeseraImprimir = useCallback(async () => {
    await devicesRepo.actualizarPoliticasImpresion({
      permitirMeseraImprimirCuenta: !policies.permitirMeseraImprimirCuenta,
    });
  }, [devicesRepo, policies.permitirMeseraImprimirCuenta]);

  const togglePermitirCocinaImprimir = useCallback(async () => {
    await devicesRepo.actualizarPoliticasImpresion({
      permitirCocinaImprimirCuenta: !policies.permitirCocinaImprimirCuenta,
    });
  }, [devicesRepo, policies.permitirCocinaImprimirCuenta]);

  const togglePermitirAdminImprimir = useCallback(async () => {
    await devicesRepo.actualizarPoliticasImpresion({
      permitirAdminImprimirCuenta: !policies.permitirAdminImprimirCuenta,
    });
  }, [devicesRepo, policies.permitirAdminImprimirCuenta]);

  // Acciones: Impresora por defecto
  const establecerDefaultPrinter = useCallback(
    async (printer: PrinterRef | null) => {
      await devicesRepo.establecerDefaultPrinter(printer);
    },
    [devicesRepo]
  );

  const quitarDefaultPrinter = useCallback(async () => {
    await devicesRepo.establecerDefaultPrinter(null);
  }, [devicesRepo]);

  // Acciones: Mensaje de prueba
  const actualizarTestMessage = useCallback(
    async (message: string) => {
      await devicesRepo.establecerTestMessage(message);
    },
    [devicesRepo]
  );

  // Acciones: Configuración de ticket
  const actualizarTicketConfig = useCallback(
    async (config: TicketConfig) => {
      await devicesRepo.actualizarTicketConfig(config);
    },
    [devicesRepo]
  );

  // Acciones: Configuración de Hub Central
  const establecerHubConfig = useCallback(
    async (config: HubConfig) => {
      await devicesRepo.establecerHubConfig(config);
    },
    [devicesRepo]
  );

  const actualizarHubConfig = useCallback(
    async (updates: Partial<HubConfig>) => {
      await devicesRepo.actualizarHubConfig(updates);
    },
    [devicesRepo]
  );

  return {
    // Estado
    policies,
    defaultPrinter,
    testMessage,
    ticketConfig,
    hubConfig,
    loading,

    // Acciones
    actions: {
      togglePermitirMeseraImprimir,
      togglePermitirCocinaImprimir,
      togglePermitirAdminImprimir,
      establecerDefaultPrinter,
      quitarDefaultPrinter,
      actualizarTestMessage,
      actualizarTicketConfig,
      establecerHubConfig,
      actualizarHubConfig,
    },
  };
}
