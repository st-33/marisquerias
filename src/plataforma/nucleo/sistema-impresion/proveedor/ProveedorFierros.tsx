/**
 * 🎁 PROVEEDOR DE FIERROS (Context Provider)
 *
 * Envuelve la app y provee acceso al servicioFierros via Context.
 * Garantiza que todos los componentes compartan la MISMA instancia.
 *
 * USO:
 * ```tsx
 * // En _layout.tsx
 * <ProveedorFierros>
 *   <App />
 * </ProveedorFierros>
 *
 * // En cualquier componente
 * const fierros = useFierros();
 * await fierros.escanear();
 * ```
 */

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { IControladorFierros } from '../contratos/IControladorFierros';
import type {
  ConfiguracionTicket,
  DatosComanda,
  DatosCuenta,
  DatosVenta,
  DispositivoFierro,
  EstadoFierros,
  ItemPesado,
  OpcionesImpresion,
  OpcionesLecturaPeso,
  ResultadoImpresion,
  ResultadoOperacion,
  ResultadoPeso,
} from '../contratos/tipos';
import { servicioFierros } from '../servicio/ServicioFierros';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DEL CONTEXTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valor expuesto por el contexto
 * Combina estado reactivo + acciones
 */
interface ContextoFierrosValor extends EstadoFierros {
  // Conexión
  escanear: () => Promise<DispositivoFierro[]>;
  conectarImpresora: (dispositivo: DispositivoFierro) => Promise<void>;
  conectarBascula: (dispositivo: DispositivoFierro) => Promise<void>;
  desconectar: () => Promise<void>;

  // Impresión
  imprimirComanda: (
    datos: DatosComanda,
    opciones: OpcionesImpresion
  ) => Promise<ResultadoImpresion>;
  imprimirCuenta: (datos: DatosCuenta, opciones: OpcionesImpresion) => Promise<ResultadoImpresion>;
  imprimirTicketVenta: (
    datos: DatosVenta,
    config: ConfiguracionTicket
  ) => Promise<ResultadoImpresion>;
  imprimirEtiquetaBascula: (
    item: ItemPesado,
    config: ConfiguracionTicket
  ) => Promise<ResultadoImpresion>;

  // Báscula
  leerPeso: (opciones?: OpcionesLecturaPeso) => Promise<ResultadoPeso>;
  tararBascula: () => Promise<ResultadoOperacion>;

  // Obtener servicio directamente (para casos avanzados)
  obtenerServicio: () => IControladorFierros;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXTO
// ═══════════════════════════════════════════════════════════════════════════

const ContextoFierros = createContext<ContextoFierrosValor | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface ProveedorFierrosProps {
  children: ReactNode;
}

export const ProveedorFierros: React.FC<ProveedorFierrosProps> = ({ children }) => {
  // Estado local que refleja el servicio
  const [estado, setEstado] = useState<EstadoFierros>(servicioFierros.obtenerEstado());

  // Ref para garantizar que el servicio no se reinstancie
  const servicioRef = useRef(servicioFierros);

  // Suscribirse a cambios del servicio
  useEffect(() => {
    const cancelar = servicioRef.current.suscribir((nuevoEstado) => {
      setEstado(nuevoEstado);
    });

    return () => cancelar();
  }, []);

  // Memoizar acciones (no cambian nunca)
  const acciones = useMemo(
    () => ({
      escanear: () => servicioRef.current.escanearDispositivos(),
      conectarImpresora: (d: DispositivoFierro) => servicioRef.current.conectarImpresora(d),
      conectarBascula: (d: DispositivoFierro) => servicioRef.current.conectarBascula(d),
      desconectar: () => servicioRef.current.desconectar(),

      imprimirComanda: (datos: DatosComanda, opciones: OpcionesImpresion) =>
        servicioRef.current.imprimirComanda(datos, opciones),
      imprimirCuenta: (datos: DatosCuenta, opciones: OpcionesImpresion) =>
        servicioRef.current.imprimirCuenta(datos, opciones),
      imprimirTicketVenta: (datos: DatosVenta, config: ConfiguracionTicket) =>
        servicioRef.current.imprimirTicketVenta(datos, config),
      imprimirEtiquetaBascula: (item: ItemPesado, config: ConfiguracionTicket) =>
        servicioRef.current.imprimirEtiquetaBascula(item, config),

      leerPeso: (opciones?: OpcionesLecturaPeso) => servicioRef.current.leerPeso(opciones),
      tararBascula: () => servicioRef.current.tararBascula(),

      obtenerServicio: () => servicioRef.current as IControladorFierros,
    }),
    []
  );

  // Combinar estado + acciones
  const valor = useMemo<ContextoFierrosValor>(
    () => ({
      ...estado,
      ...acciones,
    }),
    [estado, acciones]
  );

  return <ContextoFierros.Provider value={valor}>{children}</ContextoFierros.Provider>;
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para acceder al sistema de fierros
 *
 * @example
 * ```tsx
 * const { estaConectado, escanear, conectarImpresora } = useFierros();
 *
 * const dispositivos = await escanear();
 * await conectarImpresora(dispositivos[0]);
 * ```
 */
export const useFierros = (): ContextoFierrosValor => {
  const contexto = useContext(ContextoFierros);

  if (contexto === undefined) {
    throw new Error(
      '[useFierros] Este hook debe usarse dentro de <ProveedorFierros>. ' +
        'Asegúrate de envolver tu app con el provider en _layout.tsx'
    );
  }

  return contexto;
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para verificar solo el estado de conexión
 */
export const useEstaConectado = (): boolean => {
  const { estaConectado } = useFierros();
  return estaConectado;
};

/**
 * Hook para obtener el dispositivo activo
 */
export const useDispositivoActivo = (): DispositivoFierro | null => {
  const { dispositivoActivo } = useFierros();
  return dispositivoActivo;
};

/**
 * Hook para obtener la báscula activa
 */
export const useBasculaActiva = (): DispositivoFierro | null => {
  const { basculaActiva } = useFierros();
  return basculaActiva;
};

/**
 * Hook para obtener solo el error
 */
export const useErrorFierros = (): string | null => {
  const { error } = useFierros();
  return error;
};
