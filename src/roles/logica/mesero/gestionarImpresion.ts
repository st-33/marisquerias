/**
 * 🖨️ CEREBRO - GESTIÓN DE IMPRESIÓN
 * Módulo encargado de gestionar la impresión de las cuentas
 * SEPARACIÓN SAGRADA: Solo lógica pura
 */

import type { Database } from 'firebase/database';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MesasRepository, PedidosRepository } from '../../../sistema/persistencia';
import { enqueuePrintIdempotent } from '../../../sistema/impresion/legacy/printService';
import { createLogger } from '../../../sistema/utilidades/logger';
import { usePrintPolicies } from './usePrintPolicies';

const log = createLogger('gestionarImpresion');

type GestionarImpresionProps = {
  db: Database;
  tenantPath: string;
  selectedTable: string | null;
  tablesRef: React.MutableRefObject<any[]>;
  liveItems: any[];
  totalOrder: number;
  pedidosRepo: PedidosRepository;
  mesasRepo: MesasRepository;
  onPrintBill?: (mesaId: string) => void;
  pedidoActivo: any;
};

const formatVariantsForPrint = (variants?: Record<string, string[]>) => {
  if (!variants) return undefined;
  const flattened = Object.values(variants).flat().filter(Boolean);
  return flattened.length ? flattened.join(', ') : undefined;
};

const formatVariantsForPrintWithLabels = (
  labels?: string[] | null,
  variants?: Record<string, string[]>
) => {
  if (Array.isArray(labels) && labels.length > 0) {
    return labels.join(', ');
  }
  return formatVariantsForPrint(variants);
};

export function useGestionarImpresion({
  db,
  tenantPath,
  selectedTable,
  tablesRef,
  liveItems,
  totalOrder,
  pedidosRepo,
  mesasRepo,
  onPrintBill,
  pedidoActivo,
}: GestionarImpresionProps) {
  const printPolicies = usePrintPolicies({ db, tenantPath });
  const printPoliciesRef = useRef(printPolicies);

  useEffect(() => {
    printPoliciesRef.current = printPolicies;
  }, [printPolicies]);

  const [hasPrinted, setHasPrinted] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const isPrintingRef = useRef<number>(0);

  useEffect(() => {
    const isBillPrinted = !!pedidoActivo?.cuentaImpresa;
    if (hasPrinted !== isBillPrinted) {
      setTimeout(() => {
        setHasPrinted(isBillPrinted);
      }, 0);
    }
  }, [pedidoActivo?.cuentaImpresa, hasPrinted]);

  const printBill = useCallback(
    async (isReprint: boolean = false) => {
      const now = Date.now();
      const lastPrintAttempt = isPrintingRef.current;

      if (lastPrintAttempt && now - lastPrintAttempt < 500) {
        log.warn('🔒 Clic duplicado bloqueado por debounce (<500ms)');
        return { success: false, error: 'Procesando impresión...' };
      }

      if (isPrinting) {
        log.warn('🔒 Ya se está imprimiendo (state check)');
        return { success: false, error: 'Ya se está imprimiendo' };
      }

      if (!selectedTable) {
        return { success: false, error: 'No hay mesa seleccionada' };
      }

      if (printPoliciesRef.current.permitirMeseraImprimirCuenta === false) {
        log.warn('⛔ Mesera NO tiene permiso para imprimir');
        return { success: false, error: 'Sin permiso para imprimir' };
      }

      const table = tablesRef.current.find((t) => t.id === selectedTable);
      if (!table?.pedidoActivoId) {
        return { success: false, error: 'No hay pedido activo' };
      }

      const pedidoId = table.pedidoActivoId;

      try {
        isPrintingRef.current = now;
        setIsPrinting(true);

        const printType = isReprint ? 'Reimprimiendo' : 'Imprimiendo';
        log.info(`🖨️ ${printType} cuenta...`, { pedidoId, isReprint });

        const jobId = isReprint
          ? `job_cuenta_v1_${pedidoId}_reprint_${Date.now()}`
          : `job_cuenta_v1_${pedidoId}`;

        const printableItems = liveItems.map((item) => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio,
          variantes: formatVariantsForPrintWithLabels(item.variantLabels, item.variantes) || [],
        }));

        const payload = {
          mesaId: selectedTable,
          tipo: 'mesa',
          items: printableItems,
          totales: {
            subtotal: totalOrder,
            total: totalOrder,
          },
          timestamp: Date.now(),
        };

        log.info(`📡 Encolando job: ${jobId}`);

        const job = await enqueuePrintIdempotent(db, tenantPath, {
          jobId,
          orderId: pedidoId,
          purpose: 'cuenta',
          templateVersion: 'v1',
          payload: payload,
        } as any);

        log.info('✅ Job encolado', { jobId: job.jobId });

        onPrintBill?.(selectedTable);
        setHasPrinted(true);

        await pedidosRepo.actualizar(pedidoId, {
          cuentaImpresa: true,
          cuentaImpresaAt: Date.now(),
        });

        return {
          success: true,
          message: isReprint ? 'Reimpresión enviada' : 'Impresión enviada',
        };
      } catch (error) {
        log.error('❌ Error:', error);
        return { success: false, error: 'Error al imprimir' };
      } finally {
        setTimeout(() => {
          isPrintingRef.current = 0;
        }, 500);
        setIsPrinting(false);
      }
    },
    [
      selectedTable,
      liveItems,
      totalOrder,
      pedidosRepo,
      onPrintBill,
      isPrinting,
      db,
      tenantPath,
      tablesRef,
    ]
  );

  const printBillWithConnectionCheck = useCallback(
    async (
      isReprintOverride?: boolean
    ): Promise<{
      success: boolean;
      message?: string;
      error?: string;
      requiresConnection?: boolean;
      jobId?: string;
    }> => {
      const isReprint = isReprintOverride ?? hasPrinted;
      const result = await printBill(isReprint);
      const res = result as any;
      if (res && !res.success) {
        const errorMsg = res.message || res.error || 'Error desconocido';
        return { success: false, error: errorMsg };
      }
      if (res && res.success) {
        return { success: true, message: res.message, jobId: res.jobId };
      }
      return { success: false, error: 'Error desconocido' };
    },
    [printBill, hasPrinted]
  );

  const requestBill = useCallback(async () => {
    if (!selectedTable) return { success: false, error: 'No hay mesa seleccionada' };

    try {
      const table = tablesRef.current.find((t) => t.id === selectedTable);
      if (!table?.pedidoActivoId) {
        return { success: false, error: 'No hay pedido activo' };
      }

      await mesasRepo.solicitarCuenta(selectedTable);
      return { success: true };
    } catch (error) {
      log.error('Error al solicitar cuenta:', error);
      return { success: false, error: 'Error al solicitar cuenta' };
    }
  }, [selectedTable, mesasRepo, tablesRef]);

  return {
    hasPrinted,
    setHasPrinted,
    isPrinting,
    printPolicies,
    printBill,
    printBillWithConnectionCheck,
    requestBill,
  };
}
