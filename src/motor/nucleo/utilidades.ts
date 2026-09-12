import type { IdentidadNegocio, Referencia, TipoReferencia } from './contratos';

export function identidadNegocioDesdeRuta(rutaNegocio: string): IdentidadNegocio {
  const partes = rutaNegocio.split('/').filter(Boolean);
  return {
    rutaNegocio,
    negocioId: partes[partes.length - 1] || '',
    categoriaId: partes[partes.length - 2] || '',
  };
}

export function crearReferencia(
  tipo: TipoReferencia,
  id: string,
  rutaNegocio?: string
): Referencia {
  return rutaNegocio ? { tipo, id, rutaNegocio } : { tipo, id };
}

export function crearIdDeterminista(prefijo: string, ...partes: string[]): string {
  return [prefijo, ...partes]
    .map((parte) => parte.trim().replace(/[^a-zA-Z0-9_-]+/g, '_'))
    .join(':');
}

export function crearHuellaSenal(senal: {
  id: string;
  operationId: string;
  rutaNegocio: string;
  idempotencyKey: string;
  tipo: string;
  pedidoId: string;
}): string {
  return [
    senal.rutaNegocio,
    senal.id,
    senal.operationId,
    senal.idempotencyKey,
    senal.tipo,
    senal.pedidoId,
  ].join('|');
}

export function mismoResultado(
  resultado: { rutaNegocio: string; eventId: string },
  rutaNegocio: string,
  eventId: string
): boolean {
  return resultado.rutaNegocio === rutaNegocio && resultado.eventId === eventId;
}
