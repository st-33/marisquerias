/**
 * 🧠 CEREBRO - GESTIÓN DE MENÚ
 * Hook para administrar categorías y oferta comercial del menú.
 *
 * Responsabilidad:
 *  - Exponer los orígenes existentes:
 *    1) Artículos vendibles directamente de Inventario (`articulosVendiblesInventario`).
 *    2) Platillos definidos en Cocina (`platillosDisponibles`).
 *  - Sincronizar costos de referencia, imágenes, tiempos de preparación y
 *    elegibilidad de canales comerciales (Restaurante, Mostrador, Menú Digital).
 *  - Preservar borrador en memoria de sesión al saltar a Inventario o al
 *    Libro de Platillos con retorno manual.
 */

import type { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MenuRepository,
  RepositorioLibroPlatillos,
  calcularCosteoYCapacidadPlatillo,
  esArticuloVendibleDirecto,
  type Categoria,
  type PlatilloCocina,
  type Producto,
} from '../../sistema/persistencia';
import { RepositorioInventario } from '../../sistema/persistencia/contratos-inventario';
import { useInventoryAreas, useInventoryCatalog, useStore } from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import { validarProductoParaEliminar } from '../admin/seguridadMenu';

type PropsGestionMenu = {
  db?: Database;
  rutaNegocio?: string;
};

let borradorMenuEnMemoria: any = null;
const integridadReparadaPorNegocio = new Set<string>();

export interface ArticuloOrigenMenu {
  id: string;
  nombre: string;
  unidad: 'pza' | 'kg';
  unidadOriginal: string;
  costoUnitario: number;
  stockDisponible: number;
  uso: string;
  imagenId?: string;
}

export interface PlatilloOrigenMenu extends PlatilloCocina {
  costoCalculado: number;
  costoIncompleto: boolean;
  costoAproximado: boolean;
  porcionesPosibles: number;
  ingredienteLimitante?: string;
}

export function useGestionMenu(props: PropsGestionMenu = {}) {
  const rutaNegocioStore = useStore((s) => s.sesion.rutaNegocio) || '';
  const ds = useStore((s) => s.dataSources);
  const rutaNegocio = props.rutaNegocio || rutaNegocioStore;
  const db = useMemo(
    () => props.db || getRtdb(ds?.operacionUrl || undefined),
    [props.db, ds?.operacionUrl]
  );

  const storeCategorias = useStore((s) => s.categorias);
  const storeProductos = useStore((s) => s.productos);
  const listenersActivos = useStore((s) => s.listenersActivos);
  const loading = !listenersActivos;

  const catalogInventario = useInventoryCatalog();
  const areasInventario = useInventoryAreas();

  const menuRepo = useMemo(() => new MenuRepository(db, rutaNegocio), [db, rutaNegocio]);
  const inventarioRepo = useMemo(
    () => new RepositorioInventario(db, rutaNegocio),
    [db, rutaNegocio]
  );
  const platillosRepo = useMemo(
    () => new RepositorioLibroPlatillos(db, rutaNegocio),
    [db, rutaNegocio]
  );

  const [platillosMap, setPlatillosMap] = useState<Record<string, PlatilloCocina>>({});

  // Suscripción al Libro de Platillos + migración silenciosa de productos legacy con receta
  useEffect(() => {
    if (!rutaNegocio) return;
    const unsub = platillosRepo.suscribirPlatillos((data) => {
      setPlatillosMap(data || {});
    });
    return () => unsub();
  }, [platillosRepo, rutaNegocio]);

  // Self-healing de integridad de menú (máximo una vez por negocio en la sesión)
  useEffect(() => {
    if (!rutaNegocio || integridadReparadaPorNegocio.has(rutaNegocio)) return;
    integridadReparadaPorNegocio.add(rutaNegocio);
    menuRepo
      .repararIntegridad()
      .catch((err) => {
        integridadReparadaPorNegocio.delete(rutaNegocio);
        console.error('[useGestionMenu] Self-healing failed:', err);
      });
  }, [menuRepo, rutaNegocio]);

  // Artículos de inventario que se pueden vender directamente o provienen de producción anticipada
  const articulosVendiblesInventario = useMemo<ArticuloOrigenMenu[]>(() => {
    const safeCat = catalogInventario || {};
    const safeAreas = areasInventario || {};
    return Object.entries(safeCat)
      .filter(([_, item]) => esArticuloVendibleDirecto(item as any))
      .map(([id, item]: [string, any]) => {
        let stock = 0;
        Object.values(safeAreas).forEach((area: any) => {
          if (area?.stock && typeof area.stock[id] === 'number') {
            stock += area.stock[id];
          }
        });
        const unidadComercial: 'pza' | 'kg' = item?.unidad === 'kg' ? 'kg' : 'pza';
        const costoResuelto = Number(item?.costo ?? item?.costoUnitario ?? 0);
        return {
          id,
          nombre: item?.nombre || id,
          unidad: unidadComercial,
          unidadOriginal: item?.unidad || 'pza',
          costoUnitario: costoResuelto,
          stockDisponible: Number(stock.toFixed(4)),
          uso: item?.uso || 'ambos',
          imagenId: item?.imagenId || item?.imagen_id,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [catalogInventario, areasInventario]);

  // Platillos del Libro de Platillos enriquecidos con costo en tiempo real
  const platillosDisponibles = useMemo<PlatilloOrigenMenu[]>(() => {
    const safeCat = catalogInventario || {};
    const safeAreas = areasInventario || {};

    const stockConsolidadoPorItem: Record<string, number> = {};
    Object.values(safeAreas).forEach((area: any) => {
      if (area?.stock) {
        Object.entries(area.stock).forEach(([itemId, qty]) => {
          if (typeof qty === 'number') {
            stockConsolidadoPorItem[itemId] = (stockConsolidadoPorItem[itemId] || 0) + qty;
          }
        });
      }
    });

    return Object.values(platillosMap || {})
      .filter((p) => p.activo !== false)
      .map((p) => {
        const calc = calcularCosteoYCapacidadPlatillo({
          platillo: p,
          catalogoInventario: safeCat as any,
          stockConsolidadoPorItem,
        });
        let costoFinal = calc.costoPorUnidadRendimiento;
        if (
          p.modoPreparacion === 'produccion_anticipada' &&
          p.itemTerminadoId &&
          safeCat[p.itemTerminadoId]
        ) {
          const itemTerm = safeCat[p.itemTerminadoId] as any;
          const costoTerminado = Number(itemTerm?.costo ?? itemTerm?.costoUnitario ?? 0);
          if (costoFinal <= 0 && costoTerminado > 0) {
            costoFinal = costoTerminado;
          }
        }
        return {
          ...p,
          costoCalculado: costoFinal,
          costoIncompleto: !calc.costoCompleto && costoFinal <= 0,
          costoAproximado: calc.contieneAproximaciones,
          porcionesPosibles: calc.capacidadProduccionUnidades,
          ingredienteLimitante: calc.ingredienteLimitante,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [platillosMap, catalogInventario, areasInventario]);

  // Acciones de categorías
  const crearCategoria = async (categoria: Omit<Categoria, 'id'>) => {
    try {
      const id = await menuRepo.crearCategoria(categoria);
      return id;
    } catch (err) {
      console.error('[MenuManagement] Error creating category:', err);
      throw err;
    }
  };

  const actualizarCategoria = async (id: string, datos: Partial<Categoria>) => {
    try {
      await menuRepo.actualizarCategoria(id, datos);
    } catch (err) {
      console.error('[MenuManagement] Error updating category:', err);
      throw err;
    }
  };

  const eliminarCategoria = async (id: string) => {
    try {
      await menuRepo.eliminarCategoria(id);
    } catch (err) {
      console.error('[MenuManagement] Error deleting category:', err);
      throw err;
    }
  };

  // Acciones de productos
  const crearProducto = async (producto: Omit<Producto, 'id'>) => {
    try {
      const id = await menuRepo.crearProducto(producto);
      return id;
    } catch (err) {
      console.error('[MenuManagement] Error creating product:', err);
      throw err;
    }
  };

  const actualizarProducto = async (id: string, datos: Partial<Producto>) => {
    try {
      await menuRepo.actualizarProducto(id, datos);
    } catch (err) {
      console.error('[MenuManagement] Error updating product:', err);
      throw err;
    }
  };

  const eliminarProducto = async (id: string) => {
    try {
      await menuRepo.eliminarProducto(id);
    } catch (err) {
      console.error('[MenuManagement] Error deleting product:', err);
      throw err;
    }
  };

  const eliminarProductoConValidacion = async (id: string) => {
    const productoId = validarProductoParaEliminar(id, storeProductos);
    await eliminarProducto(productoId);
  };

  const toggleProductoActivo = async (id: string, activo: boolean) => {
    try {
      await menuRepo.toggleProductoActivo(id, activo);
    } catch (err) {
      console.error('[MenuManagement] Error toggling product:', err);
      throw err;
    }
  };

  // 🎭 ORQUESTACIÓN: Crear categoría con validación
  const crearCategoriaConValidacion = async (
    datos: string | { nombre: string; enviarACocina?: boolean; saltarPreparando?: boolean }
  ) => {
    const nombre = typeof datos === 'string' ? datos : datos.nombre;
    if (!nombre || !nombre.trim()) {
      throw new Error('Ingresa un nombre');
    }

    if (typeof datos === 'object') {
      return await crearCategoria({
        nombre: nombre.trim(),
        activa: true,
        enviarACocina: datos.enviarACocina ?? true,
        saltarPreparando: datos.saltarPreparando ?? false,
      });
    }

    return await crearCategoria({ nombre: nombre.trim(), activa: true });
  };

  // 🔍 VALIDACIÓN: Verificar que receta sea válida contra inventario (con capacidad)
  const validarReceta = useCallback(
    async (
      receta: Record<string, any> | undefined
    ): Promise<{
      valida: boolean;
      errores: string[];
      advertencias: string[];
      capacidad?: number;
      ingredienteLimitante?: string;
    }> => {
      if (!receta || Object.keys(receta).length === 0) {
        return { valida: true, errores: [], advertencias: [] };
      }

      const errores: string[] = [];
      const advertencias: string[] = [];
      const [catalogo, areas] = await Promise.all([
        inventarioRepo.obtenerCatalogo(),
        inventarioRepo.obtenerAreas(),
      ]);

      let cantidadPosible = Infinity;
      let ingredienteLimitante = '';

      for (const [itemId, rawCant] of Object.entries(receta)) {
        const cantidad =
          typeof rawCant === 'number' ? rawCant : Number((rawCant as any)?.cantidad || 0);

        if (cantidad <= 0) {
          errores.push(`La cantidad para el item "${itemId}" debe ser mayor a 0`);
          continue;
        }

        const itemInventario = catalogo[itemId];
        if (!itemInventario) {
          errores.push(`El item "${itemId}" no existe en el inventario`);
          cantidadPosible = 0;
          continue;
        }

        let stockConsolidado = 0;
        Object.values(areas || {}).forEach((area: any) => {
          if (area?.stock && typeof area.stock[itemId] === 'number') {
            stockConsolidado += area.stock[itemId];
          }
        });

        if (stockConsolidado <= (itemInventario.minStock || 0)) {
          advertencias.push(
            `${itemInventario.nombre}: Stock bajo (${stockConsolidado} ${itemInventario.unidad})`
          );
        }

        if (stockConsolidado === 0) {
          cantidadPosible = 0;
          ingredienteLimitante = itemInventario.nombre;
        } else {
          const posibleConEsteIngrediente = Math.floor(stockConsolidado / cantidad);
          if (posibleConEsteIngrediente < cantidadPosible) {
            cantidadPosible = posibleConEsteIngrediente;
            ingredienteLimitante = itemInventario.nombre;
          }
        }
      }

      return {
        valida: errores.length === 0,
        errores,
        advertencias,
        capacidad: cantidadPosible === Infinity ? 0 : cantidadPosible,
        ingredienteLimitante,
      };
    },
    [inventarioRepo]
  );

  const [recetaEnEdicion, setRecetaEnEdicion] = useState<Record<string, any> | null>(null);
  const [validacionActive, setValidacionActive] = useState<{
    valida: boolean;
    errores: string[];
    advertencias: string[];
    capacidad?: number;
    ingredienteLimitante?: string;
  } | null>(null);
  const [validandoActive, setValidandoActive] = useState(false);

  const [prevRecetaEnEdicion, setPrevRecetaEnEdicion] = useState<Record<string, any> | null>(null);
  if (recetaEnEdicion !== prevRecetaEnEdicion) {
    setPrevRecetaEnEdicion(recetaEnEdicion);
    if (!recetaEnEdicion || Object.keys(recetaEnEdicion).length === 0) {
      setValidacionActive(null);
      setValidandoActive(false);
    } else {
      setValidandoActive(true);
    }
  }

  useEffect(() => {
    if (!recetaEnEdicion || Object.keys(recetaEnEdicion).length === 0) {
      return;
    }

    const handler = setTimeout(() => {
      validarReceta(recetaEnEdicion)
        .then((res) => {
          setValidacionActive(res);
          setValidandoActive(false);
        })
        .catch(() => {
          setValidacionActive(null);
          setValidandoActive(false);
        });
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [recetaEnEdicion, validarReceta]);

  // 🎭 ORQUESTACIÓN: Crear producto comercial con validación de origen y canales
  const crearProductoConValidacion = async (datos: {
    nombre: string;
    precio: string | number;
    categoriaId: string;
    origenTipo?: 'inventario' | 'platillo';
    origenId?: string;
    modoPreparacion?: 'por_pedido' | 'produccion_anticipada';
    itemTerminadoId?: string;
    costoReferencia?: number;
    imagenId?: string;
    estacion_preparacion?: Producto['estacion_preparacion'];
    variantes?: Record<string, any>;
    visible?: Record<string, boolean>;
    prepMin?: number;
    receta?: Record<string, any>;
    usarConfigPersonalizada?: boolean;
    enviarACocina?: boolean;
    saltarPreparando?: boolean;
    unidad?: string;
    inventoryAreaId?: string;
  }) => {
    if (!datos.nombre || !datos.precio || !datos.categoriaId) {
      throw new Error('Completa nombre, precio y categoría');
    }

    const precio = typeof datos.precio === 'string' ? parseFloat(datos.precio) : datos.precio;
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error('El precio debe ser un número válido');
    }

    const esPorPedido =
      datos.origenTipo === 'platillo' && datos.modoPreparacion !== 'produccion_anticipada';
    const visibleSeguro = {
      digital: true,
      mesero: true,
      ...(datos.visible || {}),
      ventaCrudo: esPorPedido ? false : Boolean(datos.visible?.ventaCrudo),
    };

    if (datos.receta?.ingredientes && Object.keys(datos.receta.ingredientes).length > 0) {
      const validacion = await validarReceta(datos.receta.ingredientes);
      if (!validacion.valida) {
        throw new Error(`Receta inválida: ${validacion.errores.join('; ')}`);
      }
    }

    return await crearProducto({
      nombre: datos.nombre.trim(),
      precio,
      categoriaId: datos.categoriaId,
      activo: true,
      origenTipo: datos.origenTipo || 'inventario',
      origenId: datos.origenId,
      modoPreparacion: datos.modoPreparacion,
      itemTerminadoId: datos.itemTerminadoId,
      costoReferencia: Number(datos.costoReferencia || 0),
      imagen_id: datos.imagenId,
      estacion_preparacion: datos.estacion_preparacion,
      variantes: datos.variantes || {},
      visible: visibleSeguro,
      prepMin: datos.prepMin || 0,
      receta: datos.receta || {},
      usarConfigPersonalizada: datos.usarConfigPersonalizada,
      enviarACocina: datos.enviarACocina ?? esPorPedido,
      saltarPreparando: datos.saltarPreparando ?? !esPorPedido,
      unidad: datos.unidad as any,
      inventoryAreaId: datos.inventoryAreaId,
    } as any);
  };

  // 🎭 ORQUESTACIÓN: Actualizar producto comercial con validación
  const actualizarProductoConValidacion = async (
    id: string,
    datos: {
      nombre: string;
      precio: string | number;
      origenTipo?: 'inventario' | 'platillo';
      origenId?: string;
      modoPreparacion?: 'por_pedido' | 'produccion_anticipada';
      itemTerminadoId?: string;
      costoReferencia?: number;
      imagenId?: string;
      estacion_preparacion?: Producto['estacion_preparacion'];
      variantes?: Record<string, any>;
      visible?: Record<string, boolean>;
      prepMin?: number;
      receta?: Record<string, any>;
      usarConfigPersonalizada?: boolean;
      enviarACocina?: boolean;
      saltarPreparando?: boolean;
      unidad?: string;
      inventoryAreaId?: string;
    }
  ) => {
    if (!datos.nombre || !datos.precio) {
      throw new Error('Completa nombre y precio');
    }

    const precio = typeof datos.precio === 'string' ? parseFloat(datos.precio) : datos.precio;
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error('El precio debe ser un número válido');
    }

    const esPorPedido =
      datos.origenTipo === 'platillo' && datos.modoPreparacion !== 'produccion_anticipada';
    const visibleSeguro = datos.visible
      ? {
          ...datos.visible,
          ventaCrudo: esPorPedido ? false : Boolean(datos.visible.ventaCrudo),
        }
      : undefined;

    if (datos.receta?.ingredientes && Object.keys(datos.receta.ingredientes).length > 0) {
      const validacion = await validarReceta(datos.receta.ingredientes);
      if (!validacion.valida) {
        throw new Error(`Receta inválida: ${validacion.errores.join('; ')}`);
      }
    }

    await actualizarProducto(id, {
      nombre: datos.nombre.trim(),
      precio,
      origenTipo: datos.origenTipo,
      origenId: datos.origenId,
      modoPreparacion: datos.modoPreparacion,
      itemTerminadoId: datos.itemTerminadoId,
      costoReferencia: datos.costoReferencia != null ? Number(datos.costoReferencia) : undefined,
      imagen_id: datos.imagenId,
      estacion_preparacion: datos.estacion_preparacion,
      variantes: datos.variantes,
      visible: visibleSeguro,
      prepMin: datos.prepMin,
      receta: datos.receta,
      usarConfigPersonalizada: datos.usarConfigPersonalizada,
      enviarACocina: datos.enviarACocina,
      saltarPreparando: datos.saltarPreparando,
      unidad: datos.unidad as any,
      inventoryAreaId: datos.inventoryAreaId,
    } as any);
  };

  const refresh = async () => {
    try {
      await Promise.all([menuRepo.obtenerCategorias(), menuRepo.obtenerProductos()]);
    } catch (err) {
      console.error('[MenuManagement] Error refreshing menu:', err);
      throw err;
    }
  };

  const guardarBorradorMenu = useCallback((borrador: any) => {
    borradorMenuEnMemoria = borrador;
  }, []);

  const consumirBorradorMenu = useCallback(() => {
    const actual = borradorMenuEnMemoria;
    borradorMenuEnMemoria = null;
    return actual;
  }, []);

  const getProductosPorCategoria = useCallback(
    (categoriaId: string): Producto[] => {
      return Object.entries(storeProductos)
        .filter(([_, prod]) => prod.categoriaId === categoriaId)
        .map(([id, prod]) => {
          // Enriquecer costo de referencia e imagen en caliente desde su origen real
          let costoRef = Number(prod.costoReferencia || 0);
          let imgId = prod.imagenId || (prod as any).imagen_id;
          if (prod.origenTipo === 'platillo' && prod.origenId) {
            const plat = platillosDisponibles.find((p) => p.id === prod.origenId);
            if (plat) {
              if (plat.costoCalculado > 0) costoRef = plat.costoCalculado;
              if (!imgId && plat.imagenId) imgId = plat.imagenId;
            }
          } else if (prod.origenId && catalogInventario?.[prod.origenId]) {
            const art = catalogInventario[prod.origenId] as any;
            if (Number(art?.costoUnitario || 0) > 0) costoRef = Number(art.costoUnitario);
            if (!imgId && (art?.imagenId || art?.imagen_id)) imgId = art.imagenId || art.imagen_id;
          }
          return {
            ...prod,
            id,
            categoriaId,
            costoReferencia: costoRef,
            imagenId: imgId,
          };
        }) as Producto[];
    },
    [storeProductos, platillosDisponibles, catalogInventario]
  );

  const categoriasArray = useMemo(
    () => Object.entries(storeCategorias).map(([id, cat]) => ({ ...cat, id })) as Categoria[],
    [storeCategorias]
  );

  const productosArray = useMemo(
    () =>
      Object.entries(storeProductos).map(([id, prod]) => ({
        ...prod,
        id,
        categoriaId: prod.categoriaId || '',
      })) as Producto[],
    [storeProductos]
  );

  return {
    // Estado
    categorias: categoriasArray,
    productos: productosArray,
    articulosVendiblesInventario,
    platillosDisponibles,
    loading,
    validacionActive,
    validandoActive,

    // Acciones
    actions: {
      // Categorías
      crearCategoria,
      crearCategoriaConValidacion,
      actualizarCategoria,
      eliminarCategoria,

      // Productos
      crearProducto,
      crearProductoConValidacion,
      actualizarProducto,
      actualizarProductoConValidacion,
      eliminarProducto,
      eliminarProductoConValidacion,
      toggleProductoActivo,
      refresh,

      // Borrador en memoria de sesión (para salto a Inventario / Libro de Platillos)
      guardarBorradorMenu,
      consumirBorradorMenu,

      // Validación
      validarReceta,
      setRecetaEnEdicion,
    },

    // Helpers
    getProductosPorCategoria,
  };
}
