/**
 * 🏛️ CONTRATOS DEL SISTEMA ADI
 *
 * Definiciones de tipos centralizados que estructuran
 * todo el estado de la aplicación.
 *
 * ARQUITECTURA:
 * - ContratoSesion: Autenticación y contexto del usuario
 * - ContratoNegocio: Features y configuración del negocio
 *                    (extensible a cualquier vertical)
 * - ContratoUI: Estado de interfaz y componentes visuales
 * - ContratoDataSources: URLs de múltiples instancias de RTDB
 * - ContratoHardware: Configuración y estado de dispositivos físicos
 *
 * REGLA DE ORO: Estos contratos son el "lenguaje común" entre todos los módulos.
 * Cualquier estado que necesite persistir o compartirse entre módulos DEBE estar aquí.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE SESIÓN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Información de la sesión activa del usuario.
 * Contiene el contexto de autenticación y ubicación en la jerarquía de negocios.
 */
export interface ContratoSesion {
  /** Código de acceso del usuario (puede ser PIN, password, etc.) */
  access_code: string | null;

  /** Path completo del tenant en Firebase (e.g., "marisquerias/marisqueria-puerto-libres") */
  tenantPath: string | null;

  /** ID único del tenant (e.g., "marisqueria-puerto-libres") */
  tenantId: string | null;

  /** Nicho del negocio (e.g., "2 alimentos_y_bebidas", "talleres", "barberias") */
  niche: string | null;

  /** Categoría específica del negocio dentro del nicho (e.g., "marisquerias", "taquerias", "abarrotes") */
  category: string | null;

  /** Rol activo del usuario en este tenant (e.g., "admin", "mesero", "cocina") */
  rol: string | null;

  /** Metadata adicional del usuario (nombre, email, etc.) */
  usuario?: {
    nombre?: string;
    email?: string;
    avatar?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE NEGOCIO (Features Normalizadas)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Feature normalizada con metadatos.
 * Permite representar features simples (boolean) y complejas (con configuración anidada).
 *
 * EJEMPLOS:
 * - Feature simple: { enabled: true }
 * - Feature con config: { enabled: true, config: { maxTables: 20, allowReservations: true } }
 * - Feature con sub-features: { enabled: true, features: { impresion: true, notificaciones: false } }
 */
export interface Feature {
  /** Si la feature está activa */
  enabled: boolean;

  /** Configuración específica de la feature (extensible por vertical) */
  config?: Record<string, any>;

  /** Sub-features anidadas (permite jerarquías como "inventario.alertas.bajoStock") */
  features?: Record<string, Feature>;

  /** Metadata de la feature (descripción, permisos requeridos, etc.) */
  metadata?: {
    descripcion?: string;
    permisos?: string[];
    plan?: 'basico' | 'pro' | 'enterprise';
  };
}

/**
 * Configuración completa del negocio.
 * Diseñado para ser extensible a CUALQUIER vertical (restaurantes, talleres, barberías, etc.)
 */
export interface ContratoNegocio {
  /** Features del negocio, normalizadas con estructura anidada */
  features: Record<string, Feature>;

  /** Configuración específica del vertical (2 alimentos_y_bebidas, taller, etc.) */
  configuracion?: {
    /** Nombre del negocio */
    nombre?: string;

    /** Tipo de negocio (restaurante, taller, barbería, etc.) */
    tipo?: string;

    /** Configuración de horarios */
    horario?: {
      apertura: string;
      cierre: string;
      diasActivos: number[]; // 0=Domingo, 6=Sábado
    };

    /** Configuración de moneda y formato */
    moneda?: {
      codigo: string; // "MXN", "USD", etc.
      simbolo: string; // "$", "€", etc.
      decimales: number;
    };

    /** Metadata específica del vertical (extensible) */
    [key: string]: any;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE UI (Estado Visual)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuración del FAB (Floating Action Button) radial.
 */
export interface FabConfig {
  items: FabItem[];
  initialKey: string | null;
  visibleCount?: number;
  position?: 'bottom-left' | 'bottom-right';
  enabled?: boolean;
}

export interface FabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * Representa un módulo dentro del panel de administración,
 * incluyendo su información de visualización y el componente asociado.
 */
export interface AdminModule {
  key: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>; // Componente React a renderizar
  color?: string;
}

/**
 * Estado de los componentes de UI globales (alerts, toasts, modals, etc.)
 */
export interface ContratoUI {
  /** Configuraciones del FAB radial por ruta (pathname → config) */
  fabConfigs: Record<string, FabConfig>;

  /** Alertas activas en pantalla */
  alertas: {
    id: string;
    tipo: 'success' | 'error' | 'warning' | 'info';
    mensaje: string;
    duracion?: number;
  }[];

  /** Estado de loading global */
  loading: {
    activo: boolean;
    mensaje?: string;
  };

  /** Estado de modals globales */
  modals: Record<
    string,
    {
      visible: boolean;
      data?: any;
    }
  >;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE DATA SOURCES (Multi-RTDB)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * URLs de las instancias de Firebase Realtime Database.
 *
 * ARQUITECTURA MULTI-RTDB:
 * - operacionUrl: Base de datos operacional (mesas, pedidos, cocina, inventario)
 * - repartoUrl: Base de datos de logística y delivery (ADI-REPART)
 * - perfilesUrl: Base de datos de usuarios y perfiles
 *
 * BENEFICIOS:
 * 1. Separación de concerns (operación vs. logística vs. usuarios)
 * 2. Escalabilidad (cada RTDB puede escalar independientemente)
 * 3. Costos optimizados (no mezclamos datos fríos con calientes)
 * 4. Seguridad granular (permisos diferentes por RTDB)
 */
export interface ContratoDataSources {
  /** URL de la RTDB operacional (por defecto) */
  operacionUrl: string | null;

  /** URL de la RTDB de reparto y logística */
  repartoUrl: string | null;

  /** URL de la RTDB de perfiles de usuario */
  perfilesUrl: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE HARDWARE (Abstracción de Dispositivos)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipos de dispositivos soportados.
 */
export type TipoDispositivo =
  | 'impresora-termica'
  | 'bascula'
  | 'lector-codigo-barras'
  | 'terminal-pago'
  | 'display-cliente'
  | 'camara'
  | 'sensor-temperatura';

/**
 * Protocolos de conexión soportados.
 */
export type ProtocoloConexion =
  | 'bluetooth-classic'
  | 'bluetooth-le'
  | 'wifi'
  | 'usb'
  | 'serial'
  | 'red-local';

/**
 * Estado de conexión de un dispositivo.
 */
export type EstadoDispositivo = 'desconectado' | 'conectando' | 'conectado' | 'error' | 'ocupado';

/**
 * Configuración de un dispositivo físico.
 */
export interface DispositivoConfig {
  /** ID único del dispositivo */
  id: string;

  /** Tipo de dispositivo */
  tipo: TipoDispositivo;

  /** Nombre descriptivo */
  nombre: string;

  /** Protocolo de conexión */
  protocolo: ProtocoloConexion;

  /** Dirección de conexión (MAC, IP, etc.) */
  direccion: string;

  /** Configuración específica del dispositivo */
  configuracion?: Record<string, any>;

  /** Estado actual */
  estado: EstadoDispositivo;

  /** Última conexión exitosa */
  ultimaConexion?: number; // timestamp
}

/**
 * Contrato de Hardware: Configuración y estado de dispositivos físicos.
 *
 * ARQUITECTURA DE ABSTRACCIÓN:
 * - Cada tipo de dispositivo implementa una interfaz específica
 * - El servicio HardwareService gestiona el ciclo de vida de dispositivos
 * - Los módulos de negocio (mesero, cocina, admin) usan el servicio, no los drivers directamente
 *
 * EXTENSIBILIDAD:
 * - Para soportar un nuevo dispositivo: agregar tipo + implementar driver
 * - Para soportar nuevo protocolo: agregar a ProtocoloConexion + implementar adapter
 */
export interface ContratoHardware {
  /** Dispositivos registrados en el sistema */
  dispositivos: Record<string, DispositivoConfig>;

  /** Dispositivo preferido por tipo (para quick-connect) */
  preferidos: Partial<Record<TipoDispositivo, string>>; // tipo -> id del dispositivo

  /** Estado de permisos de hardware por plataforma */
  permisos: {
    bluetooth: boolean;
    ubicacion: boolean; // Android requiere ubicación para Bluetooth
    camara: boolean;
    almacenamiento: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO GLOBAL DEL STORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado global completo de la aplicación.
 *
 * ARQUITECTURA:
 * - Separación clara entre sesión, negocio, UI, datos y hardware
 * - Cada slice tiene su propio contrato y responsabilidades
 * - Persistencia selectiva (solo lo necesario se guarda en AsyncStorage)
 */
export interface EstadoGlobal {
  sesion: ContratoSesion;
  negocio: ContratoNegocio;
  ui: ContratoUI;
  dataSources: ContratoDataSources;
  hardware: ContratoHardware;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS Y UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helper para acceder a features anidadas de forma segura.
 *
 * @example
 * const alertasEnabled = getFeature(negocio, 'inventario.alertas.bajoStock');
 * // Busca: negocio.features.inventario.features.alertas.features.bajoStock.enabled
 */
export function getFeature(negocio: ContratoNegocio, path: string): boolean {
  const parts = path.split('.');
  let current: any = negocio.features;

  for (const part of parts) {
    if (!current || typeof current !== 'object') return false;
    current = current[part];
    if (!current) return false;

    // Si es el último nivel, retornar enabled
    if (parts.indexOf(part) === parts.length - 1) {
      return current.enabled === true;
    }

    // Si no es el último nivel, bajar a features
    current = current.features;
  }

  return false;
}

/**
 * Helper para establecer una feature anidada.
 *
 * @example
 * const newNegocio = setFeature(negocio, 'inventario.alertas.bajoStock', true);
 */
export function setFeature(
  negocio: ContratoNegocio,
  path: string,
  enabled: boolean,
  config?: Record<string, any>
): ContratoNegocio {
  const parts = path.split('.');
  const newFeatures = JSON.parse(JSON.stringify(negocio.features)); // Deep clone

  let current = newFeatures;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;

    if (isLast) {
      current[part] = {
        enabled,
        ...(config && { config }),
        ...(current[part]?.features && { features: current[part].features }),
      };
    } else {
      if (!current[part]) {
        current[part] = { enabled: false, features: {} };
      }
      if (!current[part].features) {
        current[part].features = {};
      }
      current = current[part].features!;
    }
  }

  return { ...negocio, features: newFeatures };
}

/**
 * Estado inicial vacío (para testing o reset)
 */
export const ESTADO_INICIAL: EstadoGlobal = {
  sesion: {
    access_code: null,
    tenantPath: null,
    tenantId: null,
    niche: null,
    category: null,
    rol: null,
  },
  negocio: {
    features: {},
  },
  ui: {
    fabConfigs: {},
    alertas: [],
    loading: { activo: false },
    modals: {},
  },
  dataSources: {
    operacionUrl: null,
    repartoUrl: null,
    perfilesUrl: null,
  },
  hardware: {
    dispositivos: {},
    preferidos: {},
    permisos: {
      bluetooth: false,
      ubicacion: false,
      camara: false,
      almacenamiento: false,
    },
  },
};
