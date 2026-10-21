/**
 * 🧹 DEPURADOR DE REGISTROS
 *
 * Reduce logs excesivos en producción manteniendo solo los críticos.
 * Claves de módulo en español, conforme al protocolo de nomenclatura del Ecosistema.
 */

export enum NivelLog {
  NINGUNO = 0,
  ERROR = 1,
  AVISO = 2,
  INFO = 3,
  DEPURACION = 4,
}

const CONFIGURACION_LOG: Record<string, NivelLog> = {
  // Críticos: siempre mostrar
  ServicioSincronizacion: NivelLog.INFO,
  useArregloSincronizado: NivelLog.INFO,
  useLogicaMesero: NivelLog.INFO,
  useSelectorProducto: NivelLog.INFO,

  // Moderados: solo avisos y errores
  TABLERO: NivelLog.AVISO,
  EmpaquetadorRol: NivelLog.AVISO,
  EscuchaNotificacionImpresion: NivelLog.AVISO,
  EscuchaEstadoPartida: NivelLog.AVISO,

  // Verbosos: solo errores
  useConexionImpresora: NivelLog.ERROR,
  ModalImpresoraBluetooth: NivelLog.ERROR,

  // Por defecto
  defecto: NivelLog.INFO,
};

function obtenerNivelLog(modulo: string): NivelLog {
  return CONFIGURACION_LOG[modulo] || CONFIGURACION_LOG['defecto'];
}

export function debeRegistrar(
  modulo: string,
  nivel: 'error' | 'aviso' | 'info' | 'depuracion'
): boolean {
  const nivelConfig = obtenerNivelLog(modulo);
  const nivelMensaje =
    nivel === 'error'
      ? NivelLog.ERROR
      : nivel === 'aviso'
        ? NivelLog.AVISO
        : nivel === 'info'
          ? NivelLog.INFO
          : NivelLog.DEPURACION;
  return nivelMensaje <= nivelConfig;
}

export function registrarCondicional(
  modulo: string,
  nivel: 'error' | 'aviso' | 'info' | 'depuracion',
  mensaje: string,
  ...args: any[]
): void {
  if (!debeRegistrar(modulo, nivel)) return;

  const prefijo = `[${modulo}]`;
  switch (nivel) {
    case 'error':
      console.error(prefijo, mensaje, ...args);
      break;
    case 'aviso':
      console.warn(prefijo, mensaje, ...args);
      break;
    case 'info':
    case 'depuracion':
      console.log(prefijo, mensaje, ...args);
      break;
  }
}

// Alias retrocompatible para módulos que usen la API anterior
/** @deprecated Usar debeRegistrar() */
export const shouldLog = (modulo: string, nivel: 'error' | 'warn' | 'info' | 'debug') =>
  debeRegistrar(
    modulo,
    nivel === 'warn' ? 'aviso' : nivel === 'debug' ? 'depuracion' : nivel as any
  );

/** @deprecated Usar registrarCondicional() */
export const conditionalLog = (
  modulo: string,
  nivel: 'error' | 'warn' | 'info' | 'debug',
  mensaje: string,
  ...args: any[]
) =>
  registrarCondicional(
    modulo,
    nivel === 'warn' ? 'aviso' : nivel === 'debug' ? 'depuracion' : nivel as any,
    mensaje,
    ...args
  );
