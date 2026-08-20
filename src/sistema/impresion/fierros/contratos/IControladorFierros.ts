/**
 * 🔌 INTERFAZ CONTROLADOR DE FIERROS
 *
 * El Contrato Sagrado™ que abstrae si usamos Bluetooth, USB o Red.
 * El resto del sistema no sabe qué marca de impresora usamos.
 *
 * IMPLEMENTACIONES:
 * - ServicioFierros.ts (Bluetooth Classic via react-native-bluetooth-classic)
 * - (Futuro) ServicioFierrosUSB.ts
 * - (Futuro) ServicioFierrosRed.ts
 */

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
} from './tipos';

/**
 * Tipo del listener para cambios de estado
 */
export type OyenteEstado = (estado: EstadoFierros) => void;

/**
 * Interfaz principal de abstracción de hardware de impresión
 */
export interface IControladorFierros {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO (Propiedades reactivas)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Si hay una impresora conectada */
  readonly estaConectado: boolean;

  /** Si está en proceso de conexión */
  readonly estaConectando: boolean;

  /** Si está escaneando dispositivos */
  readonly estaEscaneando: boolean;

  /** Impresora actualmente conectada */
  readonly dispositivoActivo: DispositivoFierro | null;

  /** Báscula actualmente conectada */
  readonly basculaActiva: DispositivoFierro | null;

  /** Último error ocurrido */
  readonly error: string | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONEXIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Escanea dispositivos disponibles
   * @returns Lista de dispositivos encontrados
   */
  escanearDispositivos(): Promise<DispositivoFierro[]>;

  /**
   * Conecta a una impresora
   * @param dispositivo - Dispositivo a conectar
   */
  conectarImpresora(dispositivo: DispositivoFierro): Promise<void>;

  /**
   * Conecta a una báscula
   * @param dispositivo - Dispositivo a conectar
   */
  conectarBascula(dispositivo: DispositivoFierro): Promise<void>;

  /**
   * Desconecta el dispositivo activo
   */
  desconectar(): Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPRESIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Imprime una comanda para cocina
   * @param datos - Datos de la comanda
   * @param opciones - Opciones de impresión
   */
  imprimirComanda(datos: DatosComanda, opciones: OpcionesImpresion): Promise<ResultadoImpresion>;

  /**
   * Imprime una cuenta/ticket de pago
   * @param datos - Datos de la cuenta
   * @param opciones - Opciones de impresión
   */
  imprimirCuenta(datos: DatosCuenta, opciones: OpcionesImpresion): Promise<ResultadoImpresion>;

  /**
   * Imprime un ticket de venta (Venta y Crudo)
   * @param datos - Datos de la venta
   * @param config - Configuración del ticket
   */
  imprimirTicketVenta(datos: DatosVenta, config: ConfiguracionTicket): Promise<ResultadoImpresion>;

  /**
   * Imprime una etiqueta de producto pesado
   * @param item - Datos del producto pesado
   * @param config - Configuración del ticket
   */
  imprimirEtiquetaBascula(
    item: ItemPesado,
    config: ConfiguracionTicket
  ): Promise<ResultadoImpresion>;

  // ═══════════════════════════════════════════════════════════════════════════
  // BÁSCULA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lee el peso actual de la báscula
   * @param opciones - Opciones de lectura
   */
  leerPeso(opciones?: OpcionesLecturaPeso): Promise<ResultadoPeso>;

  /**
   * Tara (pone en cero) la báscula
   */
  tararBascula(): Promise<ResultadoOperacion>;

  // ═══════════════════════════════════════════════════════════════════════════
  // SUSCRIPCIÓN (Patrón Observer para UI reactiva)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Suscribe un oyente a cambios de estado
   * @param oyente - Función que recibe el nuevo estado
   * @returns Función para cancelar la suscripción
   */
  suscribir(oyente: OyenteEstado): () => void;

  /**
   * Obtiene el estado actual (snapshot)
   */
  obtenerEstado(): EstadoFierros;
}
