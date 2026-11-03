/**
 * 🖨️ CEREBRO - GESTIÓN DE IMPRESIÓN
 * Módulo encargado de gestionar la impresión de las cuentas
 * SEPARACIÓN SAGRADA: Solo lógica pura
 */

import type { Database } from 'firebase/database';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MesasRepository, PedidosRepository } from '../../../sistema/persistencia';
import { DespachadorCola } from '../../../sistema/impresion/fierros/cola/DespachadorCola';
import { servicioFierros } from '../../../sistema/impresion/fierros';
import type { ItemCuenta } from '../../../sistema/impresion/fierros/contratos/tipos';
import { createLogger } from '../../../sistema/monitoreo';
import { usePoliticasImpresion } from './usePoliticasImpresion';

const log = createLogger('gestionarImpresion');

type GestionarImpresionProps = {
  db: Database;
  rutaNegocio: string;
  selectedTable: string | null;
  tablesRef: React.MutableRefObject<any[]>;
  liveItems: any[];
  totalOrder: number;
  pedidosRepo: PedidosRepository;
  mesasRepo: MesasRepository;
  onPrintBill?: (mesaId: string) => void;
  pedidoActivo: any;
  ensureConnection?: () => boolean | Promise<boolean>;
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
  rutaNegocio,
  selectedTable,
  tablesRef,
  liveItems,
  totalOrder,
  pedidosRepo,
  mesasRepo,
  onPrintBill,
  pedidoActivo,
  ensureConnection,
}: GestionarImpresionProps) {
  const printPolicies = usePoliticasImpresion({ db, rutaNegocio });
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
      const pedidoId =
        table?.pedidoActivoId || pedidoActivo?.id || `mesa_${selectedTable}_${Date.now()}`;

      if (!liveItems || liveItems.length === 0) {
        log.warn('⚠️ No hay items en la mesa para imprimir cuenta');
        return { success: false, error: 'No hay productos para imprimir' };
      }

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

        const itemsParaCuenta: ItemCuenta[] = liveItems.map((item) => ({
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio,
          variantes:
            formatVariantsForPrintWithLabels(item.variantLabels, item.variantes) || undefined,
        }));

        // 1. Hardware First (Regla 5): Si la terminal tiene una impresora conectada, emitir físicamente el ticket
        if (servicioFierros.estaConectado) {
          try {
            log.info(
              '🖨️ [Hardware] Impresora conectada detectada. Imprimiendo cuenta físicamente...'
            );
            const resFierros = await servicioFierros.imprimirCuenta(
              {
                mesaId: String(selectedTable),
                tipo: 'local',
                items: itemsParaCuenta,
                totales: {
                  subtotal: totalOrder,
                  total: totalOrder,
                },
                timestamp: Date.now(),
              },
              {
                rol: 'mesero',
              }
            );
            log.info('✅ [Hardware] Resultado impresión física:', resFierros);
          } catch (errFierros) {
            log.warn(
              '⚠️ [Hardware] Error al imprimir en fierro (no bloqueante para operación):',
              errFierros
            );
          }
        }

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

        // 2. Encolado remoto idempotente (notificación a spool central / hubs)
        try {
          log.info(`📡 Encolando job: ${jobId}`);
          const job = await DespachadorCola.encolarRemotoIdempotente(db, rutaNegocio, {
            idTrabajo: jobId,
            idPedido: pedidoId,
            proposito: 'cuenta',
            canal: 'standard',
            templateVersion: 'v1',
            payload,
          });
          log.info('✅ Job encolado en spool', { jobId: job.jobId });
        } catch (errCola) {
          log.warn('⚠️ Error al encolar en spool remoto (no bloqueante):', errCola);
        }

        onPrintBill?.(selectedTable);
        setHasPrinted(true);

        if (pedidoId && !pedidoId.startsWith('mesa_')) {
          try {
            await pedidosRepo.actualizar(pedidoId, {
              cuentaImpresa: true,
              cuentaImpresaAt: Date.now(),
            });
          } catch (errRepo) {
            log.warn('⚠️ Error al actualizar estado en pedidosRepo:', errRepo);
          }
        }

        return {
          success: true,
          message: isReprint ? 'Reimpresión enviada' : 'Impresión enviada',
        };
      } catch (error) {
        log.error('❌ Error en flujo de impresión:', error);
        // Resiliencia Dogma ADI: asegurar que el flujo de cobro nunca quede bloqueado
        onPrintBill?.(selectedTable);
        setHasPrinted(true);
        if (pedidoId && !pedidoId.startsWith('mesa_')) {
          try {
            await pedidosRepo.actualizar(pedidoId, {
              cuentaImpresa: true,
              cuentaImpresaAt: Date.now(),
            });
          } catch {}
        }
        return { success: true, message: 'Impresión en cola local / simulada' };
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
      rutaNegocio,
      tablesRef,
      pedidoActivo,
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
      if (ensureConnection) {
        try {
          await ensureConnection();
        } catch {
          // No detener el flujo de cobro
        }
      }
      const isReprint = isReprintOverride ?? hasPrinted;
      const result = await printBill(isReprint);
      const res = result as any;
      if (res && res.success) {
        return { success: true, message: res.message, jobId: res.jobId };
      }
      // Fallback tolerante a fallos
      if (selectedTable) {
        onPrintBill?.(selectedTable);
      }
      setHasPrinted(true);
      return { success: true, message: 'Impresión registrada' };
    },
    [ensureConnection, printBill, hasPrinted, selectedTable, onPrintBill]
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
