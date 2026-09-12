import {
  descomponer_ruta_negocio,
  validar_ruta_negocio,
} from '../../sistema/rtdb/rutas/ruta_negocio';
import { ErrorMotor } from './errores';
import type {
  ContextoOperativo,
  IdentidadNegocio,
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
  if (referencia.rutaNegocio !== undefined && !validar_ruta_negocio(referencia.rutaNegocio)) {
    throw new ErrorMotor(
      'REFERENCIA_INCONSISTENTE',
      'La referencia contiene una rutaNegocio inválida',
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

  const rutaNegocio = texto(senal.negocio?.rutaNegocio, 'negocio.rutaNegocio');
  const negocio = descomponer_ruta_negocio(rutaNegocio);
  if (!negocio) {
    throw new ErrorMotor('NEGOCIO_INCORRECTO', `rutaNegocio inválida: ${rutaNegocio}`);
  }
  validarIdentidadNegocio({
    rutaNegocio,
    negocioId: texto(senal.negocio?.negocioId, 'negocio.negocioId'),
    categoriaId: texto(senal.negocio?.categoriaId, 'negocio.categoriaId'),
  });

  if (!senal.payload || typeof senal.payload !== 'object') {
    throw new ErrorMotor('SENAL_INVALIDA', 'payload es obligatorio');
  }

  const referencias = Array.isArray(senal.referencias) ? senal.referencias : [];
  referencias.forEach(validarReferencia);
  referencias.forEach((referencia) => {
    if (referencia.rutaNegocio && referencia.rutaNegocio !== negocio.rutaNegocio) {
      throw new ErrorMotor('REFERENCIA_INCONSISTENTE', 'Una referencia pertenece a otro negocio', {
        signalRutaNegocio: negocio.rutaNegocio,
        referenceRutaNegocio: referencia.rutaNegocio,
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

  if (referenciaPedido.rutaNegocio && referenciaPedido.rutaNegocio !== negocio.rutaNegocio) {
    throw new ErrorMotor(
      'REFERENCIA_INCONSISTENTE',
      'La referencia del pedido pertenece a otro negocio',
      {
        signalRutaNegocio: negocio.rutaNegocio,
        referenceRutaNegocio: referenciaPedido.rutaNegocio,
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
    negocio: {
      rutaNegocio: negocio.rutaNegocio,
      negocioId: negocio.negocioId,
      categoriaId: negocio.categoriaId,
    },
    referencias,
  } as SenalEntrada;
}

export function validarContextoParaSenal(contexto: ContextoOperativo | null, senal: SenalEntrada) {
  if (!contexto || !contexto.negocioExiste) {
    throw new ErrorMotor(
      'NEGOCIO_NO_ENCONTRADO',
      `Negocio no encontrado: ${senal.negocio.rutaNegocio}`
    );
  }

  if (contexto.rutaNegocio !== senal.negocio.rutaNegocio) {
    throw new ErrorMotor(
      'NEGOCIO_INCORRECTO',
      'El contexto resuelto no coincide con el negocio de la señal',
      {
        signalRutaNegocio: senal.negocio.rutaNegocio,
        contextRutaNegocio: contexto.rutaNegocio,
      }
    );
  }

  if (!contexto.habilitado) {
    throw new ErrorMotor('NEGOCIO_DESHABILITADO', `Negocio deshabilitado: ${contexto.rutaNegocio}`);
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
      'La capacidad de delivery no está activa para el negocio'
    );
  }

  validarIdentidadNegocio(contexto);

  if (!contexto.actoresAutorizados.includes(senal.actor.tipo)) {
    throw new ErrorMotor(
      'ACTOR_NO_AUTORIZADO',
      `El actor ${senal.actor.tipo} no está autorizado en el negocio`
    );
  }

  if (contexto.actorIdsAutorizados && !contexto.actorIdsAutorizados.includes(senal.actor.id)) {
    throw new ErrorMotor(
      'ACTOR_NO_AUTORIZADO',
      `El actor ${senal.actor.id} no está autorizado en el negocio`
    );
  }
}

export function validarIdentidadNegocio(negocio: IdentidadNegocio) {
  if (!negocio || !validar_ruta_negocio(negocio.rutaNegocio)) {
    throw new ErrorMotor('NEGOCIO_INCORRECTO', 'Identidad negocio inválida');
  }
  const descompuesto = descomponer_ruta_negocio(negocio.rutaNegocio);
  if (
    !descompuesto ||
    descompuesto.negocioId !== negocio.negocioId ||
    descompuesto.categoriaId !== negocio.categoriaId
  ) {
    throw new ErrorMotor(
      'NEGOCIO_INCORRECTO',
      'Los componentes del negocio no coinciden con su rutaNegocio',
      {
        negocio,
      }
    );
  }
}
