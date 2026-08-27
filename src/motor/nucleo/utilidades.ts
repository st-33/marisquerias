import type { IdentidadTenant, Referencia, TipoReferencia } from './contratos';

export function identidadTenantDesdePath(tenantPath: string): IdentidadTenant {
  const partes = tenantPath.split('/').filter(Boolean);
  return {
    tenantPath,
    tenantId: partes[partes.length - 1] || '',
    categoriaId: partes[partes.length - 2] || '',
  };
}

export function crearReferencia(tipo: TipoReferencia, id: string, tenantPath?: string): Referencia {
  return tenantPath ? { tipo, id, tenantPath } : { tipo, id };
}

export function crearIdDeterminista(prefijo: string, ...partes: string[]): string {
  return [prefijo, ...partes]
    .map((parte) => parte.trim().replace(/[^a-zA-Z0-9_-]+/g, '_'))
    .join(':');
}

export function crearHuellaSenal(senal: {
  id: string;
  operationId: string;
  tenantPath: string;
  idempotencyKey: string;
  tipo: string;
  pedidoId: string;
}): string {
  return [
    senal.tenantPath,
    senal.id,
    senal.operationId,
    senal.idempotencyKey,
    senal.tipo,
    senal.pedidoId,
  ].join('|');
}

export function mismoResultado(
  resultado: { tenantPath: string; eventId: string },
  tenantPath: string,
  eventId: string
): boolean {
  return resultado.tenantPath === tenantPath && resultado.eventId === eventId;
}
