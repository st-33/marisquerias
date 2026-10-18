/**
 * 💰 HOOK DE LÓGICA DE COBRO EN CAJA (TERMINAL CIEGA)
 *
 * Extrae la lógica de cobro rápido de mostrador:
 * - Carrito en memoria con cálculo de subtotal, descuento y total
 * - Búsqueda y filtrado de productos por categoría y texto
 * - Selección de método de pago (efectivo, tarjeta, transferencia)
 * - Emisión de ticket delegando en servicioFierros si tickets_impresion está activa
 * - Registro contable en RegistroVentasRepository
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MenuRepository, type Producto } from '../../../sistema/persistencia';
import type { Categoria } from '../../../sistema/persistencia/menu.repositorio';
import { RegistroVentasRepository } from '../../../sistema/persistencia/registroVentas.repositorio';
import { servicioFierros } from '../../../sistema/impresion/fierros';
import { getRtdb } from '../../../sistema/firebase';
import { SQLiteStorageAdapter } from '../../../sistema/sin_conexion/almacenamiento/AdaptadorAlmacenamientoSQLite';
import { useStore } from '../../../sistema/store';
import { resolverDeviceIdADI } from '../../../sistema/instalacion/vinculacion/generar-device-id-adi';

export interface ItemCarritoCaja {
  id: string;
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  unidad?: string;
}

export type MetodoPagoCaja = 'efectivo' | 'tarjeta' | 'transferencia';

export interface OpcionesCobro {
  imprimirTicket?: boolean;
  metodoPago?: MetodoPagoCaja;
}

export interface ResultadoCobro {
  exito: boolean;
  ventaId?: string;
  ticketEmitido: boolean;
  error?: string;
}

export interface UseCajaCobroProps {
  db?: any;
  rutaNegocio?: string;
  usuario?: string;
}

export function useCajaCobro(props?: UseCajaCobroProps) {
  const storeRutaNegocio = useStore((s) => s.sesion.rutaNegocio) || '';
  const ds = useStore((s) => s.dataSources);
  const storeUsuario = useStore((s) => s.sesion.usuario?.nombre) || 'Cajero';
  const estadoEncendido = useStore((s) => s.estadoEncendido);

  const rutaNegocio = props?.rutaNegocio ?? storeRutaNegocio;
  const usuario = props?.usuario ?? storeUsuario;

  const db = useMemo(() => {
    if (props?.db) return props.db;
    return getRtdb(ds?.operacionUrl || undefined);
  }, [props?.db, ds?.operacionUrl]);

  const [loading, setLoading] = useState(Boolean(rutaNegocio));
  const [productos, setProductos] = useState<Record<string, Producto>>({});
  const [categorias, setCategorias] = useState<Record<string, Categoria>>({});
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarritoCaja[]>([]);
  const [descuento, setDescuento] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoCaja>('efectivo');
  const [procesandoCobro, setProcesandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);
  const [ultimoCobro, setUltimoCobro] = useState<ResultadoCobro | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Determinar si la capacidad tickets_impresion está encendida
  const ticketsImpresionActivo = useMemo(() => {
    if (estadoEncendido) {
      return (estadoEncendido.capacidades_activas || []).includes('tickets_impresion');
    }
    const capsStore = useStore.getState().negocio?.features as Record<string, any> | undefined;
    const ticketFeat = capsStore?.tickets_impresion ?? capsStore?.impresion;
    if (typeof ticketFeat === 'boolean') return ticketFeat;
    if (ticketFeat && typeof ticketFeat === 'object') return ticketFeat.enabled !== false;
    return true;
  }, [estadoEncendido]);

  // Cargar identificador del hardware
  useEffect(() => {
    resolverDeviceIdADI()
      .then(setDeviceId)
      .catch((err) => {
        console.warn('[useCajaCobro] Dispositivo fallback:', err);
        setDeviceId('caja-term-01');
      });
  }, []);

  // Repositorios
  const menuRepo = useMemo(() => new MenuRepository(db, rutaNegocio), [db, rutaNegocio]);
  const salesRepo = useMemo(() => new RegistroVentasRepository(db, rutaNegocio), [db, rutaNegocio]);

  // Carga de catálogo (offline cache + live)
  useEffect(() => {
    if (!rutaNegocio) {
      return;
    }

    let isMounted = true;

    const cargarCache = async () => {
      try {
        const cachedProds = await SQLiteStorageAdapter.getProductos();
        const cachedCats = await SQLiteStorageAdapter.getCategorias();
        if (isMounted) {
          if (cachedProds && Object.keys(cachedProds).length > 0) {
            setProductos(cachedProds as Record<string, Producto>);
          }
          if (cachedCats && Object.keys(cachedCats).length > 0) {
            setCategorias(cachedCats as Record<string, Categoria>);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('[useCajaCobro] Error cargando caché SQLite:', err);
      }
    };
    void cargarCache();

    const unsubMenu = menuRepo.suscribirProductos((data) => {
      if (isMounted && data) {
        setProductos(data);
      }
    });

    const unsubCats = menuRepo.suscribirCategorias((data) => {
      if (isMounted && data) {
        setCategorias(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubMenu();
      unsubCats();
    };
  }, [rutaNegocio, menuRepo]);

  // Totales
  const subtotal = useMemo(() => carrito.reduce((acc, it) => acc + it.subtotal, 0), [carrito]);

  const total = useMemo(() => Math.max(0, subtotal - descuento), [subtotal, descuento]);

  // Lista filtrada de productos
  const productosFiltrados = useMemo(() => {
    return Object.values(productos).filter((p) => {
      if (!p.activo && p.activo !== undefined) return false;
      if (categoriaSeleccionada && p.categoriaId !== categoriaSeleccionada) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideNombre = p.nombre.toLowerCase().includes(q);
        const coincideCodigo = p.codigoBarras ? p.codigoBarras.includes(q) : false;
        return coincideNombre || coincideCodigo;
      }
      return true;
    });
  }, [productos, categoriaSeleccionada, busqueda]);

  // Acciones de Carrito
  const agregarProducto = useCallback((producto: Producto, cantidad = 1) => {
    setCarrito((prev) => {
      const index = prev.findIndex((i) => i.productoId === producto.id);
      if (index >= 0) {
        const itemExistente = prev[index];
        const nuevaCantidad = itemExistente.cantidad + cantidad;
        const actualizado: ItemCarritoCaja = {
          ...itemExistente,
          cantidad: nuevaCantidad,
          subtotal: itemExistente.precio * nuevaCantidad,
        };
        const copia = [...prev];
        copia[index] = actualizado;
        return copia;
      }

      const nuevo: ItemCarritoCaja = {
        id: `${producto.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad,
        subtotal: producto.precio * cantidad,
        unidad: producto.unidad || 'pza',
      };
      return [...prev, nuevo];
    });
  }, []);

  const actualizarCantidad = useCallback((itemId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setCarrito((prev) => prev.filter((i) => i.id !== itemId));
      return;
    }
    setCarrito((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, cantidad, subtotal: i.precio * cantidad } : i))
    );
  }, []);

  const eliminarItem = useCallback((itemId: string) => {
    setCarrito((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setDescuento(0);
    setErrorCobro(null);
  }, []);

  const aplicarDescuento = useCallback((monto: number) => {
    setDescuento(Math.max(0, monto));
  }, []);

  // Cobro
  const cobrar = useCallback(
    async (opciones?: OpcionesCobro): Promise<ResultadoCobro> => {
      if (carrito.length === 0) {
        const err = 'El carrito está vacío. Agrega productos antes de cobrar.';
        setErrorCobro(err);
        return { exito: false, ticketEmitido: false, error: err };
      }

      setProcesandoCobro(true);
      setErrorCobro(null);

      const metodoSeleccionado = opciones?.metodoPago ?? metodoPago;
      const debeImprimir = ticketsImpresionActivo && (opciones?.imprimirTicket ?? true);

      try {
        const ventaId = `caja_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const timestamp = Date.now();

        const resumenItems = carrito.map((it) => ({
          productoId: it.productoId,
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio: it.precio,
          subtotal: it.subtotal,
        }));

        // 1. Registro de venta contable
        await salesRepo.registrarMostrador({
          id: ventaId,
          total,
          metodoPago: metodoSeleccionado,
          items: resumenItems,
          timestamp,
          usuario,
        });

        // 2. Emisión de ticket (si capacidad activa)
        let ticketEmitido = false;
        if (debeImprimir) {
          try {
            const res = await servicioFierros.imprimirTicketVenta(
              {
                items: carrito.map((r) => ({
                  nombre: r.nombre,
                  cantidad: r.cantidad,
                  precio: r.precio,
                  subtotal: r.subtotal,
                  unidad: (r.unidad === 'kg' || r.unidad === 'lt' ? r.unidad : 'pza') as
                    | 'kg'
                    | 'pza'
                    | 'lt',
                })),
                total,
                timestamp,
                folio: ventaId,
              },
              {
                nombreNegocio: 'Caja Marisquería',
                mensajeFinal: '¡Gracias por su compra!',
              }
            );
            ticketEmitido = res?.exito === true;
          } catch (printErr) {
            console.warn('[useCajaCobro] Error al emitir ticket físico:', printErr);
            ticketEmitido = false;
          }
        }

        // 3. Reset del carrito y estado
        setCarrito([]);
        setDescuento(0);

        const resCobro: ResultadoCobro = {
          exito: true,
          ventaId,
          ticketEmitido,
        };
        setUltimoCobro(resCobro);
        return resCobro;
      } catch (err) {
        const mensaje = (err as Error).message || 'Error desconocido al registrar la venta.';
        setErrorCobro(mensaje);
        return { exito: false, ticketEmitido: false, error: mensaje };
      } finally {
        setProcesandoCobro(false);
      }
    },
    [carrito, total, metodoPago, ticketsImpresionActivo, salesRepo, usuario]
  );

  return {
    // Datos y estados
    loading,
    productos,
    categorias,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    busqueda,
    setBusqueda,
    productosFiltrados,
    carrito,
    subtotal,
    descuento,
    total,
    metodoPago,
    setMetodoPago,
    procesandoCobro,
    errorCobro,
    ultimoCobro,
    ticketsImpresionActivo,
    deviceId,

    // Acciones
    agregarProducto,
    actualizarCantidad,
    eliminarItem,
    limpiarCarrito,
    aplicarDescuento,
    cobrar,
  };
}
