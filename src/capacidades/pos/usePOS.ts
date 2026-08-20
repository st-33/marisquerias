/**
 * 🧠 CEREBRO - LÓGICA DE PUNTO DE VENTA (POS)
 *
 * Hook maestro que gestiona toda la lógica del módulo de caja rápida / POS.
 *
 * PROCESO 1 (TIENDAS):
 * - Venta rápida con escáner de código de barras
 * - Venta por peso con báscula (carnicerías, frutas/verduras)
 * - Descuento automático de inventario
 * - Impresión de ticket de venta
 *
 * SEPARACIÓN SAGRADA:
 * - Este hook NUNCA renderiza UI
 * - Solo maneja estado, suscripciones y acciones
 * - Usa repositorios y HardwareService para acceder a datos/dispositivos
 *
 * REUTILIZABLE en cualquier negocio de venta al público (tienda de abarrotes,
 * carnicería, panadería, marisquería, etc.)
 */

import type { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MenuRepository, type Producto } from '../../sistema/persistencia';
import {
  hardwareService,
  type CodigoResult,
  type PesoResult,
} from '../../sistema/servicios/HardwareService';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Item en el carrito de venta
 */
export interface ItemVenta {
  id: string; // ID único en el carrito
  productoId: string; // ID del producto en el menú
  codigo?: string; // Código de barras
  nombre: string;
  precio: number;
  cantidad: number;
  unidad: 'pza' | 'kg' | 'lt' | 'otro';
  peso?: number; // Si es venta por peso
  subtotal: number;
  notas?: string;
}

/**
 * Totales de la venta
 */
export interface TotalesVenta {
  subtotal: number;
  descuento: number;
  total: number;
  itemsCount: number;
}

/**
 * Métodos de pago soportados
 */
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';

/**
 * Venta completada
 */
export interface Venta {
  id: string;
  items: ItemVenta[];
  totales: TotalesVenta;
  metodoPago: MetodoPago;
  efectivo?: number; // Monto recibido en efectivo
  cambio?: number; // Cambio devuelto
  timestamp: number;
  vendedor?: string; // ID o nombre del vendedor
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UsePOSProps {
  db: Database;
  tenantPath: string;
  vendedor?: string;
}

export function usePOS({ db, tenantPath, vendedor }: UsePOSProps) {
  // Repositorios
  const menuRepo = useMemo(() => new MenuRepository(db, tenantPath), [db, tenantPath]);

  // Estado
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [productos, setProductos] = useState<Record<string, Producto>>({});
  const [loading, setLoading] = useState(true);
  const [modoEscaneo, setModoEscaneo] = useState(false);
  const [ultimoEscaneado, setUltimoEscaneado] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARGA INICIAL
  // ═══════════════════════════════════════════════════════════════════════════

  // Cargar productos del menú
  useEffect(() => {
    if (!tenantPath) return;

    const unsub = menuRepo.suscribirProductos((productosData) => {
      setProductos(productosData);
      setLoading(false);
    });

    return unsub;
  }, [menuRepo, tenantPath]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES - CARRITO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Agregar producto al carrito
   */
  const agregarAlCarrito = useCallback(
    async (productoId: string, cantidad: number) => {
      const producto = productos[productoId];
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      // Verificar stock disponible
      // TODO: Implementar verificación de stock

      const itemId = `item-${Date.now()}-${Math.random()}`;
      const subtotal = producto.precio * cantidad;

      const nuevoItem: ItemVenta = {
        id: itemId,
        productoId: producto.id,
        codigo: producto.codigoBarras,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad,
        unidad: (producto.unidad as 'pza' | 'kg' | 'lt' | 'otro') || 'pza',
        peso: producto.unidad === 'kg' ? cantidad : undefined,
        subtotal,
      };

      setCarrito((prev) => [...prev, nuevoItem]);
    },
    [productos]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES - ESCANEO Y BÚSQUEDA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Escanear código de barras y agregar al carrito
   */
  const escanearProducto = useCallback(async () => {
    if (!hardwareService.hasScanner()) {
      throw new Error('No hay escáner configurado');
    }

    const result: CodigoResult = await hardwareService.escanearCodigo();

    if (!result.success || !result.codigo) {
      throw new Error(result.message || 'Error al escanear código');
    }

    setUltimoEscaneado(result.codigo);

    // Buscar producto por código de barras
    const producto = Object.values(productos).find(
      (p) => p.codigoBarras === result.codigo && p.visible?.mesero !== false
    );

    if (!producto) {
      throw new Error(`Producto no encontrado: ${result.codigo}`);
    }

    // Agregar al carrito
    await agregarAlCarrito(producto.id, 1);

    return result.codigo;
  }, [productos]);

  /**
   * Activar modo escaneo continuo
   */
  const activarEscaneoContinuo = useCallback(async () => {
    if (!hardwareService.hasScanner()) {
      throw new Error('No hay escáner configurado');
    }

    const stopScanning = await hardwareService.escanearContinuo(async (result) => {
      if (!result.success || !result.codigo) return;

      setUltimoEscaneado(result.codigo);

      // Buscar producto por código de barras
      const producto = Object.values(productos).find(
        (p) => p.codigoBarras === result.codigo && p.visible?.mesero !== false
      );

      if (producto) {
        await agregarAlCarrito(producto.id, 1);
      }
    });

    setModoEscaneo(true);

    return stopScanning;
  }, [productos]);

  /**
   * Desactivar modo escaneo continuo
   */
  const desactivarEscaneoContinuo = useCallback((stopFunction: () => void) => {
    stopFunction();
    setModoEscaneo(false);
  }, []);

  /**
   * Buscar producto por código manualmente
   */
  const buscarPorCodigo = useCallback(
    async (codigo: string) => {
      const producto = Object.values(productos).find(
        (p) => p.codigoBarras === codigo && p.visible?.mesero !== false
      );

      if (!producto) {
        throw new Error(`Producto no encontrado: ${codigo}`);
      }

      return producto;
    },
    [productos]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES - BÁSCULA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Leer peso de báscula y agregar producto al carrito
   */
  const pesarProducto = useCallback(
    async (productoId: string) => {
      if (!hardwareService.hasScale()) {
        throw new Error('No hay báscula configurada');
      }

      const producto = productos[productoId];
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      // Leer peso
      const result: PesoResult = await hardwareService.leerPeso({
        aplicarTara: true,
        esperarEstabilidad: true,
      });

      if (!result.success || !result.peso) {
        throw new Error(result.message || 'Error al leer peso');
      }

      // Agregar al carrito con el peso
      await agregarAlCarrito(productoId, result.peso);

      return result;
    },
    [productos]
  );

  /**
   * Tarar báscula
   */
  const tararBascula = useCallback(async () => {
    if (!hardwareService.hasScale()) {
      throw new Error('No hay báscula configurada');
    }

    const result = await hardwareService.tararBascula();

    if (!result.success) {
      throw new Error(result.message || 'Error al tarar báscula');
    }

    return result;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES - CARRITO CONTINUACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Actualizar cantidad de un item en el carrito
   */
  const actualizarCantidad = useCallback((itemId: string, nuevaCantidad: number) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, cantidad: nuevaCantidad, subtotal: item.precio * nuevaCantidad }
          : item
      )
    );
  }, []);

  /**
   * Eliminar item del carrito
   */
  const eliminarItem = useCallback((itemId: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  /**
   * Limpiar carrito completo
   */
  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
  }, []);

  /**
   * Calcular totales de la venta
   */
  const calcularTotales = useCallback((): TotalesVenta => {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento = 0; // TODO: Implementar lógica de descuentos
    const total = subtotal - descuento;
    const itemsCount = carrito.length;

    return { subtotal, descuento, total, itemsCount };
  }, [carrito]);

  const totales = useMemo(() => calcularTotales(), [calcularTotales]);
  const completarVenta = useCallback(
    async (metodoPago: MetodoPago, efectivo?: number): Promise<Venta> => {
      if (carrito.length === 0) {
        throw new Error('El carrito está vacío');
      }

      const totales = calcularTotales();

      // Calcular cambio si es efectivo
      let cambio = 0;
      if (metodoPago === 'efectivo' && efectivo) {
        cambio = Math.max(0, efectivo - totales.total);
      }

      const venta: Venta = {
        id: `VENTA-${Date.now()}`,
        items: carrito,
        totales,
        metodoPago,
        efectivo,
        cambio,
        timestamp: Date.now(),
        vendedor,
      };

      // Imprimir ticket de venta
      if (hardwareService.hasPrinter()) {
        await hardwareService.imprimirTicketVenta({
          items: carrito.map((item) => ({
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio: item.precio,
            peso: item.peso,
          })),
          total: totales.total,
          timestamp: venta.timestamp,
        });
      }

      // Limpiar carrito
      limpiarCarrito();

      return venta;
    },
    [carrito, vendedor, calcularTotales, limpiarCarrito]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Estado
    carrito,
    productos,
    loading,
    modoEscaneo,
    ultimoEscaneado,
    totales,

    // Acciones - Escaneo
    escanearProducto,
    activarEscaneoContinuo,
    desactivarEscaneoContinuo,
    buscarPorCodigo,

    // Acciones - Báscula
    pesarProducto,
    tararBascula,

    // Acciones - Carrito
    agregarAlCarrito,
    actualizarCantidad,
    eliminarItem,
    limpiarCarrito,

    // Acciones - Venta
    completarVenta,

    // Hardware
    tieneBascula: hardwareService.hasScale(),
    tieneEscaner: hardwareService.hasScanner(),
    tieneImpresora: hardwareService.hasPrinter(),
  };
}
