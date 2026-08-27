import { descomponerRutaTenant, validarRutaTenant } from '../../sistema/rtdb/rutas/RutaTenant';
import { ErrorMotor } from './errores';
import type {
  ContextoOperativo,
  IdentidadTenant,
  Referencia,
  SenalEntrada,
  UbicacionOperativa,
} from './contratos';

function texto(valor: unknown, nombre: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErrorMotor('SENAL_INVALIDA', `${nombre} es obligatorio`);
  }
  return valor.trim();
}

function fechaISO(valor: unknown): string {
  const fecha = texto(valor, 'occurredAt');
  if (Number.isNaN(Date.parse(fecha))) {
    throw new ErrorMotor('SENAL_INVALIDA', 'occurredAt debe ser una fecha ISO válida', {
      occurredAt: fecha,
    });
  }
  return fecha;
}

function validarUbicacion(ubicacion: UbicacionOperativa, nombre: string) {
  if (!ubicacion || typeof ubicacion !== 'object') {
    throw new ErrorMotor('SENAL_INVALIDA', `${nombre} es obligatoria`);
  }

  if (!ubicacion.direccion && !ubicacion.referencia && !ubicacion.coordenadas) {
    throw new ErrorMotor(
      'SENAL_INVALIDA',
      `${nombre} debe tener dirección, referencia o coordenadas`
    );
  }

  if (ubicacion.coordenadas) {
    const { lat, lng } = ubicacion.coordenadas;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new ErrorMotor('SENAL_INVALIDA', `${nombre}.coordenadas no son válidas`);
    }
  }
}

function validarReferencia(referencia: Referencia) {
  texto(referencia?.id, 'referencias[].id');
  texto(referencia?.tipo, 'referencias[].tipo');
  if (referencia.tenantPath !== undefined && !validarRutaTenant(referencia.tenantPath)) {
    throw new ErrorMotor(
      'REFERENCIA_INCONSISTENTE',
      'La referencia contiene un tenantPath inválido',
      {
        referencia,
      }
    );
  }
}

export function normalizarSenalEntrada(senal: SenalEntrada): SenalEntrada {
  if (!senal || typeof senal !== 'object') {
    throw new ErrorMotor('SENAL_INVALIDA', 'La señal debe ser un objeto');
  }

  const tenantPath = texto(senal.tenant?.tenantPath, 'tenant.tenantPath');
  const tenant = descomponerRutaTenant(tenantPath);
  if (!tenant) {
    throw new ErrorMotor('TENANT_INCORRECTO', `tenantPath inválido: ${tenantPath}`);
  }
  validarIdentidadTenant({
    tenantPath,
    tenantId: texto(senal.tenant?.tenantId, 'tenant.tenantId'),
    categoriaId: texto(senal.tenant?.categoriaId, 'tenant.categoriaId'),
  });

  if (!senal.payload || typeof senal.payload !== 'object') {
    throw new ErrorMotor('SENAL_INVALIDA', 'payload es obligatorio');
  }

  const referencias = Array.isArray(senal.referencias) ? senal.referencias : [];
  referencias.forEach(validarReferencia);
  referencias.forEach((referencia) => {
    if (referencia.tenantPath && referencia.tenantPath !== tenant.tenantPath) {
      throw new ErrorMotor('REFERENCIA_INCONSISTENTE', 'Una referencia pertenece a otro tenant', {
        signalTenantPath: tenant.tenantPath,
        referenceTenantPath: referencia.tenantPath,
        referencia,
      });
    }
  });

  const pedidoId = texto(senal.payload.pedidoId, 'payload.pedidoId');
  const referenciaPedido = referencias.find(
    (referencia) => referencia.tipo === 'pedido' && referencia.id === pedidoId
  );
  if (!referenciaPedido) {
    throw new ErrorMotor(
      'REFERENCIA_INCONSISTENTE',
      'La señal debe incluir una referencia al mismo pedido',
      {
        pedidoId,
      }
    );
  }

  if (referenciaPedido.tenantPath && referenciaPedido.tenantPath !== tenant.tenantPath) {
    throw new ErrorMotor(
      'REFERENCIA_INCONSISTENTE',
      'La referencia del pedido pertenece a otro tenant',
      {
        signalTenantPath: tenant.tenantPath,
        referenceTenantPath: referenciaPedido.tenantPath,
      }
    );
  }

  if (senal.tipo === 'pedido.requiere_entrega') {
    validarUbicacion(senal.payload.puntoRecoleccion, 'payload.puntoRecoleccion');
    validarUbicacion(senal.payload.puntoEntrega, 'payload.puntoEntrega');
  }

  if (senal.schemaVersion !== 1) {
    throw new ErrorMotor(
      'SENAL_INVALIDA',
      `schemaVersion no soportada: ${String(senal.schemaVersion)}`
    );
  }

  return {
    ...senal,
    id: texto(senal.id, 'id'),
    operationId: texto(senal.operationId, 'operationId'),
    occurredAt: fechaISO(senal.occurredAt),
    idempotencyKey: texto(senal.idempotencyKey, 'idempotencyKey'),
    tenant: {
      tenantPath: tenant.tenantPath,
      tenantId: tenant.tenantId,
      categoriaId: tenant.categoriaId,
    },
    referencias,
  } as SenalEntrada;
}

export function validarContextoParaSenal(contexto: ContextoOperativo | null, senal: SenalEntrada) {
  if (!contexto || !contexto.tenantExiste) {
    throw new ErrorMotor(
      'TENANT_NO_ENCONTRADO',
      `Tenant no encontrado: ${senal.tenant.tenantPath}`
    );
  }

  if (contexto.tenantPath !== senal.tenant.tenantPath) {
    throw new ErrorMotor(
      'TENANT_INCORRECTO',
      'El contexto resuelto no coincide con el tenant de la señal',
      {
        signalTenantPath: senal.tenant.tenantPath,
        contextTenantPath: contexto.tenantPath,
      }
    );
  }

  if (!contexto.habilitado) {
    throw new ErrorMotor('TENANT_DESHABILITADO', `Tenant deshabilitado: ${contexto.tenantPath}`);
  }

  if (!contexto.capacidades.motorLogistico || !contexto.capacidades.solicitudesLogisticas) {
    throw new ErrorMotor(
      'CAPACIDAD_DESACTIVADA',
      'El motor o las solicitudes logísticas no están activas',
      {
        capacidades: contexto.capacidades,
      }
    );
  }

  if (senal.tipo === 'pedido.requiere_entrega' && !contexto.capacidades.delivery) {
    throw new ErrorMotor(
      'CAPACIDAD_DESACTIVADA',
      'La capacidad de delivery no está activa para el tenant'
    );
  }

  validarIdentidadTenant(contexto);

  if (!contexto.actoresAutorizados.includes(senal.actor.tipo)) {
    throw new ErrorMotor(
      'ACTOR_NO_AUTORIZADO',
      `El actor ${senal.actor.tipo} no está autorizado en el tenant`
    );
  }

  if (contexto.actorIdsAutorizados && !contexto.actorIdsAutorizados.includes(senal.actor.id)) {
    throw new ErrorMotor(
      'ACTOR_NO_AUTORIZADO',
      `El actor ${senal.actor.id} no está autorizado en el tenant`
    );
  }
}

export function validarIdentidadTenant(tenant: IdentidadTenant) {
  if (!tenant || !validarRutaTenant(tenant.tenantPath)) {
    throw new ErrorMotor('TENANT_INCORRECTO', 'Identidad tenant inválida');
  }
  const descompuesto = descomponerRutaTenant(tenant.tenantPath);
  if (
    !descompuesto ||
    descompuesto.tenantId !== tenant.tenantId ||
    descompuesto.categoriaId !== tenant.categoriaId
  ) {
    throw new ErrorMotor(
      'TENANT_INCORRECTO',
      'Los componentes del tenant no coinciden con su tenantPath',
      {
        tenant,
      }
    );
  }
}
