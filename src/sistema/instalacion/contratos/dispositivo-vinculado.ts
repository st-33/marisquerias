/**
 * 🔒 CONTRATO DE DISPOSITIVO VINCULADO (HARDENED)
 * Representa la identidad operativa y el estado del hardware registrado y autorizado.
 */
export interface DispositivoVinculado {
  /** Identificador único persistente local generado para ADI en este dispositivo */
  deviceIdADI: string;

  /** Path de la RTDB del negocio (ej: "marisquerias/el-arrecife") */
  rutaNegocio: string;

  /** Identificador corto del negocio (ej: "puerto-libres") */
  negocioId: string;

  /** Identidad canónica universal (ej: "puerto_libres") */
  negocio_id?: string;

  /** Ruta física en RTDB (ej: "marisquerias/marisqueria-puerto-libres") */
  ruta_negocio?: string;

  /** Categoría canónica (ej: "marisquerias") */
  categoria_id?: string;

  /** Nicho operacional (ej: "2 alimentos_y_bebidas", "comercio_minorista") */
  niche: string;

  /** Categoría específica del nicho (ej: "marisquerias", "panaderias") */
  category?: string;

  /** Alias amigable asignado al dispositivo */
  aliasDispositivo?: string;

  /** Rol específico asignado o activo en este hardware. Si es null, requiere selector */
  rolActivo: string | null;

  /** Lista de roles que este dispositivo tiene autorización para ejecutar */
  rolesPermitidos: string[];

  /** Mapa de módulos del sistema permitidos para este dispositivo */
  modulosPermitidos: Record<string, boolean>;

  /** Estado actual determinado centralizadamente por la autoridad RTDB */
  estado: 'activo' | 'bloqueado' | 'mantenimiento' | 'reemplazado';

  /** Nivel operativo del dispositivo (semana de roles, privilegios de supervisor) */
  nivelOperativo?: 'admin' | 'segundo_al_mando' | 'operador' | 'consulta';

  /** Si el dispositivo puede o no alternar entre sus roles permitidos */
  puedeCambiarRol: boolean;

  /** Timestamp en milisegundos del último pulso de vida enviado a la RTDB */
  ultimoHeartbeat?: number;

  /** Timestamp de la vinculación inicial */
  vinculadoEn: number;

  /** Timestamp de la última actualización de config/estado */
  actualizadoEn: number;

  /** Si este dispositivo reemplaza a un hardware previo, su ID */
  reemplazaADeviceId?: string;

  /** Si este dispositivo fue reemplazado por otro hardware posterior, el ID del sucesor */
  reemplazadoPorDeviceId?: string;
}
