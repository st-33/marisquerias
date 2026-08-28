/**
 * 📋 TIPOS DEL SISTEMA DE IMPRESIÓN
 *
 * Definiciones de tipos compartidos para todo el módulo sistema-impresion.
 * Nombres en Español Latino.
 */

// ═══════════════════════════════════════════════════════════════════════════
// DISPOSITIVOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Representa un dispositivo de hardware (impresora, báscula)
 */
export interface DispositivoFierro {
  /** Nombre visible del dispositivo (ej: "Printer-58mm") */
  nombre: string;
  /** Dirección única: MAC (Bluetooth), IP (Red), o path (USB) */
  direccion: string;
  /** Tipo de conexión */
  tipo: 'bluetooth' | 'usb' | 'red';
  /** Fabricante detectado (opcional) */
  fabricante?: string;
  /** Si el dispositivo está emparejado (Bluetooth) */
  emparejado?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTADOS DE OPERACIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resultado de una operación de impresión
 */
export interface ResultadoImpresion {
  /** Si la impresión fue exitosa */
  exito: boolean;
  /** Método usado para imprimir */
  metodo: 'hub' | 'bluetooth' | 'encolado';
  /** Mensaje descriptivo (error o confirmación) */
  mensaje?: string;
}

/**
 * Resultado de lectura de peso.
 *
 * `estable` es opcional porque no todos los protocolos de báscula publican
 * una señal de estabilidad. La ausencia de señal no equivale a estabilidad.
 */
export interface ResultadoPeso {
  exito: boolean;
  /** Peso leído (undefined si falló) */
  peso?: number;
  /** Unidad de medida */
  unidad: 'kg' | 'lb';
  /** Estabilidad observada por el protocolo, si fue informada */
  estable?: boolean;
  /** Indica que la operación fue cancelada antes de completar la lectura */
  cancelado?: boolean;
  /** Indica que el transporte agotó el tiempo de espera */
  timeout?: boolean;
  /** Código estable para que la UI o la telemetría clasifiquen el fallo */
  codigoError?:
    | 'BASCULA_NO_CONECTADA'
    | 'TIMEOUT'
    | 'FORMATO_INVALIDO'
    | 'LECTURA_INVALIDA'
    | 'ERROR_COMUNICACION';
  mensaje?: string;
}

/**
 * Resultado genérico de operación
 */
export interface ResultadoOperacion {
  exito: boolean;
  mensaje?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO DEL SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado actual del servicio de hardware
 */
export interface EstadoFierros {
  /** Si hay una impresora conectada */
  estaConectado: boolean;
  /** Si está en proceso de conexión */
  estaConectando: boolean;
  /** Si está escaneando dispositivos */
  estaEscaneando: boolean;
  /** Impresora actualmente conectada */
  dispositivoActivo: DispositivoFierro | null;
  /** Báscula actualmente conectada */
  basculaActiva: DispositivoFierro | null;
  /** Último error ocurrido */
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPCIONES Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Opciones para operaciones de impresión
 */
export interface OpcionesImpresion {
  /** Rol que solicita la impresión */
  rol: 'cocina' | 'caja' | 'mesero' | 'admin';
  /** Nombre del negocio para el ticket */
  nombreNegocio?: string;
}

/**
 * Configuración del ticket
 */
export interface ConfiguracionTicket {
  nombreNegocio: string;
  encabezado?: string;
  mensajeFinal?: string;
  logoBase64?: string;
  telefono?: string;
  redesSociales?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

/**
 * Opciones para lectura de peso
 */
export interface OpcionesLecturaPeso {
  /** Timeout en ms (default: 5000) */
  timeout?: number;
  /** Si debe esperar estabilización */
  esperarEstable?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATOS DE IMPRESIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Item de una comanda para cocina
 */
export interface ItemComanda {
  nombre: string;
  cantidad: number;
  variantes?: string;
  notas?: string;
}

/**
 * Datos para imprimir comanda de cocina
 */
export interface DatosComanda {
  mesaId: string;
  tipo: 'local' | 'llevar' | 'delivery';
  items: ItemComanda[];
  timestamp: number;
  numeroOrden?: string;
}

/**
 * Item de un pedido para cuenta
 */
export interface ItemCuenta {
  nombre: string;
  cantidad: number;
  precio: number;
  variantes?: string;
}

/**
 * Datos para imprimir cuenta
 */
export interface DatosCuenta {
  mesaId: string;
  tipo: 'local' | 'llevar' | 'delivery';
  items: ItemCuenta[];
  totales: {
    subtotal: number;
    total: number;
    descuento?: number;
    propina?: number;
  };
  timestamp: number;
}

/**
 * Item de venta (con peso opcional)
 */
export interface ItemVenta {
  nombre: string;
  cantidad: number;
  precio: number;
  unidad: 'kg' | 'pza' | 'lt';
  subtotal: number;
}

/**
 * Datos para imprimir ticket de venta
 */
export interface DatosVenta {
  items: ItemVenta[];
  total: number;
  timestamp: number;
  folio?: string;
}

/**
 * Item pesado en báscula
 */
export interface ItemPesado {
  nombre: string;
  peso: number;
  precioKg: number;
  subtotal: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLA DE IMPRESIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Propósito de un trabajo de impresión
 */
export type PropositoTrabajo = 'comanda' | 'cuenta' | 'venta_crudo' | 'etiqueta';

/**
 * Estado de un trabajo en la cola
 */
export type EstadoTrabajo = 'pendiente_impresion' | 'impresion_enviada' | 'exito' | 'fallo';

/**
 * Canal de impresión (restaurante standard o venta crudo)
 */
export type CanalImpresion = 'standard' | 'venta_crudo';

/**
 * Trabajo en la cola de impresión
 */
export interface TrabajoImpresion {
  /** ID único del trabajo */
  idTrabajo: string;
  /** Propósito del trabajo */
  proposito: PropositoTrabajo;
  /** Estado actual */
  estado: EstadoTrabajo;
  /** Datos a imprimir */
  payload: Record<string, unknown>;
  /** ID del pedido relacionado (opcional) */
  idPedido?: string;
  /** ID del dispositivo destino (opcional, si es directo) */
  idDispositivo?: string;
  /** Canal de impresión */
  canal: CanalImpresion;
  /** Número de intentos realizados */
  intentos: number;
  /** Último error */
  ultimoError?: string;
  /** Timestamp de creación */
  creadoEn: number;
  /** Timestamp de última actualización */
  actualizadoEn: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HUB
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Destino del Hub Central
 */
export type DestinoHub = 'restaurante' | 'venta_crudo';

/**
 * Configuración del Hub guardada
 */
export interface ConfiguracionHub {
  habilitado: boolean;
  destino: DestinoHub | null;
  idDispositivo: string;
  ultimaActualizacion: number;
}
