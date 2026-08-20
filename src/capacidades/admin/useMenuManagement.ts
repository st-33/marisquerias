/**
 * 🧠 CEREBRO - GESTIÓN DE MENÚ
 * Hook para administrar categorías y productos del menú
 */

import type { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MenuRepository, type Categoria, type Producto } from '../../sistema/persistencia';
import { RepositorioInventario } from '../../sistema/persistencia/contratos-inventario';
import { useStore } from '../../sistema/store';
import { validarProductoParaEliminar } from './menuSafety';

type UseMenuManagementProps = {
  db: Database;
  tenantPath: string;
};

export function useMenuManagement({ db, tenantPath }: UseMenuManagementProps) {
  const storeCategorias = useStore((s) => s.categorias);
  const storeProductos = useStore((s) => s.productos);
  const listenersActivos = useStore((s) => s.listenersActivos);
  const loading = !listenersActivos;

  const menuRepo = useMemo(() => new MenuRepository(db, tenantPath), [db, tenantPath]);

  const inventarioRepo = useMemo(() => new RepositorioInventario(db, tenantPath), [db, tenantPath]);

  // 🔥 SELF-HEALING: Ejecutar reparación silenciosa al iniciar
  useEffect(() => {
    if (!tenantPath) return;
    menuRepo
      .repararIntegridad()
      .catch((err) => console.error('[useMenuManagement] Self-healing failed:', err));
  }, [menuRepo, tenantPath]);

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

    // Si recibimos un objeto con configuración adicional, incluirla
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

      for (const [itemId, cantidadNecesaria] of Object.entries(receta)) {
        const cantidad = Number(cantidadNecesaria) || 0;

        // Validar cantidad
        if (cantidad <= 0) {
          errores.push(`La cantidad para el item "${itemId}" debe ser mayor a 0`);
          continue;
        }

        // Verificar que el item exista en inventario
        const itemInventario = catalogo[itemId];
        if (!itemInventario) {
          errores.push(`El item "${itemId}" no existe en el inventario`);
          cantidadPosible = 0;
          continue;
        }

        // Consolidar stock desde todas las áreas
        let stockConsolidado = 0;
        Object.values(areas || {}).forEach((area: any) => {
          if (area?.stock && typeof area.stock[itemId] === 'number') {
            stockConsolidado += area.stock[itemId];
          }
        });

        // Advertencia si el item está bajo stock
        if (stockConsolidado <= (itemInventario.minStock || 0)) {
          advertencias.push(
            `${itemInventario.nombre}: Stock bajo (${stockConsolidado} ${itemInventario.unidad})`
          );
        }

        // Calcular capacidad de producción
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

  // Sincronizar el estado durante la fase de renderizado para evitar cascading renders
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

  // Debounce y validación preventiva de la receta activa
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
    }, 400); // 400ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [recetaEnEdicion, validarReceta]);

  // 🎭 ORQUESTACIÓN: Crear producto con validación
  const crearProductoConValidacion = async (datos: {
    nombre: string;
    precio: string | number;
    categoriaId: string;
    variantes?: Record<string, any>;
    visible?: Record<string, boolean>;
    prepMin?: number;
    receta?: Record<string, any>;
    usarConfigPersonalizada?: boolean;
    enviarACocina?: boolean;
    saltarPreparando?: boolean;
    unidad?: string;
  }) => {
    if (!datos.nombre || !datos.precio || !datos.categoriaId) {
      throw new Error('Completa nombre, precio y categoría');
    }

    const precio = typeof datos.precio === 'string' ? parseFloat(datos.precio) : datos.precio;
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error('El precio debe ser un número válido');
    }

    // 🔍 VALIDAR RECETA si existe
    if (datos.receta?.ingredientes && Object.keys(datos.receta.ingredientes).length > 0) {
      const validacion = await validarReceta(datos.receta.ingredientes);
      if (!validacion.valida) {
        throw new Error(`Receta inválida: ${validacion.errores.join('; ')}`);
      }
      // Advertencias se pueden mostrar pero no bloquean
      if (validacion.advertencias.length > 0) {
        console.warn('[MenuManagement] Advertencias de receta:', validacion.advertencias);
      }
    }

    return await crearProducto({
      nombre: datos.nombre.trim(),
      precio,
      categoriaId: datos.categoriaId,
      activo: true,
      variantes: datos.variantes || {},
      visible: datos.visible || { digital: true, mesero: true },
      prepMin: datos.prepMin || 0,
      receta: datos.receta || {},
      usarConfigPersonalizada: datos.usarConfigPersonalizada,
      enviarACocina: datos.enviarACocina,
      saltarPreparando: datos.saltarPreparando,
      unidad: datos.unidad as any,
    });
  };

  // 🎭 ORQUESTACIÓN: Actualizar producto con validación
  const actualizarProductoConValidacion = async (
    id: string,
    datos: {
      nombre: string;
      precio: string | number;
      variantes?: Record<string, any>;
      visible?: Record<string, boolean>;
      prepMin?: number;
      receta?: Record<string, any>;
      usarConfigPersonalizada?: boolean;
      enviarACocina?: boolean;
      saltarPreparando?: boolean;
      unidad?: string;
    }
  ) => {
    if (!datos.nombre || !datos.precio) {
      throw new Error('Completa nombre y precio');
    }

    const precio = typeof datos.precio === 'string' ? parseFloat(datos.precio) : datos.precio;
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error('El precio debe ser un número válido');
    }

    // 🔍 VALIDAR RECETA si existe
    if (datos.receta?.ingredientes && Object.keys(datos.receta.ingredientes).length > 0) {
      const validacion = await validarReceta(datos.receta.ingredientes);
      if (!validacion.valida) {
        throw new Error(`Receta inválida: ${validacion.errores.join('; ')}`);
      }
      // Advertencias se pueden mostrar pero no bloquean
      if (validacion.advertencias.length > 0) {
        console.warn('[MenuManagement] Advertencias de receta:', validacion.advertencias);
      }
    }

    await actualizarProducto(id, {
      nombre: datos.nombre.trim(),
      precio,
      variantes: datos.variantes,
      visible: datos.visible,
      prepMin: datos.prepMin,
      receta: datos.receta,
      usarConfigPersonalizada: datos.usarConfigPersonalizada,
      enviarACocina: datos.enviarACocina,
      saltarPreparando: datos.saltarPreparando,
      unidad: datos.unidad as any,
    });
  };

  const refresh = async () => {
    try {
      await Promise.all([menuRepo.obtenerCategorias(), menuRepo.obtenerProductos()]);
    } catch (err) {
      console.error('[MenuManagement] Error refreshing menu:', err);
      throw err;
    }
  };

  // Helpers
  const getProductosPorCategoria = (categoriaId: string): Producto[] => {
    return Object.entries(storeProductos)
      .filter(([_, prod]) => prod.categoriaId === categoriaId)
      .map(([id, prod]) => ({ ...prod, id, categoriaId })) as Producto[];
  };

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
    loading,
    validacionActive,
    validandoActive,

    // Acciones
    actions: {
      // Categorías
      crearCategoria,
      crearCategoriaConValidacion, // 🎭 Orquestación: crea con validación
      actualizarCategoria,
      eliminarCategoria,

      // Productos
      crearProducto,
      crearProductoConValidacion, // 🎭 Orquestación: crea con validación
      actualizarProducto,
      actualizarProductoConValidacion, // 🎭 Orquestación: actualiza con validación
      eliminarProducto,
      eliminarProductoConValidacion,
      toggleProductoActivo,
      refresh,

      // 🔍 Validación
      validarReceta, // 🔍 Valida receta contra inventario
      setRecetaEnEdicion,
    },

    // Helpers
    getProductosPorCategoria,
  };
}
