import type {
  ContextoOperativo,
  EventoDominio,
  MisionLogistica,
  ResultadoProcesamiento,
  SenalEntrada,
  SenalSalida,
  SolicitudLogistica,
  TipoActor,
} from './nucleo/contratos';
import { ErrorMotor } from './nucleo/errores';
import { transicionarMision, transicionarPedido } from './nucleo/transiciones';
import { normalizarSenalEntrada, validarContextoParaSenal } from './nucleo/validaciones';
import {
  crearHuellaSenal,
  crearIdDeterminista,
  crearReferencia,
  identidadTenantDesdePath,
} from './nucleo/utilidades';
import type {
  PuertoContextoOperativo,
  PuertoEntradaMotor,
  PuertoPersistenciaMotor,
  PuertoSalidasMotor,
} from './puertos';

export interface DependenciasMotorLogistico {
  contexto: PuertoContextoOperativo;
  persistencia: PuertoPersistenciaMotor;
  salidas?: PuertoSalidasMotor;
  ahora?: () => Date;
}

const ACTOR_MOTOR: { tipo: TipoActor; id: string } = {
  tipo: 'sistema',
  id: 'motor-logistico',
};

export class MotorLogistico implements PuertoEntradaMotor {
  private readonly ahora: () => Date;

  constructor(private readonly dependencias: DependenciasMotorLogistico) {
    this.ahora = dependencias.ahora || (() => new Date());
  }

  async procesar(senalSinNormalizar: SenalEntrada): Promise<ResultadoProcesamiento> {
    const senal = normalizarSenalEntrada(senalSinNormalizar);
    const tenantPath = senal.tenant.tenantPath;
    const contexto = await this.dependencias.contexto.obtenerContexto(tenantPath);
    validarContextoParaSenal(contexto, senal);

    const repetidoPorEvento = await this.dependencias.persistencia.buscarPorEvento(
      tenantPath,
      senal.id
    );
    if (repetidoPorEvento) {
      return this.resultadoRepetido(repetidoPorEvento.resultado, 'EVENTO_REPETIDO');
    }

    const repetidoPorClave = await this.dependencias.persistencia.buscarPorIdempotencia(
      tenantPath,
      senal.idempotencyKey
    );
    if (repetidoPorClave) {
      if (repetidoPorClave.eventId === senal.id) {
        return this.resultadoRepetido(repetidoPorClave.resultado, 'IDEMPOTENCIA_REPETIDA');
      }
      throw new ErrorMotor(
        'IDEMPOTENCIA_CONFLICTIVA',
        'La idempotencyKey ya pertenece a otro evento',
        {
          tenantPath,
          idempotencyKey: senal.idempotencyKey,
          eventIdExistente: repetidoPorClave.eventId,
          eventIdRecibido: senal.id,
        }
      );
    }

    const pedidoId = senal.payload.pedidoId;
    const solicitudExistente = await this.dependencias.persistencia.buscarSolicitudPorPedido(
      tenantPath,
      pedidoId
    );
    if (solicitudExistente) {
      const misionExistente = await this.dependencias.persistencia.buscarMisionPorSolicitud(
        tenantPath,
        solicitudExistente.id
      );

      if (senal.tipo === 'pedido.cancelado') {
        if (solicitudExistente.estado === 'cancelada' || misionExistente?.estado === 'cancelada') {
          const resultado: ResultadoProcesamiento = {
            estado: 'repetida',
            codigo: 'PEDIDO_REPETIDO',
            eventId: senal.id,
            operationId: senal.operationId,
            tenantPath,
            solicitudLogistica: solicitudExistente,
            mision: misionExistente || undefined,
            eventos: [],
            senales: [],
          };
          await this.guardarResultado(senal, resultado);
          return resultado;
        }

        const resultado = await this.cancelarSolicitudYMision(
          senal,
          solicitudExistente,
          misionExistente || undefined
        );
        await this.guardarResultado(senal, resultado);
        await this.publicarSalidas(resultado);
        return resultado;
      }

      const resultado: ResultadoProcesamiento = {
        estado: 'repetida',
        codigo: 'PEDIDO_REPETIDO',
        eventId: senal.id,
        operationId: senal.operationId,
        tenantPath,
        solicitudLogistica: solicitudExistente,
        mision: misionExistente || undefined,
        eventos: [],
        senales: [],
      };
      await this.guardarResultado(senal, resultado);
      return resultado;
    }

    if (senal.tipo === 'pedido.cancelado') {
      throw new ErrorMotor(
        'REFERENCIA_NO_ENCONTRADA',
        `No existe solicitud logística para el pedido ${pedidoId}`
      );
    }

    const resultado = await this.crearSolicitudYMision(senal, contexto as ContextoOperativo);
    await this.guardarResultado(senal, resultado);
    await this.publicarSalidas(resultado);
    return resultado;
  }

  private async crearSolicitudYMision(
    senal: Extract<SenalEntrada, { tipo: 'pedido.requiere_entrega' }>,
    contexto: ContextoOperativo
  ): Promise<ResultadoProcesamiento> {
    const ahora = this.ahora().toISOString();
    const { tenant } = senal;
    const pedidoId = senal.payload.pedidoId;
    const solicitudId = crearIdDeterminista('solicitud-logistica', tenant.tenantPath, pedidoId);
    const misionId = crearIdDeterminista('mision', tenant.tenantPath, pedidoId);
    const referenciaPedido = crearReferencia('pedido', pedidoId, tenant.tenantPath);
    const referenciaSolicitud = crearReferencia(
      'solicitud_logistica',
      solicitudId,
      tenant.tenantPath
    );
    const referenciaMision = crearReferencia('mision', misionId, tenant.tenantPath);
    const identidad = identidadTenantDesdePath(contexto.tenantPath);

    const solicitudBase: SolicitudLogistica = {
      id: solicitudId,
      tenant: identidad,
      pedidoId,
      estado: 'solicitada',
      modalidad: senal.payload.modalidad,
      puntoRecoleccion: senal.payload.puntoRecoleccion,
      puntoEntrega: senal.payload.puntoEntrega,
      prioridad: senal.payload.prioridad || 'media',
      createdAt: ahora,
      referenciaPedido,
    };

    const misionSolicitada: MisionLogistica = {
      id: misionId,
      tenant: identidad,
      solicitudLogisticaId: solicitudId,
      pedidoId,
      estado: 'solicitada',
      modalidad: senal.payload.modalidad,
      puntoRecoleccion: senal.payload.puntoRecoleccion,
      puntoEntrega: senal.payload.puntoEntrega,
      prioridad: senal.payload.prioridad || 'media',
      createdAt: ahora,
    };

    const mision: MisionLogistica = {
      ...misionSolicitada,
      estado: transicionarMision(misionSolicitada.estado, 'mision.propuesta', ACTOR_MOTOR),
    };

    await this.dependencias.persistencia.guardarSolicitud(solicitudBase);
    await this.dependencias.persistencia.guardarMision(mision);

    const referencias = [referenciaPedido, referenciaSolicitud, referenciaMision] as const;
    const eventos: EventoDominio[] = [
      this.crearEvento(
        senal,
        'pedido.en_proceso',
        'negocio',
        `${senal.id}:pedido-en-proceso`,
        referencias,
        {
          pedidoId,
          estado: transicionarPedido(
            senal.payload.estadoPedido,
            'pedido.requiere_entrega',
            senal.actor
          ),
        }
      ),
      this.crearEvento(
        senal,
        'solicitud_logistica.creada',
        'central',
        `${senal.id}:solicitud-creada`,
        referencias,
        { solicitudLogisticaId: solicitudId, pedidoId }
      ),
      this.crearEvento(
        senal,
        'mision.propuesta',
        'central',
        `${senal.id}:mision-propuesta`,
        referencias,
        { misionId, solicitudLogisticaId: solicitudId, pedidoId, estado: mision.estado }
      ),
    ];

    const senales: SenalSalida[] = [
      this.crearSenalSalida(
        senal,
        'mision.propuesta',
        'central',
        `${senal.id}:senal-mision-propuesta`,
        referencias,
        { misionId, solicitudLogisticaId: solicitudId, pedidoId, estado: mision.estado }
      ),
    ];

    return {
      estado: 'procesada',
      codigo: 'ACEPTADA',
      eventId: senal.id,
      operationId: senal.operationId,
      tenantPath: tenant.tenantPath,
      solicitudLogistica: solicitudBase,
      mision,
      eventos,
      senales,
    };
  }

  private async cancelarSolicitudYMision(
    senal: Extract<SenalEntrada, { tipo: 'pedido.cancelado' }>,
    solicitud: SolicitudLogistica,
    mision?: MisionLogistica
  ): Promise<ResultadoProcesamiento> {
    const ahora = this.ahora().toISOString();
    const solicitudCancelada: SolicitudLogistica = {
      ...solicitud,
      estado: 'cancelada',
      canceladaAt: ahora,
    };
    let misionCancelada = mision;
    if (mision && mision.estado === 'entregada') {
      throw new ErrorMotor('TRANSICION_INVALIDA', 'No se puede cancelar una misión ya entregada', {
        misionId: mision.id,
        pedidoId: mision.pedidoId,
      });
    }

    await this.dependencias.persistencia.actualizarSolicitud(solicitudCancelada);

    if (mision && mision.estado !== 'cancelada') {
      misionCancelada = {
        ...mision,
        estado: transicionarMision(mision.estado, 'mision.cancelada', senal.actor),
        canceladaAt: ahora,
      };
      await this.dependencias.persistencia.actualizarMision(misionCancelada);
    }

    const referencias = [
      crearReferencia('pedido', senal.payload.pedidoId, senal.tenant.tenantPath),
      crearReferencia('solicitud_logistica', solicitud.id, senal.tenant.tenantPath),
      ...(misionCancelada
        ? [crearReferencia('mision', misionCancelada.id, senal.tenant.tenantPath)]
        : []),
    ] as const;
    const eventos: EventoDominio[] = [
      this.crearEvento(
        senal,
        'solicitud_logistica.cancelada',
        'negocio',
        `${senal.id}:solicitud-cancelada`,
        referencias,
        {
          pedidoId: senal.payload.pedidoId,
          solicitudLogisticaId: solicitud.id,
          motivo: senal.payload.motivo,
        }
      ),
    ];
    if (misionCancelada) {
      eventos.push(
        this.crearEvento(
          senal,
          'mision.cancelada',
          'central',
          `${senal.id}:mision-cancelada`,
          referencias,
          {
            pedidoId: senal.payload.pedidoId,
            misionId: misionCancelada.id,
            estado: misionCancelada.estado,
          }
        )
      );
    }

    const senales: SenalSalida[] = misionCancelada
      ? [
          this.crearSenalSalida(
            senal,
            'mision.cancelada',
            'negocio',
            `${senal.id}:senal-mision-cancelada`,
            referencias,
            {
              pedidoId: senal.payload.pedidoId,
              misionId: misionCancelada.id,
              estado: misionCancelada.estado,
            }
          ),
        ]
      : [];

    return {
      estado: 'procesada',
      codigo: 'ACEPTADA',
      eventId: senal.id,
      operationId: senal.operationId,
      tenantPath: senal.tenant.tenantPath,
      solicitudLogistica: solicitudCancelada,
      mision: misionCancelada,
      eventos,
      senales,
    };
  }

  private crearEvento(
    senal: SenalEntrada,
    tipo: EventoDominio['tipo'],
    destino: EventoDominio['destino'],
    sufijo: string,
    referencias: readonly EventoDominio['referencias'][number][],
    payload: Readonly<Record<string, unknown>>
  ): EventoDominio {
    return {
      id: crearIdDeterminista('evento', senal.tenant.tenantPath, sufijo),
      schemaVersion: senal.schemaVersion,
      operationId: senal.operationId,
      tenant: senal.tenant,
      origen: 'motor_logistico',
      destino,
      tipo,
      occurredAt: this.ahora().toISOString(),
      idempotencyKey: `${senal.idempotencyKey}:${sufijo}`,
      referencias,
      payload,
    };
  }

  private crearSenalSalida(
    senal: SenalEntrada,
    tipo: SenalSalida['tipo'],
    destino: SenalSalida['destino'],
    sufijo: string,
    referencias: readonly SenalSalida['referencias'][number][],
    payload: Readonly<Record<string, unknown>>
  ): SenalSalida {
    return {
      id: crearIdDeterminista('senal', senal.tenant.tenantPath, sufijo),
      schemaVersion: senal.schemaVersion,
      operationId: senal.operationId,
      tenant: senal.tenant,
      origen: 'motor_logistico',
      destino,
      tipo,
      occurredAt: this.ahora().toISOString(),
      idempotencyKey: `${senal.idempotencyKey}:${sufijo}`,
      referencias,
      payload,
    };
  }

  private async guardarResultado(senal: SenalEntrada, resultado: ResultadoProcesamiento) {
    await this.dependencias.persistencia.guardarProcesamiento({
      tenantPath: senal.tenant.tenantPath,
      eventId: senal.id,
      idempotencyKey: senal.idempotencyKey,
      fingerprint: crearHuellaSenal({
        id: senal.id,
        operationId: senal.operationId,
        tenantPath: senal.tenant.tenantPath,
        idempotencyKey: senal.idempotencyKey,
        tipo: senal.tipo,
        pedidoId: senal.payload.pedidoId,
      }),
      pedidoId: senal.payload.pedidoId,
      resultado,
    });
  }

  private async publicarSalidas(resultado: ResultadoProcesamiento) {
    if (!this.dependencias.salidas) return;
    for (const evento of resultado.eventos) {
      await this.dependencias.salidas.publicarEvento(evento);
    }
    for (const senal of resultado.senales) {
      await this.dependencias.salidas.enviarSenal(senal);
    }
  }

  private resultadoRepetido(
    resultado: ResultadoProcesamiento,
    codigo: 'EVENTO_REPETIDO' | 'IDEMPOTENCIA_REPETIDA'
  ): ResultadoProcesamiento {
    return { ...resultado, estado: 'repetida', codigo };
  }
}
