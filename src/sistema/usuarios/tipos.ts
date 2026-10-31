/**
 * 👤 TIPOS DEL MÓDULO DE USUARIOS Y SESIÓN OPERATIVA
 * Contrato canónico compartido entre Ecosistema y Negocios Derivados.
 */

export type SexoUsuario = 'H' | 'M';

export interface PerfilLaboral {
  cargo: string;
  sueldo?: number;
  horario_entrada?: string;
  horario_salida?: string;
}

export interface UsuarioNegocio {
  id: string; // Consecutivo de 2 dígitos: "01", "02", "03", etc.
  nombre: string; // Nombre completo (ej: "Ana Isabel López")
  clave: string; // Clave nominal (primer nombre o segundo si hay colisión)
  edad: number; // Entero de 2 dígitos (14 a 99)
  sexo: SexoUsuario; // 'H' | 'M'
  perfil: PerfilLaboral;
  creado_en?: number;
  actualizado_en?: number;
}

export interface ClaveNominalResultado {
  clave: string;
  tieneConflicto: boolean;
  primerNombreCandidato: string;
  segundoNombreCandidato: string | null;
  error?: string;
}

export interface SlotMonitoreoDispositivo {
  estado: 'activo' | 'inactivo';
  dispositivo_id?: string;
  rol?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  ultima_actividad?: number;
}

export interface SesionOperativaLocal {
  dispositivo_id: string;
  instalacion_id: string;
  instalacionId?: string;
  slot_id?: string; // "01", "02", etc.
  usuario_id?: string;
  usuario_nombre?: string;
  usuario_clave?: string;
  cargo?: string;
  plataforma: 'web' | 'native';
  fecha_inicio: number;
  ultima_actividad: number;
}

export interface RegistroAuditoriaOperador {
  id: string;
  dispositivo_id: string;
  slot_id?: string;
  usuario_id_anterior?: string;
  usuario_nombre_anterior?: string;
  usuario_id_nuevo: string;
  usuario_nombre_nuevo: string;
  cargo_nuevo: string;
  timestamp: number;
  motivo?: string;
}

export interface EstadoAdmisionSesion {
  admitido: boolean;
  esWeb: boolean;
  slotId?: string;
  error?: string;
}
