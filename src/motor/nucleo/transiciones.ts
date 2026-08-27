import { ErrorMotor } from './errores';
import type { Actor, EstadoMisionLogistica, EstadoPedido, TipoActor } from './contratos';

export type AccionPedido =
  | 'pedido.datos_actualizados'
  | 'pedido.confirmado'
  | 'pedido.requiere_entrega'
  | 'pedido.cancelado';

export type AccionMision =
  | 'mision.propuesta'
  | 'mision.asignada'
  | 'mision.aceptada'
  | 'repartidor.llego_recoleccion'
  | 'repartidor.inicio_ruta'
  | 'repartidor.entregada'
  | 'incidencia.reportada'
  | 'mision.cancelada';

interface ReglaTransicion<E, A extends TipoActor> {
  desde: E;
  accion: string;
  actores: readonly A[];
  hacia: E;
}

const REGLAS_PEDIDO: readonly ReglaTransicion<EstadoPedido, TipoActor>[] = [
  {
    desde: 'provisional',
    accion: 'pedido.datos_actualizados',
    actores: ['sistema', 'automatizacion', 'negocio'],
    hacia: 'corroboracion',
  },
  {
    desde: 'corroboracion',
    accion: 'pedido.confirmado',
    actores: ['sistema', 'automatizacion', 'negocio'],
    hacia: 'confirmado',
  },
  {
    desde: 'confirmado',
    accion: 'pedido.requiere_entrega',
    actores: ['sistema', 'automatizacion', 'negocio'],
    hacia: 'en_proceso',
  },
  {
    desde: 'provisional',
    accion: 'pedido.cancelado',
    actores: ['sistema', 'automatizacion', 'negocio', 'central'],
    hacia: 'cancelado',
  },
  {
    desde: 'corroboracion',
    accion: 'pedido.cancelado',
    actores: ['sistema', 'automatizacion', 'negocio', 'central'],
    hacia: 'cancelado',
  },
  {
    desde: 'confirmado',
    accion: 'pedido.cancelado',
    actores: ['sistema', 'automatizacion', 'negocio', 'central'],
    hacia: 'cancelado',
  },
  {
    desde: 'en_proceso',
    accion: 'pedido.cancelado',
    actores: ['sistema', 'automatizacion', 'negocio', 'central'],
    hacia: 'cancelado',
  },
];

const REGLAS_MISION: readonly ReglaTransicion<EstadoMisionLogistica, TipoActor>[] = [
  {
    desde: 'solicitada',
    accion: 'mision.propuesta',
    actores: ['sistema', 'automatizacion'],
    hacia: 'propuesta',
  },
  {
    desde: 'propuesta',
    accion: 'mision.asignada',
    actores: ['central', 'sistema', 'automatizacion'],
    hacia: 'asignada',
  },
  {
    desde: 'asignada',
    accion: 'mision.aceptada',
    actores: ['repartidor', 'sistema'],
    hacia: 'aceptada',
  },
  {
    desde: 'aceptada',
    accion: 'repartidor.llego_recoleccion',
    actores: ['repartidor', 'sistema'],
    hacia: 'recoleccion',
  },
  {
    desde: 'recoleccion',
    accion: 'repartidor.inicio_ruta',
    actores: ['repartidor', 'sistema'],
    hacia: 'en_camino',
  },
  {
    desde: 'en_camino',
    accion: 'repartidor.entregada',
    actores: ['repartidor', 'sistema'],
    hacia: 'entregada',
  },
  {
    desde: 'propuesta',
    accion: 'incidencia.reportada',
    actores: ['central', 'repartidor', 'sistema', 'automatizacion'],
    hacia: 'incidencia',
  },
  {
    desde: 'asignada',
    accion: 'incidencia.reportada',
    actores: ['central', 'repartidor', 'sistema', 'automatizacion'],
    hacia: 'incidencia',
  },
  {
    desde: 'aceptada',
    accion: 'incidencia.reportada',
    actores: ['central', 'repartidor', 'sistema', 'automatizacion'],
    hacia: 'incidencia',
  },
  {
    desde: 'recoleccion',
    accion: 'incidencia.reportada',
    actores: ['central', 'repartidor', 'sistema', 'automatizacion'],
    hacia: 'incidencia',
  },
  {
    desde: 'en_camino',
    accion: 'incidencia.reportada',
    actores: ['central', 'repartidor', 'sistema', 'automatizacion'],
    hacia: 'incidencia',
  },
];

const ACTORES_CANCELACION_MISION: readonly TipoActor[] = [
  'negocio',
  'central',
  'repartidor',
  'sistema',
  'automatizacion',
];

function resolverTransicion<E>(
  reglas: readonly ReglaTransicion<E, TipoActor>[],
  estado: E,
  accion: string,
  actor: Actor
): E {
  const regla = reglas.find(
    (candidata) => candidata.desde === estado && candidata.accion === accion
  );
  if (!regla) {
    throw new ErrorMotor(
      'TRANSICION_INVALIDA',
      `No existe transición ${String(estado)} → ${accion}`,
      {
        estado,
        accion,
        actor: actor.tipo,
      }
    );
  }

  if (!regla.actores.includes(actor.tipo)) {
    throw new ErrorMotor(
      'ACTOR_NO_AUTORIZADO',
      `El actor ${actor.tipo} no puede ejecutar ${accion}`,
      {
        estado,
        accion,
        actor: actor.tipo,
      }
    );
  }

  return regla.hacia;
}

export function transicionarPedido(
  estado: EstadoPedido,
  accion: AccionPedido,
  actor: Actor
): EstadoPedido {
  return resolverTransicion(REGLAS_PEDIDO, estado, accion, actor);
}

export function transicionarMision(
  estado: EstadoMisionLogistica,
  accion: AccionMision,
  actor: Actor
): EstadoMisionLogistica {
  if (accion === 'mision.cancelada') {
    if (estado === 'entregada' || estado === 'cancelada') {
      throw new ErrorMotor('TRANSICION_INVALIDA', `No se puede cancelar una misión en ${estado}`, {
        estado,
        accion,
      });
    }
    if (!ACTORES_CANCELACION_MISION.includes(actor.tipo)) {
      throw new ErrorMotor(
        'ACTOR_NO_AUTORIZADO',
        `El actor ${actor.tipo} no puede cancelar la misión`,
        {
          estado,
          accion,
        }
      );
    }
    return 'cancelada';
  }

  if (estado === 'entregada' || estado === 'cancelada') {
    throw new ErrorMotor(
      'TRANSICION_INVALIDA',
      `La misión terminal ${estado} no admite ${accion}`,
      {
        estado,
        accion,
      }
    );
  }

  return resolverTransicion(REGLAS_MISION, estado, accion, actor);
}

export function reglasDePedido(): readonly ReglaTransicion<EstadoPedido, TipoActor>[] {
  return REGLAS_PEDIDO;
}

export function reglasDeMision(): readonly ReglaTransicion<EstadoMisionLogistica, TipoActor>[] {
  return REGLAS_MISION;
}
