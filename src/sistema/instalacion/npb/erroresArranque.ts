/**
 * 🚨 CLASIFICADOR Y DEFINICIÓN DE ERRORES DE ARRANQUE O(1)
 *
 * Clasifica y mapea las variantes de error canónicas sin exponer
 * datos sensibles (tokens ni URLs operativas).
 */

import { logger } from '../../monitoreo';

export type TipoErrorArranque =
  | 'codigo_invalido'
  | 'codigo_revocado'
  | 'codigo_expirado'
  | 'sin_conexion'
  | 'npb_incompatible'
  | 'desconocido';

export interface InfoErrorArranque {
  tipo: TipoErrorArranque;
  mensaje: string;
  permiteReintentar: boolean;
  accionTexto: 'Reintentar' | 'Salir';
  faltantes?: string[];
  detalleTecnico?: string;
}

/**
 * Sanitiza el código de acceso para no exponer formatos extraños o largos en logs
 */
export function sanitizarCodigo(codigo?: string): string {
  if (!codigo) return '';
  return codigo
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 16);
}

/**
 * Analiza un error arrojado durante la vinculación/arranque y lo clasifica
 * en una de las variantes canónicas estipuladas.
 */
export function clasificarErrorArranque(error: unknown, codigoAcceso?: string): InfoErrorArranque {
  const rawMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const msgLower = rawMsg.toLowerCase();
  const detalleTecnico = error instanceof Error && error.stack ? error.stack : rawMsg;

  let info: InfoErrorArranque;

  // 1. Código revocado o negocio suspendido
  if (msgLower.includes('revocado') || msgLower.includes('suspendido')) {
    info = {
      tipo: 'codigo_revocado',
      mensaje: 'Este código fue revocado. Contacta a tu especialista para uno nuevo.',
      permiteReintentar: false,
      accionTexto: 'Salir',
      detalleTecnico,
    };
  }
  // 2. Código expirado
  else if (
    msgLower.includes('expirad') ||
    msgLower.includes('expiró') ||
    msgLower.includes('agotado') ||
    msgLower.includes('vencido') ||
    msgLower.includes('temporalmente')
  ) {
    info = {
      tipo: 'codigo_expirado',
      mensaje: 'El código expiró. Solicita uno nuevo.',
      permiteReintentar: false,
      accionTexto: 'Salir',
      detalleTecnico,
    };
  }
  // 3. Sin conexión / Red caída
  else if (
    msgLower.includes('network') ||
    msgLower.includes('sin conexión') ||
    msgLower.includes('conexión') ||
    msgLower.includes('offline') ||
    msgLower.includes('timeout') ||
    msgLower.includes('econnrefused') ||
    msgLower.includes('failed to fetch')
  ) {
    info = {
      tipo: 'sin_conexion',
      mensaje: 'Sin conexión. Revisa tu red y reintenta.',
      permiteReintentar: true,
      accionTexto: 'Reintentar',
      detalleTecnico,
    };
  }
  // 4. Incompatibilidad de capacidades
  else if (msgLower.includes('incompatible') || msgLower.includes('faltantes')) {
    let faltantes: string[] = [];
    const match = rawMsg.match(/faltantes:\s*(.+)$/i);
    if (match && match[1]) {
      faltantes = match[1].split(',').map((s) => s.trim());
    }
    const listaFaltantes =
      faltantes.length > 0 ? faltantes.join(', ') : 'capacidades no soportadas';
    info = {
      tipo: 'npb_incompatible',
      mensaje: `Este negocio requiere capacidades que esta versión del APK no tiene: ${listaFaltantes}. Actualiza la app o contacta soporte.`,
      permiteReintentar: false,
      accionTexto: 'Salir',
      faltantes,
      detalleTecnico,
    };
  }
  // 5. Código inválido o inexistente
  else if (
    msgLower.includes('no existe') ||
    msgLower.includes('inexistente') ||
    msgLower.includes('no encontrado') ||
    msgLower.includes('inválido') ||
    msgLower.includes('invalido') ||
    msgLower.includes('código de acceso no es válido') ||
    msgLower.includes('código de acceso')
  ) {
    info = {
      tipo: 'codigo_invalido',
      mensaje: 'El código no existe o expiró. Verifica con tu especialista.',
      permiteReintentar: true,
      accionTexto: 'Reintentar',
      detalleTecnico,
    };
  }
  // 6. Error desconocido
  else {
    info = {
      tipo: 'desconocido',
      mensaje: 'Ocurrió un error. Intenta de nuevo o contacta soporte.',
      permiteReintentar: true,
      accionTexto: 'Reintentar',
      detalleTecnico,
    };
  }

  logger.error(
    'ARRANQUE_O1',
    `Fallo clasificado: ${info.tipo}`,
    error instanceof Error ? error : new Error(info.mensaje),
    {
      tipo_error: info.tipo,
      codigo_acceso: sanitizarCodigo(codigoAcceso),
      timestamp: Date.now(),
    }
  );

  return info;
}
