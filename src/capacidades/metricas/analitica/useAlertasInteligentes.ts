/**
 * 🚨 HOOK: useAlertasInteligentes (Refactorizado V2.0 - DOGMA V2)
 * Conecta predicciones inteligentes con alertas automáticas
 * Transforma datos pasivos en acciones activas
 */

import { useMemo, useState } from 'react';
import { usePrediccionStock, type PrediccionPlatillo } from './usePrediccionStock';

export type AlertaInteligente = {
  id: string;
  tipo: 'producto_no_producible' | 'stock_critico' | 'capacidad_baja' | 'ingrediente_faltante';
  severidad: 'alta' | 'media' | 'baja';
  titulo: string;
  mensaje: string;
  productoId?: string;
  productoNombre?: string;
  ingredienteLimitante?: string;
  cantidadPosible?: number;
  accionSugerida?: string;
  timestamp: number;
};

export type UseAlertasInteligentesResult = {
  alertas: AlertaInteligente[];
  alertasCriticas: AlertaInteligente[];
  alertasMedias: AlertaInteligente[];
  alertasBajas: AlertaInteligente[];
  tieneAlertas: boolean;
  loading: boolean;
};

type UseAlertasInteligentesProps = {
  umbralCritico?: number; // Cantidad mínima para considerar crítico (default: 0)
  umbralBajo?: number; // Cantidad mínima para alerta media (default: 5)
};

export function useAlertasInteligentes({
  umbralCritico = 0,
  umbralBajo = 5,
}: UseAlertasInteligentesProps = {}): UseAlertasInteligentesResult {
  const { predicciones, loading: loadingPredicciones } = usePrediccionStock();
  // Mantener un timestamp estable para la generación de alertas.
  const [ahora] = useState(() => Date.now());

  // Generar alertas basadas en predicciones
  const alertas = useMemo(() => {
    if (loadingPredicciones) {
      return [];
    }

    const nuevasAlertas: AlertaInteligente[] = [];
    predicciones.forEach((pred: PrediccionPlatillo) => {
      // ALERTA CRÍTICA: Producto no producible (cantidad = 0)
      if (pred.cantidadPosible === 0) {
        nuevasAlertas.push({
          id: `no-producible-${pred.productoId}`,
          tipo: 'producto_no_producible',
          severidad: 'alta',
          titulo: 'Producto No Producible',
          mensaje: `${pred.productoNombre} no se puede producir. Falta: ${pred.ingredienteLimitante}`,
          productoId: pred.productoId,
          productoNombre: pred.productoNombre,
          ingredienteLimitante: pred.ingredienteLimitante,
          cantidadPosible: 0,
          accionSugerida: `Reabastecer ${pred.ingredienteLimitante} para habilitar producción`,
          timestamp: ahora,
        });
      }
      // ALERTA MEDIA: Capacidad baja (cantidad < umbralBajo)
      else if (pred.cantidadPosible < umbralBajo && pred.cantidadPosible > 0) {
        nuevasAlertas.push({
          id: `capacidad-baja-${pred.productoId}`,
          tipo: 'capacidad_baja',
          severidad: 'media',
          titulo: 'Capacidad de Producción Baja',
          mensaje: `${pred.productoNombre}: Solo se pueden hacer ${pred.cantidadPosible} unidades. Limitado por: ${pred.ingredienteLimitante}`,
          productoId: pred.productoId,
          productoNombre: pred.productoNombre,
          ingredienteLimitante: pred.ingredienteLimitante,
          cantidadPosible: pred.cantidadPosible,
          accionSugerida: `Considerar reabastecer ${pred.ingredienteLimitante}`,
          timestamp: ahora,
        });
      }
      // ALERTA BAJA: Stock suficiente pero cerca del límite
      else if (pred.cantidadPosible < umbralBajo * 2 && pred.cantidadPosible >= umbralBajo) {
        nuevasAlertas.push({
          id: `stock-ok-${pred.productoId}`,
          tipo: 'stock_critico',
          severidad: 'baja',
          titulo: 'Stock Aceptable',
          mensaje: `${pred.productoNombre}: ${pred.cantidadPosible} unidades disponibles. Ingrediente limitante: ${pred.ingredienteLimitante}`,
          productoId: pred.productoId,
          productoNombre: pred.productoNombre,
          ingredienteLimitante: pred.ingredienteLimitante,
          cantidadPosible: pred.cantidadPosible,
          accionSugerida: 'Monitorear stock',
          timestamp: ahora,
        });
      }
    });

    return nuevasAlertas;
  }, [ahora, predicciones, loadingPredicciones, umbralBajo]);

  // Categorizar alertas por severidad
  const alertasCriticas = useMemo(() => alertas.filter((a) => a.severidad === 'alta'), [alertas]);

  const alertasMedias = useMemo(() => alertas.filter((a) => a.severidad === 'media'), [alertas]);

  const alertasBajas = useMemo(() => alertas.filter((a) => a.severidad === 'baja'), [alertas]);

  const tieneAlertas = alertas.length > 0;

  return {
    alertas,
    alertasCriticas,
    alertasMedias,
    alertasBajas,
    tieneAlertas,
    loading: loadingPredicciones,
  };
}
