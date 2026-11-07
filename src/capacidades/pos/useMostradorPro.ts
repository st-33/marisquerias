/**
 * ⚡ HOOK MOSTRADOR PRO (VENTA Y CRUDO)
 * Refactorizado Phase 2:
 * - Registro de Ventas (SimpleSalesRepo)
 * - Impresión Robusta al Hub (Web & Native)
 * - Soporte Offline (SQLite + Bluetooth Fallback)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MenuRepository, type Producto } from '../../sistema/persistencia';
import { InventoryV2Repository } from '../../sistema/persistencia/inventario.repositorio';
import type { Categoria } from '../../sistema/persistencia/menu.repositorio';
import { RegistroVentasRepository } from '../../sistema/persistencia/registroVentas.repositorio';
import {
  ServicioMovimientosInventario,
  resolverLineasConsumoParaProducto,
} from '../../sistema/servicios/ServicioMovimientosInventario';
import { getRtdb } from '../../sistema/firebase';
import { SQLiteStorageAdapter } from '../../sistema/sin_conexion/almacenamiento/AdaptadorAlmacenamientoSQLite';
import { OfflinePrintFallback } from '../../sistema/servicios/RespaldoImpresionOffline';
import { servicioFierros } from '../../sistema/impresion/fierros';
import { DespachadorCola } from '../../sistema/impresion/fierros/cola/DespachadorCola';
import { useStore } from '../../sistema/store';
import { resolverDeviceIdADI } from '../../sistema/instalacion/vinculacion/generar-device-id-adi';
import { useConfiguracionNegocio } from '../../sistema/proveedores/ProveedorConfiguracionNegocio';
import { useConfiguracionCaja as usePosConfig } from '../mostrador/useConfiguracionCaja';

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
  rutaNegocio?: string;
};

export function useMostradorPro(props?: UseMostradorProProps) {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Record<string, Producto>>({});
  const [categorias, setCategorias] = useState<Record<string, Categoria>>({});
  const [carrito, setCarrito] = useState<any[]>([]);
  const [ultimoTicket, setUltimoTicket] = useState<any | null>(null);
  const [efectivo, setEfectivo] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const storeRutaNegocio = useStore((state) => state.sesion.rutaNegocio) || '';
  const ds = useStore((state) => state.dataSources);
  const usuario = useStore((state) => state.sesion.usuario?.nombre) || 'Mostrador';

  const rutaNegocio = props?.rutaNegocio !== undefined ? props.rutaNegocio : storeRutaNegocio;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  useConfiguracionNegocio();
  const { config: posConfig, loading: configLoading } = usePosConfig(db, rutaNegocio);
  const menuRepo = useMemo(() => new MenuRepository(db, rutaNegocio), [db, rutaNegocio]);
  const salesRepo = useMemo(() => new RegistroVentasRepository(db, rutaNegocio), [db, rutaNegocio]);
  const inventoryRepo = useMemo(
    () => new InventoryV2Repository(db, rutaNegocio),
    [db, rutaNegocio]
  );

  useEffect(() => {
    resolverDeviceIdADI()
      .then(setDeviceId)
      .catch((err) => console.error('[MostradorPro] Error obteniendo deviceId:', err));
  }, []);
  const estadoEncendido = useStore((s) => s.estadoEncendido);
  const caps = estadoEncendido?.activos?.capacidades ?? estadoEncendido?.capacidades_activas;
  const isInventarioEnabled = !caps || caps.includes('inventario');
  const isImpresionEnabled = !caps || caps.includes('tickets_impresion');
  const isBasculaEnabled = true;
  const isDeliveryEnabled = !caps || caps.includes('reparto_logistica');

  const rawInventoryAutoDiscount = useStore(
    (s) => s.negocio.features?.inventory_auto_discount?.enabled ?? true
  );
  const inventoryAutoDiscount = isInventarioEnabled && rawInventoryAutoDiscount;

  const storeProductos = useStore((s) => (s as any).productos) as Record<string, Producto> | undefined;
  const storeCategorias = useStore((s) => (s as any).categorias) as Record<string, Categoria> | undefined;

  // Sincronizar con el store centralizado si ya tiene datos cargados
  useEffect(() => {
    if (storeProductos && Object.keys(storeProductos).length > 0) {
      setProductos((prev) => ({ ...(prev || {}), ...storeProductos }));
    }
  }, [storeProductos]);

  useEffect(() => {
    if (storeCategorias && Object.keys(storeCategorias).length > 0) {
      const normalizadas: Record<string, Categoria> = {};
      for (const [cid, cat] of Object.entries(storeCategorias)) {
        if (cat && typeof cat === 'object') {
          normalizadas[cid] = { ...(cat as any), id: cid };
        }
      }
      setCategorias((prev) => ({ ...(prev || {}), ...normalizadas }));
      setLoading(false);
    }
  }, [storeCategorias]);

  // --- Carga de Datos ---
  useEffect(() => {
    if (!rutaNegocio) return;

    let liveProdsRecibidos = false;
    let liveCatsRecibidas = false;
    let saveProdsTimer: ReturnType<typeof setTimeout> | null = null;
    let saveCatsTimer: ReturnType<typeof setTimeout> | null = null;

    // Auto-reparar integridad flat/nested si existen discrepancias
    if (typeof (menuRepo as any).repararIntegridad === 'function') {
      void (menuRepo as any).repararIntegridad().catch(() => {});
    }

    // Cargar caché local primero por si estamos offline o para render rápido,
    // sin sobrescribir jamás datos en vivo ya emitidos por Firebase o el Store.
    const cargarCacheOffline = async () => {
      try {
        const cachedProds = await SQLiteStorageAdapter.getProductos();
        const cachedCats = await SQLiteStorageAdapter.getCategorias();
        if (!liveProdsRecibidos && cachedProds && Object.keys(cachedProds).length > 0) {
          setProductos((prev) =>
            Object.keys(prev).length > 0 ? prev : (cachedProds as Record<string, Producto>)
          );
        }
        if (!liveCatsRecibidas && cachedCats && Object.keys(cachedCats).length > 0) {
          const fixedCats: Record<string, Categoria> = {};
          for (const [cid, cat] of Object.entries(cachedCats)) {
            if (cat && typeof cat === 'object') {
              fixedCats[cid] = { ...(cat as any), id: cid };
            }
          }
          setCategorias((prev) => (Object.keys(prev).length > 0 ? prev : fixedCats));
          setLoading(false);
        }
      } catch (err) {
        console.error('[MostradorPro] Error cargando caché de SQLite:', err);
      }
    };
    void cargarCacheOffline();

    const unsubMenu = menuRepo.suscribirProductos((data) => {
      if (data && Object.keys(data).length > 0) {
        liveProdsRecibidos = true;
        setProductos((prev) => ({ ...(prev || {}), ...data }));
        if (saveProdsTimer) clearTimeout(saveProdsTimer);
        saveProdsTimer = setTimeout(() => {
          void SQLiteStorageAdapter.saveProductosBulk(data).catch(() => {});
        }, 600);
      } else if (!liveProdsRecibidos) {
        setProductos(data || {});
      }
    });

    const unsubCats = menuRepo.suscribirCategorias((data) => {
      const fixedCats: Record<string, Categoria> = {};
      for (const [cid, cat] of Object.entries(data || {})) {
        if (cat && typeof cat === 'object') {
          fixedCats[cid] = { ...(cat as any), id: cid };
        }
      }
      if (Object.keys(fixedCats).length > 0) {
        liveCatsRecibidas = true;
      }
      setCategorias(fixedCats);
      setLoading(false);
      if (Object.keys(fixedCats).length > 0) {
        if (saveCatsTimer) clearTimeout(saveCatsTimer);
        saveCatsTimer = setTimeout(() => {
          void SQLiteStorageAdapter.saveCategoriasBulk(fixedCats).catch(() => {});
        }, 600);
      }
    });

    return () => {
      if (saveProdsTimer) clearTimeout(saveProdsTimer);
      if (saveCatsTimer) clearTimeout(saveCatsTimer);
      unsubMenu();
      unsubCats();
    };
  }, [rutaNegocio, menuRepo]);

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
    if (!deviceId) {
      throw new Error(
        'Inicializando dispositivo... Espera a que se complete la identificación del hardware.'
      );
    }

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
      // MODO ONLINE: Comportamiento normal (Firebase + DespachadorCola)
      // ═══════════════════════════════════════════════════════════════════
      try {
        await salesRepo.registrarVenta(payload);
        console.log('[MostradorPro] ✅ Venta registrada en DB');
      } catch (error) {
        console.error('[MostradorPro] ⚠️ Error registrando venta en DB:', error);
      }

      // Inventario (Autoridad Única Idempotente)
      if (inventoryAutoDiscount) {
        try {
          const storeState = useStore.getState() as any;
          let catalogoInventario = storeState.catalog || {};
          if (Object.keys(catalogoInventario).length === 0) {
            catalogoInventario = await inventoryRepo.obtenerCatalogo();
          }

          const todasLineas = safeItems.flatMap((it) => {
            const prod = it.productoId ? productos[it.productoId] : null;
            const { lineas } = resolverLineasConsumoParaProducto({
              producto: prod || {
                id: it.productoId || it.id,
                nombre: it.nombre,
                unidad: it.unidad,
                origenTipo: 'inventario',
              },
              cantidadVendida: Number(it.cantidad || 1),
              nombreFallback: it.nombre,
              catalogoInventario,
            });
            return lineas;
          });

          if (todasLineas.length > 0) {
            await ServicioMovimientosInventario.aplicarConsumoIdempotente({
              db,
              rutaNegocio,
              operacionId: `mostrador_${ventaId}`,
              lineas: todasLineas,
              hubPreferido: 'venta_crudo',
              usuario,
              allowNegative: !!posConfig?.allowNegativeStock,
              metadata: { origen: 'venta_crudo', tsVenta: payload?.timestamp, ventaId },
            });
          }
        } catch (error) {
          console.error('[MostradorPro] ⚠️ Error inventario V2:', error);
        }
      }

      // Imprimir: Si la impresora Bluetooth está conectada localmente a esta terminal,
      // imprimimos DIRECTO por hardware para cero latencia.
      // Si la terminal no tiene impresora local pero hay conexión, encolamos al Hub de Mostrador en RTDB.
      if (isImpresionEnabled) {
        if (servicioFierros?.estaConectado) {
          console.log('[MostradorPro] 🖨️ Impresora Bluetooth local conectada -> Impresión directa');
          await OfflinePrintFallback.print({
            id: ventaId,
            type: 'venta_crudo',
            payload,
            createdAt: Date.now(),
          });
        } else {
          console.log('[MostradorPro] 🖨️ ONLINE -> Encolando al Hub de Mostrador');
          const spooler = DespachadorCola.obtenerInstancia(
            db,
            rutaNegocio,
            'pos_venta_crudo',
            {},
            'dispositivo'
          );
          await spooler.encolar({
            proposito: 'mostrador',
            idPedido: ventaId,
            canal: 'venta_crudo',
            payload,
          });
        }
      } else {
        console.log('[MostradorPro] 🖨️ ONLINE -> Impresión desactivada por Feature Flag');
      }

      limpiarCarrito();
      setUltimoTicket(payload);
      return {
        success: true,
        ventaId,
        offline: false,
        method: servicioFierros?.estaConectado ? 'direct_bluetooth' : 'hub',
      };
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

      // Inventario Offline (Resolviendo itemId físico real)
      if (inventoryAutoDiscount) {
        try {
          const storeState = useStore.getState() as any;
          const catalogoInventario = storeState.catalog || {};
          const areaId =
            Object.entries(storeState.areas || {}).find(
              ([, a]: [string, any]) => a?.hubId === 'venta_crudo'
            )?.[0] || Object.keys(storeState.areas || {})[0];

          if (areaId) {
            for (const item of safeItems) {
              const prod = item.productoId ? productos[item.productoId] : null;
              const { lineas } = resolverLineasConsumoParaProducto({
                producto: prod || {
                  id: item.productoId || item.id,
                  nombre: item.nombre,
                  unidad: item.unidad,
                  origenTipo: 'inventario',
                },
                cantidadVendida: Number(item.cantidad || 1),
                nombreFallback: item.nombre,
                catalogoInventario,
              });

              for (const lin of lineas) {
                await storeState.ajustarStockDelta({
                  db: null as any,
                  rutaNegocio,
                  containerId: lin.areaPreferidaId || areaId,
                  itemId: lin.itemId,
                  delta: -lin.cantidadBase,
                  usuario,
                  razon: `Venta Offline Mostrador #${ventaId}`,
                  allowNegative: !!posConfig?.allowNegativeStock,
                });
              }
            }
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

    if (isImpresionEnabled && servicioFierros?.estaConectado) {
      console.log('[MostradorPro] 🖨️ Reimpresión directa vía Bluetooth local');
      const res = await OfflinePrintFallback.print({
        id: `reprint_${Date.now()}`,
        type: 'venta_crudo',
        payload: ultimoTicket,
        createdAt: Date.now(),
      });
      return { success: res.success, local: true };
    }

    const jobId = `reprint_vc_${Date.now()}`;
    const spooler = DespachadorCola.obtenerInstancia(
      db,
      rutaNegocio,
      'pos_venta_crudo',
      {},
      'dispositivo'
    );
    await spooler.encolar({
      proposito: 'mostrador',
      idPedido: jobId,
      canal: 'venta_crudo',
      payload: ultimoTicket,
    });
    return { success: true, jobId, local: false };
  };

  // Elegibilidad estricta de Mostrador:
  // Solo artículos de entrega directa (inventario o platillos con produccion_anticipada / enviarACocina === false).
  // Los platillos preparados por pedido al momento ('por_pedido') quedan excluidos de Mostrador aunque su categoría sea mixta.
  const productosElegiblesMostrador = useMemo(() => {
    return Object.entries(productos)
      .map(([id, p]) => ({ ...p, id: p.id || id }))
      .filter((p) => {
        if (p.activo === false) return false;
        if (p.modoPreparacion === 'por_pedido') return false;
        if (p.origenTipo === 'platillo' && p.modoPreparacion !== 'produccion_anticipada') {
          return false;
        }
        const cat = p.categoriaId ? categorias[p.categoriaId] : undefined;
        // Si la categoría tiene desactivado explícitamente Mostrador, excluir todos sus productos
        if (cat?.herencia?.ventaCrudo === false) return false;
        // Si el producto tiene desactivado ventaCrudo individualmente, excluirlo SALVO que
        // la categoría entera haya sido habilitada explícitamente para Mostrador (`herencia.ventaCrudo === true`).
        if (p.visible?.ventaCrudo === false && cat?.herencia?.ventaCrudo !== true) {
          return false;
        }
        return true;
      });
  }, [productos, categorias]);

  const categoriasElegiblesMostrador = useMemo(() => {
    return Object.entries(categorias)
      .map(([id, c]) => ({ ...c, id: c.id || id }))
      .filter((c) => c.activa !== false && c.herencia?.ventaCrudo !== false);
  }, [categorias]);

  return {
    loading: loading || configLoading,
    productos: productosElegiblesMostrador,
    categorias: categoriasElegiblesMostrador,
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
    deviceId,
    isDeviceReady: Boolean(deviceId),
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
