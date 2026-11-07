/**
 * 🧠 CEREBRO - LIBRO DE PLATILLOS Y PRODUCCIÓN DE COCINA
 *
 * Gestiona:
 * - Suscripción en tiempo real a platillos (`/menu/libro_platillos`) y lotes de producción (`/inventario/produccion_lotes`).
 * - Caché local e hidratación instantánea en memoria + AsyncStorage (Offline-First, cero lag visual al abrir el modal).
 * - Actualización optimista inmediata al crear/editar/eliminar platillos o iniciar/completar lotes.
 * - Cálculo en vivo de costos por receta (insumos + consumo estimado de gas por nivel de flama y tiempo).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from 'firebase/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRtdb } from '../../sistema/firebase';
import {
  RepositorioLibroPlatillos,
  TARIFAS_GAS_POR_DEFECTO,
  calcularCosteoYCapacidadPlatillo,
  normalizarIngredientesReceta,
  type IngredienteRecetaPlatillo,
  type LoteProduccionCocina,
  type ModoPreparacionPlatillo,
  type NivelFlamaCoccion,
  type PlatilloCocina,
  type ResumenCosteoPlatillo,
  type TarifasGasCocina,
  type UnidadRendimientoPlatillo,
} from '../../sistema/persistencia/platillos.repositorio';
import {
  useInventoryAreas,
  useInventoryCatalog,
  useInventorySections,
  useProductos,
  useStore,
} from '../../sistema/store';

export interface BorradorPlatilloCocina {
  id?: string;
  nombre: string;
  descripcion: string;
  imagenId?: string;
  modoPreparacion: ModoPreparacionPlatillo;
  rendimientoCantidad: string;
  rendimientoUnidad: UnidadRendimientoPlatillo;
  rendimientoDescripcion: string;
  ingredientes: Record<string, IngredienteRecetaPlatillo>;
  procedimientoTexto: string;
  prepMin: string;
  nivelFlama: NivelFlamaCoccion;
  minutosCoccion: string;
  estacionPreparacion: string;
  areaPreparacionId?: string;
  activo: boolean;
}

export const BORRADOR_PLATILLO_INICIAL: BorradorPlatilloCocina = {
  nombre: '',
  descripcion: '',
  imagenId: undefined,
  modoPreparacion: 'por_pedido',
  rendimientoCantidad: '1',
  rendimientoUnidad: 'porcion',
  rendimientoDescripcion: '',
  ingredientes: {},
  procedimientoTexto: '',
  prepMin: '15',
  nivelFlama: 'media',
  minutosCoccion: '10',
  estacionPreparacion: 'Cocina Principal',
  areaPreparacionId: undefined,
  activo: true,
};

// Caché en memoria de módulo + AsyncStorage para respuesta 0ms (Offline-First)
let borradorPlatilloEnSesion: BorradorPlatilloCocina | null = null;
const migradosLegacyPorNegocio = new Set<string>();
const cachePlatillosPorNegocio: Record<string, Record<string, PlatilloCocina>> = {};
const cacheLotesPorNegocio: Record<string, Record<string, LoteProduccionCocina>> = {};
const cacheTarifasGasPorNegocio: Record<string, TarifasGasCocina> = {};

const STORAGE_PLATILLOS_PREFIX = '@adi_libro_platillos_v1:';
const STORAGE_LOTES_PREFIX = '@adi_produccion_lotes_v1:';
const STORAGE_GAS_PREFIX = '@adi_tarifas_gas_v1:';

export function obtenerBorradorPlatilloGuardado(): BorradorPlatilloCocina | null {
  return borradorPlatilloEnSesion;
}

export function guardarBorradorPlatilloEnSesion(borrador: BorradorPlatilloCocina | null): void {
  borradorPlatilloEnSesion = borrador;
}

export function useLibroPlatillosYProduccion(props?: { db?: Database; rutaNegocio?: string }) {
  const storeRutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const ds = useStore((s) => s.dataSources);
  const operador = useStore((s) => s.sesion.usuario?.nombre) || 'Cocina';
  const rutaNegocio = props?.rutaNegocio || storeRutaNegocio;
  const cacheKey = rutaNegocio || 'default';

  const db = useMemo(
    () => props?.db || getRtdb(ds?.operacionUrl || undefined),
    [props?.db, ds?.operacionUrl]
  );

  const catalogoInventario = useInventoryCatalog();
  const areasInventario = useInventoryAreas();
  const seccionesInventario = useInventorySections();
  const productosMenu = useProductos();

  const [platillosMap, setPlatillosMap] = useState<Record<string, PlatilloCocina>>(
    () => cachePlatillosPorNegocio[cacheKey] || {}
  );
  const [lotesMap, setLotesMap] = useState<Record<string, LoteProduccionCocina>>(
    () => cacheLotesPorNegocio[cacheKey] || {}
  );
  const [tarifasGas, setTarifasGas] = useState<TarifasGasCocina>(
    () => cacheTarifasGasPorNegocio[cacheKey] || TARIFAS_GAS_POR_DEFECTO
  );
  const [loading, setLoading] = useState<boolean>(
    () => !cachePlatillosPorNegocio[cacheKey]
  );
  const migrandoRef = useRef<boolean>(false);

  const repo = useMemo(() => {
    if (!rutaNegocio) return null;
    try {
      return new RepositorioLibroPlatillos(db, rutaNegocio);
    } catch {
      return null;
    }
  }, [db, rutaNegocio]);

  // Hidratar desde AsyncStorage al instante si no estaba en memoria RAM
  useEffect(() => {
    let cancelado = false;
    if (cachePlatillosPorNegocio[cacheKey]) {
      setPlatillosMap(cachePlatillosPorNegocio[cacheKey]);
      setLoading(false);
    } else {
      AsyncStorage.getItem(`${STORAGE_PLATILLOS_PREFIX}${cacheKey}`)
        .then((raw) => {
          if (cancelado || !raw) return;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            cachePlatillosPorNegocio[cacheKey] = parsed;
            setPlatillosMap((prev) => (Object.keys(prev).length === 0 ? parsed : prev));
            setLoading(false);
          }
        })
        .catch(() => {});
    }

    if (!cacheLotesPorNegocio[cacheKey]) {
      AsyncStorage.getItem(`${STORAGE_LOTES_PREFIX}${cacheKey}`)
        .then((raw) => {
          if (cancelado || !raw) return;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            cacheLotesPorNegocio[cacheKey] = parsed;
            setLotesMap((prev) => (Object.keys(prev).length === 0 ? parsed : prev));
          }
        })
        .catch(() => {});
    }

    AsyncStorage.getItem(`${STORAGE_GAS_PREFIX}${cacheKey}`)
      .then((raw) => {
        if (cancelado || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...TARIFAS_GAS_POR_DEFECTO, ...parsed };
          cacheTarifasGasPorNegocio[cacheKey] = merged;
          setTarifasGas(merged);
        }
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [cacheKey]);

  const actualizarTarifasGas = useCallback(
    async (nuevas: Partial<TarifasGasCocina>) => {
      const next: TarifasGasCocina = {
        bajaPorMin: Math.max(0, Number(nuevas.bajaPorMin ?? tarifasGas.bajaPorMin)),
        mediaPorMin: Math.max(0, Number(nuevas.mediaPorMin ?? tarifasGas.mediaPorMin)),
        altaPorMin: Math.max(0, Number(nuevas.altaPorMin ?? tarifasGas.altaPorMin)),
      };
      cacheTarifasGasPorNegocio[cacheKey] = next;
      setTarifasGas(next);
      await AsyncStorage.setItem(`${STORAGE_GAS_PREFIX}${cacheKey}`, JSON.stringify(next)).catch(
        () => {}
      );
    },
    [cacheKey, tarifasGas]
  );

  // Calcular stock consolidado por artículo sumando áreas y secciones
  const stockConsolidadoPorItem = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const area of Object.values(areasInventario || {})) {
      for (const [itemId, qty] of Object.entries(area?.stock || {})) {
        acc[itemId] = (acc[itemId] || 0) + Number(qty || 0);
      }
    }
    for (const sec of Object.values(seccionesInventario || {})) {
      for (const [itemId, qty] of Object.entries((sec as any)?.stock || {})) {
        acc[itemId] = (acc[itemId] || 0) + Number(qty || 0);
      }
    }
    return acc;
  }, [areasInventario, seccionesInventario]);

  useEffect(() => {
    if (!repo || !rutaNegocio) {
      setLoading(false);
      return;
    }

    const unsubPlatillos = repo.suscribirPlatillos((data) => {
      cachePlatillosPorNegocio[cacheKey] = data;
      setPlatillosMap(data);
      setLoading(false);
      AsyncStorage.setItem(`${STORAGE_PLATILLOS_PREFIX}${cacheKey}`, JSON.stringify(data)).catch(
        () => {}
      );
    });
    const unsubLotes = repo.suscribirLotesProduccion((data) => {
      cacheLotesPorNegocio[cacheKey] = data;
      setLotesMap(data);
      AsyncStorage.setItem(`${STORAGE_LOTES_PREFIX}${cacheKey}`, JSON.stringify(data)).catch(
        () => {}
      );
    });

    return () => {
      unsubPlatillos();
      unsubLotes();
    };
  }, [repo, rutaNegocio, cacheKey]);

  // Migración automática idempotente de productos de Menú que ya tenían `receta.ingredientes`
  useEffect(() => {
    if (!repo || !rutaNegocio || loading || migrandoRef.current) return;
    if (migradosLegacyPorNegocio.has(rutaNegocio)) return;

    const listaProductosMenu = Object.values(productosMenu || {});
    if (listaProductosMenu.length === 0) {
      return;
    }

    const productosConReceta = listaProductosMenu.filter(
      (p) =>
        p?.receta?.ingredientes &&
        Object.keys(p.receta.ingredientes).length > 0 &&
        !platillosMap[p.id] &&
        !Object.values(platillosMap).some(
          (pl) => pl.nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase()
        )
    );

    if (productosConReceta.length === 0) {
      migradosLegacyPorNegocio.add(rutaNegocio);
      return;
    }

    migrandoRef.current = true;
    migradosLegacyPorNegocio.add(rutaNegocio);

    (async () => {
      try {
        for (const prod of productosConReceta) {
          const ings = normalizarIngredientesReceta(
            prod.receta?.ingredientes,
            catalogoInventario
          );
          if (Object.keys(ings).length === 0) continue;
          await repo.guardarPlatillo({
            id: prod.id,
            nombre: prod.nombre,
            descripcion: prod.descripcion,
            imagenId: prod.imagenId || prod.imagen,
            modoPreparacion: prod.modoPreparacion || 'por_pedido',
            rendimiento: {
              cantidad: 1,
              unidad: 'porcion',
            },
            ingredientes: ings,
            procedimiento: [],
            prepMin: prod.prepMin || 15,
            nivelFlama: 'media',
            minutosCoccion: prod.prepMin || 10,
            estacionPreparacion: prod.estacion_preparacion || 'Cocina Principal',
            areaPreparacionId: prod.inventoryAreaId || prod.areaId,
            variantes: prod.variantes ? { grupos: prod.variantes.grupos } : undefined,
            activo: prod.activo !== false,
          });
        }
      } catch (err) {
        console.warn('[LibroPlatillos] Advertencia migrando recetas legacy:', err);
      } finally {
        migrandoRef.current = false;
      }
    })();
  }, [repo, rutaNegocio, loading, productosMenu, platillosMap, catalogoInventario]);

  const platillosConCosteo = useMemo(() => {
    return Object.values(platillosMap)
      .map((platillo) => {
        const costeo = calcularCosteoYCapacidadPlatillo({
          platillo,
          catalogoInventario,
          stockConsolidadoPorItem,
          tarifasGas,
        });
        return {
          ...platillo,
          costeo,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [platillosMap, catalogoInventario, stockConsolidadoPorItem, tarifasGas]);

  // Estaciones de cocina dinámicas derivadas de las áreas configuradas por el administrador
  const estacionesDisponibles = useMemo(() => {
    const nombres = new Set<string>();
    for (const area of Object.values(areasInventario || {})) {
      if (!area || area.parentId) continue;
      if (area.tipo === 'mostrador') continue;
      if (area.nombre) {
        nombres.add(area.nombre);
      }
    }
    for (const pl of Object.values(platillosMap)) {
      if (pl.estacionPreparacion && pl.estacionPreparacion !== 'cafeteria') {
        nombres.add(pl.estacionPreparacion);
      }
    }
    if (nombres.size === 0) {
      nombres.add('Cocina Principal');
      nombres.add('Barra');
    }
    return Array.from(nombres);
  }, [areasInventario, platillosMap]);

  const lotesOrdenados = useMemo(() => {
    return Object.values(lotesMap).sort((a, b) => b.iniciadoEn - a.iniciadoEn);
  }, [lotesMap]);

  const lotesActivos = useMemo(
    () =>
      lotesOrdenados.filter(
        (l) => l.estado === 'en_preparacion' || l.estado === 'pausado'
      ),
    [lotesOrdenados]
  );

  const calcularCosteoBorrador = useCallback(
    (borrador: BorradorPlatilloCocina): ResumenCosteoPlatillo => {
      return calcularCosteoYCapacidadPlatillo({
        platillo: {
          rendimiento: {
            cantidad: Math.max(1, Number(borrador.rendimientoCantidad || 1)),
            unidad: borrador.rendimientoUnidad,
          },
          ingredientes: borrador.ingredientes,
          nivelFlama: borrador.nivelFlama,
          minutosCoccion: Math.max(0, parseInt(borrador.minutosCoccion || borrador.prepMin, 10) || 0),
          prepMin: Math.max(1, parseInt(borrador.prepMin, 10) || 15),
        },
        catalogoInventario,
        stockConsolidadoPorItem,
        tarifasGas,
      });
    },
    [catalogoInventario, stockConsolidadoPorItem, tarifasGas]
  );

  const guardarPlatilloDesdeBorrador = useCallback(
    async (borrador: BorradorPlatilloCocina): Promise<PlatilloCocina> => {
      const nombreLimpio = borrador.nombre.trim();
      if (!nombreLimpio) {
        throw new Error('El platillo requiere un nombre.');
      }

      const costeo = calcularCosteoBorrador(borrador);
      const pasos = borrador.procedimientoTexto
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const idOptimista = borrador.id || `plat_${Date.now()}`;
      const platilloOptimista: PlatilloCocina = {
        id: idOptimista,
        nombre: nombreLimpio,
        descripcion: borrador.descripcion.trim() || undefined,
        imagenId: borrador.imagenId,
        modoPreparacion: borrador.modoPreparacion,
        rendimiento: {
          cantidad: Math.max(1, Number(borrador.rendimientoCantidad || 1)),
          unidad: borrador.rendimientoUnidad,
          descripcion: borrador.rendimientoDescripcion.trim() || undefined,
        },
        ingredientes: borrador.ingredientes,
        procedimiento: pasos,
        prepMin: Math.max(1, parseInt(borrador.prepMin, 10) || 15),
        nivelFlama: borrador.nivelFlama || 'media',
        minutosCoccion: Math.max(0, parseInt(borrador.minutosCoccion || borrador.prepMin, 10) || 0),
        estacionPreparacion: borrador.estacionPreparacion || 'Cocina Principal',
        areaPreparacionId: borrador.areaPreparacionId,
        activo: borrador.activo,
        version: 1,
        updatedAt: Date.now(),
      };

      // Actualización optimista inmediata en UI y caché local
      setPlatillosMap((prev) => {
        const next = { ...prev, [idOptimista]: platilloOptimista };
        cachePlatillosPorNegocio[cacheKey] = next;
        AsyncStorage.setItem(`${STORAGE_PLATILLOS_PREFIX}${cacheKey}`, JSON.stringify(next)).catch(
          () => {}
        );
        return next;
      });
      guardarBorradorPlatilloEnSesion(null);

      if (!repo) return platilloOptimista;

      const guardado = await repo.guardarPlatillo({
        id: idOptimista,
        nombre: nombreLimpio,
        descripcion: platilloOptimista.descripcion,
        imagenId: platilloOptimista.imagenId,
        modoPreparacion: platilloOptimista.modoPreparacion,
        rendimiento: platilloOptimista.rendimiento,
        ingredientes: platilloOptimista.ingredientes,
        procedimiento: platilloOptimista.procedimiento,
        prepMin: platilloOptimista.prepMin,
        nivelFlama: platilloOptimista.nivelFlama,
        minutosCoccion: platilloOptimista.minutosCoccion,
        estacionPreparacion: platilloOptimista.estacionPreparacion,
        areaPreparacionId: platilloOptimista.areaPreparacionId,
        activo: platilloOptimista.activo,
        costoUnitarioEstimado: costeo.costoPorUnidadRendimiento,
      });

      return guardado;
    },
    [repo, calcularCosteoBorrador, cacheKey]
  );

  const eliminarPlatillo = useCallback(
    async (platilloId: string) => {
      setPlatillosMap((prev) => {
        const next = { ...prev };
        delete next[platilloId];
        cachePlatillosPorNegocio[cacheKey] = next;
        AsyncStorage.setItem(`${STORAGE_PLATILLOS_PREFIX}${cacheKey}`, JSON.stringify(next)).catch(
          () => {}
        );
        return next;
      });
      if (!repo) return;
      await repo.eliminarPlatillo(platilloId);
    },
    [repo, cacheKey]
  );

  const iniciarLote = useCallback(
    async (params: {
      platillo: PlatilloCocina;
      multiplicadorLote: number;
      areaOrigenId?: string;
      areaDestinoId?: string;
      allowNegative?: boolean;
    }) => {
      if (!repo) throw new Error('Repositorio de producción no disponible');
      return repo.iniciarLoteProduccion({
        ...params,
        operador,
      });
    },
    [repo, operador]
  );

  const cambiarEstadoLote = useCallback(
    async (
      loteId: string,
      nuevoEstado: 'en_preparacion' | 'pausado' | 'cancelado',
      motivo?: string
    ) => {
      setLotesMap((prev) => {
        if (!prev[loteId]) return prev;
        const next = {
          ...prev,
          [loteId]: { ...prev[loteId], estado: nuevoEstado, actualizadoEn: Date.now() },
        };
        cacheLotesPorNegocio[cacheKey] = next;
        return next;
      });
      if (!repo) return;
      await repo.cambiarEstadoLote(loteId, nuevoEstado, motivo);
    },
    [repo, cacheKey]
  );

  const completarLote = useCallback(
    async (params: {
      loteId: string;
      rendimientoObtenido: number;
      motivoDiferencia?: string;
      areaDestinoId?: string;
    }) => {
      if (!repo) throw new Error('Repositorio de producción no disponible');
      return repo.completarLoteProduccion({
        ...params,
        operador,
      });
    },
    [repo, operador]
  );

  return {
    loading,
    platillos: platillosConCosteo,
    platillosMap,
    lotes: lotesOrdenados,
    lotesActivos,
    estacionesDisponibles,
    tarifasGas,
    catalogoInventario,
    areasInventario,
    stockConsolidadoPorItem,
    calcularCosteoBorrador,
    actions: {
      guardarPlatilloDesdeBorrador,
      eliminarPlatillo,
      iniciarLote,
      cambiarEstadoLote,
      completarLote,
      actualizarTarifasGas,
    },
  };
}
