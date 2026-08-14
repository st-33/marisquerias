export type PrintPolicies = {
  permitirMeseraImprimirCuenta: boolean;
  permitirCocinaImprimirCuenta: boolean;
  permitirAdminImprimirCuenta: boolean;
  maxReprintsByRole: { mesera: number; cocina: number; admin: number };
  timeouts: {
    bleConnectMs: number;
    lanConnectMs: number;
    writeMs: number;
    jobMsBle: number;
    jobMsLan: number;
  };
  retries: { write: number };
};

export const DEFAULT_PRINT_POLICIES: PrintPolicies = {
  permitirMeseraImprimirCuenta: true,
  permitirCocinaImprimirCuenta: true,
  permitirAdminImprimirCuenta: true,
  maxReprintsByRole: { mesera: 1, cocina: 3, admin: 999 },
  timeouts: {
    bleConnectMs: 4000,
    lanConnectMs: 2000,
    writeMs: 2000,
    jobMsBle: 10000,
    jobMsLan: 5000,
  },
  retries: { write: 3 },
};

export function mergeWithDefaultPolicies(
  input: Partial<PrintPolicies> | null | undefined
): PrintPolicies {
  const base = input || ({} as any);
  const out: PrintPolicies = {
    permitirMeseraImprimirCuenta: base.permitirMeseraImprimirCuenta !== false,
    permitirCocinaImprimirCuenta: base.permitirCocinaImprimirCuenta !== false,
    permitirAdminImprimirCuenta: base.permitirAdminImprimirCuenta !== false,
    maxReprintsByRole: {
      mesera: Number(
        base?.maxReprintsByRole?.mesera ?? DEFAULT_PRINT_POLICIES.maxReprintsByRole.mesera
      ),
      cocina: Number(
        base?.maxReprintsByRole?.cocina ?? DEFAULT_PRINT_POLICIES.maxReprintsByRole.cocina
      ),
      admin: Number(
        base?.maxReprintsByRole?.admin ?? DEFAULT_PRINT_POLICIES.maxReprintsByRole.admin
      ),
    },
    timeouts: {
      bleConnectMs: Number(
        base?.timeouts?.bleConnectMs ?? DEFAULT_PRINT_POLICIES.timeouts.bleConnectMs
      ),
      lanConnectMs: Number(
        base?.timeouts?.lanConnectMs ?? DEFAULT_PRINT_POLICIES.timeouts.lanConnectMs
      ),
      writeMs: Number(base?.timeouts?.writeMs ?? DEFAULT_PRINT_POLICIES.timeouts.writeMs),
      jobMsBle: Number(base?.timeouts?.jobMsBle ?? DEFAULT_PRINT_POLICIES.timeouts.jobMsBle),
      jobMsLan: Number(base?.timeouts?.jobMsLan ?? DEFAULT_PRINT_POLICIES.timeouts.jobMsLan),
    },
    retries: { write: Number(base?.retries?.write ?? DEFAULT_PRINT_POLICIES.retries.write) },
  };
  return out;
}

export type PrinterRef = { address: string; name: string };
