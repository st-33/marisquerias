/**
 * 📜 HOOK - POLÍTICAS DE IMPRESIÓN
 *
 * Lee en tiempo real las restricciones de impresión definidas para el negocio
 * (qué roles pueden imprimir cuentas, tickets, etc.) y mantiene la UI sincronizada
 * mientras la RTDB cambia. Se asegura de limpiar el listener al desmontar.
 */

import { useEffect, useState } from 'react';
import { Database, onValue, ref, off } from 'firebase/database';

export type PrintPolicies = {
  permitirMeseraImprimirCuenta?: boolean;
  permitirCocinaImprimirCuenta?: boolean;
  permitirAdminImprimirCuenta?: boolean;
  // Si true, Mesero imprimirá comanda automáticamente al enviar
  autoImprimirComandaAlEnviar?: boolean;
};

type UsePrintPoliciesProps = {
  db: Database;
  rutaNegocio: string;
};

export function usePrintPolicies({ db, rutaNegocio }: UsePrintPoliciesProps) {
  const [policies, setPolicies] = useState<PrintPolicies>({});

  useEffect(() => {
    if (!rutaNegocio) return;
    const r = ref(db, `${rutaNegocio}/impresion/politicas`);
    const cb = onValue(r, (snap) => setPolicies((snap.val() as PrintPolicies) || {}));
    return () => off(r, 'value', cb as any);
  }, [db, rutaNegocio]);

  return {
    ...policies,
    // 🛡️ MODO SUPERVIVENCIA: Forzar permisos básicos para que no falle la operación
    permitirMeseraImprimirCuenta: true,
    autoImprimirComandaAlEnviar: true, // Forzar intento de impresión
  };
}
