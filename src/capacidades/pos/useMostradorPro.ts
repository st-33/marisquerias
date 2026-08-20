/**
 * ⚡ HOOK MOSTRADOR PRO (VENTA Y CRUDO)
 * Refactorizado Phase 2:
 * - Registro de Ventas (SimpleSalesRepo)
 * - Impresión Robusta al Hub (Web & Native)
 * - Soporte Offline (SQLite + Bluetooth Fallback)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MenuRepository, type Producto } from '../../sistema/persistencia';
import { InventoryV2Repository } from '../../sistema/persistencia/inventory.v2.repo';
import type { Categoria } from '../../sistema/persistencia/menu.repo';
import { SimpleSalesRepo } from '../../sistema/persistencia/SimpleSalesRepo';
import { getRtdb } from '../../sistema/firebase';
import { SQLiteStorageAdapter } from '../../sistema/offline/storage/SQLiteStorageAdapter';
import { OfflinePrintFallback } from '../../sistema/servicios/OfflinePrintFallback';
import { DespachadorCola } from '../../sistema/impresion/fierros/cola/DespachadorCola';
import { useStore } from '../../sistema/store';
import { resolverDeviceIdADI } from '../../sistema/instalacion/vinculacion/generar-device-id-adi';
import { useConfiguracionTenant } from '../../sistema/proveedores/ProveedorConfiguracionTenant';
import { usePosConfig } from './usePosConfig';
import { useCaracteristica } from '../../negocio/roles/GestorCaracteristicas';

function stripUndefinedDeep<T>(input: T): T {
  if (input === undefined) return null as any;
  if (input === null) return input;
  if (Array.isArray(input)) {
    return input.map((v) => stripUndefinedDeep(v)) as any;
  }
  if (typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out;
  }
  return input;
}

export type UseMostradorProProps = {
  db?: any;
  tenantPath?: string;
};

export function useMostradorPro(props?: UseMostradorProProps) {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Record<string, Producto>>({});
  const [categorias, setCategorias] = useState<Record<string, Categoria>>({});
  const [carrito, setCarrito] = useState<any[]>([]);
  const [ultimoTicket, setUltimoTicket] = useState<any | null>(null);
  const [efectivo, setEfectivo] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('desconocido');

  const storeTenantPath = useStore((state) => state.sesion.tenantPath) || '';
  const ds = useStore((state) => state.dataSources);
  const usuario = useStore((state) => state.sesion.usuario?.nombre) || 'Mostrador';

  const tenantPath = props?.tenantPath !== undefined ? props.tenantPath : storeTenantPath;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  useConfiguracionTenant();
  const { config: posConfig, loading: configLoading } = usePosConfig(db, tenantPath);
  const menuRepo = useMemo(() => new MenuRepository(db, tenantPath), [db, tenantPath]);
  const salesRepo = useMemo(() => new SimpleSalesRepo(db, tenantPath), [db, tenantPath]);
  const inventoryRepo = useMemo(() => new InventoryV2Repository(db, tenantPath), [db, tenantPath]);

  useEffect(() => {
    resolverDeviceIdADI()
      .then(setDeviceId)
      .catch((err) => console.error('[MostradorPro] Error obteniendo deviceId:', err));
  }, []);
  const isInventarioEnabled = useCaracteristica('inventario', true);
  const isImpresionEnabled = useCaracteristica('impresion', true);
  const isBasculaEnabled = useCaracteristica('bascula', true);
  const isDeliveryEnabled = useCaracteristica('delivery', true);

  const rawInventoryAutoDiscount = useStore(
    (s) => s.negocio.features?.inventory_auto_discount?.enabled ?? true
  );
  const inventoryAutoDiscount = isInventarioEnabled && rawInventoryAutoDiscount;

  // --- Carga de Datos ---
  useEffect(() => {
    if (!tenantPath) return;

    // Cargar caché local primero por si estamos offline o para render rápido
    const cargarCacheOffline = async () => {
      try {
        const cachedProds = await SQLiteStorageAdapter.getProductos();
        const cachedCats = await SQLiteStorageAdapter.getCategorias();
        if (cachedProds && Object.keys(cachedProds).length > 0) {
          setProductos(cachedProds as Record<string, Producto>);
        }
        if (cachedCats && Object.keys(cachedCats).length > 0) {
          setCategorias(cachedCats as Record<string, Categoria>);
          setLoading(false);
        }
      } catch (err) {
        console.error('[MostradorPro] Error cargando caché de SQLite:', err);
      }
    };
    void cargarCacheOffline();

    const unsubMenu = menuRepo.suscribirProductos((data) => {
      setProductos(data);
      if (data && Object.keys(data).length > 0) {
        void SQLiteStorageAdapter.saveProductosBulk(data);
      }
    });

    const unsubCats = menuRepo.suscribirCategorias((data) => {
      setCategorias(data);
      setLoading(false);
      if (data && Object.keys(data).length > 0) {
        void SQLiteStorageAdapter.saveCategoriasBulk(data);
      }
    });

    return () => {
      unsubMenu();
      unsubCats();
    };
  }, [tenantPath, menuRepo]);

  // --- Computados ---
  const total = useMemo(
    () => carrito.reduce((acc, current) => acc + current.subtotal, 0),
    [carrito]
  );
  const cambio = useMemo(() => {
    const nTotal = total;
    const nEfectivo = parseFloat(efectivo) || 0;
    return Math.max(0, nEfectivo - nTotal);
  }, [total, efectivo]);

  // --- Acciones del Carrito ---
  const agregarAlCarrito = useCallback((producto: Producto, cantidad: number) => {
    setCarrito((prev) => {
      const id = `${producto.id}-${Math.random().toString(36).substr(2, 9)}`;
      return [
        ...prev,
        {
          id,
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad,
          subtotal: producto.precio * cantidad,
          unidad: producto.unidad || 'pza',
        },
      ];
    });
  }, []);

  const eliminarItem = (id: string) => setCarrito((prev) => prev.filter((i) => i.id !== id));

  const limpiarCarrito = () => setCarrito([]);

  const agregarPorCodigo = useCallback(
    (codigo: string) => {
      const producto = Object.values(productos).find((p) => p.codigoBarras === codigo);
      if (producto) {
        agregarAlCarrito(producto, 1);
        return true;
      }
      return false;
    },
    [productos, agregarAlCarrito]
  );

  // --- Finalización ---
  const completarVenta = async (metodoPago: string) => {
    const safeItems = (carrito || []).map((it) => {
      const productoId =
        typeof it?.productoId === 'string'
          ? it.productoId
          : typeof it?.productId === 'string'
            ? it.productId
            : null;

      return stripUndefinedDeep({
        id: it?.id,
        productoId,
        productId: productoId,
        nombre: it?.nombre,
        precio: it?.precio,
        cantidad: it?.cantidad,
        subtotal: it?.subtotal,
        unidad: it?.unidad ?? 'pza',
      });
    });

    // 1. Preparar Payload
    const randomHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const ventaId = `vc_${deviceId}_${Date.now()}_${randomHash}`;
    const payload = stripUndefinedDeep({
      id: ventaId,
      items: safeItems,
      total,
      timestamp: Date.now(),
      metodoPago,
      usuario,
      origen: 'venta_crudo' as const,
    });

    // 2. Detectar estado de conexión
    const { isOnline } = OfflinePrintFallback.getStatus();

    if (isOnline) {
      // ═══════════════════════════════════════════════════════════════════
      // MODO ONLINE: Comportamiento normal (Firebase + PrintSpooler)
      // ═══════════════════════════════════════════════════════════════════
      try {
        await salesRepo.registrarVenta(payload);
        console.log('[MostradorPro] ✅ Venta registrada en DB');
      } catch (error) {
        console.error('[MostradorPro] ⚠️ Error registrando venta en DB:', error);
      }

      // Inventario
      if (inventoryAutoDiscount) {
        try {
          const areas = await inventoryRepo.obtenerAreas();
          const areaId = Object.entries(areas).find(([, a]) => a?.hubId === 'venta_crudo')?.[0];
          if (areaId) {
            const inventoryItems = safeItems.filter((i) => typeof i?.productoId === 'string');
            if (inventoryItems.length > 0) {
              await inventoryRepo.registrarVentaMultiple({
                items: inventoryItems,
                areaId,
                total,
                metodoPago,
                usuario,
                allowNegative: !!posConfig?.allowNegativeStock,
                metadata: { origen: 'venta_crudo', tsVenta: payload?.timestamp },
              });
            }
          }
        } catch (error) {
          console.error('[MostradorPro] ⚠️ Error inventario V2:', error);
        }
      }

      // Imprimir vía Hub
      if (isImpresionEnabled) {
        console.log('[MostradorPro] 🖨️ ONLINE -> Hub');
        const spooler = DespachadorCola.obtenerInstancia(
          db,
          tenantPath,
          'pos_venta_crudo',
          {},
          'dispositivo'
        );
        await spooler.encolar({
          proposito: 'venta_crudo',
          idPedido: ventaId,
          canal: 'venta_crudo',
          payload,
        });
      } else {
        console.log('[MostradorPro] 🖨️ ONLINE -> Impresión desactivada por Feature Flag');
      }

      limpiarCarrito();
      setUltimoTicket(payload);
      return { success: true, ventaId, offline: false, method: 'hub' };
    } else {
      // ═══════════════════════════════════════════════════════════════════
      // MODO OFFLINE: Guardar en SQLite + Imprimir vía Bluetooth/Queue
      // ═══════════════════════════════════════════════════════════════════
      console.log('[MostradorPro] 📴 OFFLINE -> Guardando localmente...');

      // Guardar venta en SQLite para sincronizar después
      try {
        await SQLiteStorageAdapter.createVentaOffline(ventaId, 'venta_crudo', payload);
        console.log('[MostradorPro] ✅ Venta guardada localmente');
      } catch (error: any) {
        console.error('[MostradorPro] ❌ Error guardando venta local:', error);
        throw new Error(`Error local: ${error?.message || 'Desconocido'}`);
      }

      // Inventario Offline
      if (inventoryAutoDiscount) {
        try {
          const storeState = useStore.getState();
          const areaId = Object.entries(storeState.areas).find(
            ([, a]) => a?.hubId === 'venta_crudo'
          )?.[0];
          if (areaId) {
            const inventoryItems = safeItems.filter((i) => typeof i?.productoId === 'string');
            for (const item of inventoryItems) {
              await storeState.ajustarStockDelta({
                db: null as any,
                tenantPath,
                containerId: areaId,
                itemId: item.productoId,
                delta: -item.cantidad,
                usuario,
                razon: `Venta Offline Mostrador #${ventaId}`,
                allowNegative: !!posConfig?.allowNegativeStock,
              });
            }
            console.log(
              '[MostradorPro] 📦 Movimientos de inventario offline encolados y stock local actualizado'
            );
          }
        } catch (invError) {
          console.error('[MostradorPro] ⚠️ Error descontando inventario offline:', invError);
        }
      }

      // Imprimir usando fallback (Bluetooth o cola local)
      let printResult: { method: string; message?: string } = {
        method: 'none',
        message: 'Impresión desactivada por Feature Flag',
      };
      if (isImpresionEnabled) {
        const result = await OfflinePrintFallback.print({
          id: ventaId,
          type: 'venta_crudo',
          payload,
          createdAt: Date.now(),
        });
        printResult = { method: result.method, message: result.message };
      }
      console.log('[MostradorPro] 🖨️ Impresión:', printResult.method, printResult.message);

      limpiarCarrito();
      setUltimoTicket(payload);
      return {
        success: true,
        ventaId,
        offline: true,
        method: printResult.method,
        message: printResult.message,
      };
    }
  };

  const reimprimirUltimoTicket = async () => {
    if (!ultimoTicket) return { success: false, error: 'No hay ticket previo' };

    const jobId = `reprint_vc_${Date.now()}`;
    const spooler = DespachadorCola.obtenerInstancia(
      db,
      tenantPath,
      'pos_venta_crudo',
      {},
      'dispositivo'
    );
    await spooler.encolar({
      proposito: 'venta_crudo',
      idPedido: jobId,
      canal: 'venta_crudo',
      payload: ultimoTicket,
    });
    return { success: true, jobId };
  };

  return {
    loading: loading || configLoading,
    productos: Object.values(productos).filter((p) => p.visible?.ventaCrudo === true),
    categorias: Object.values(categorias).filter((c) => c.herencia?.ventaCrudo !== false),
    areas: [],
    selectedAreaId: null,
    setSelectedAreaId: () => {},
    stockByProduct: {},
    carrito,
    total,
    efectivo,
    setEfectivo,
    cambio,
    isHubOnline: true,
    isBasculaEnabled,
    isImpresionEnabled,
    isInventarioEnabled,
    isDeliveryEnabled,
    actions: {
      agregarAlCarrito,
      agregarPorCodigo,
      eliminarItem,
      limpiarCarrito,
      completarVenta,
      reimprimirUltimoTicket,
      marcarSinStock: () => {}, // No-op
    },
  };
}
