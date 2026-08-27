import type {
  ContextoOperativo,
  EventoDominio,
  MisionLogistica,
  RegistroProcesamiento,
  ResultadoProcesamiento,
  SenalEntrada,
  SenalSalida,
  SolicitudLogistica,
} from './nucleo/contratos';

export interface PuertoContextoOperativo {
  obtenerContexto(tenantPath: string): Promise<ContextoOperativo | null>;
}

export interface PuertoPersistenciaMotor {
  buscarPorEvento(tenantPath: string, eventId: string): Promise<RegistroProcesamiento | null>;
  buscarPorIdempotencia(
    tenantPath: string,
    idempotencyKey: string
  ): Promise<RegistroProcesamiento | null>;
  guardarProcesamiento(registro: RegistroProcesamiento): Promise<void>;

  buscarSolicitudPorPedido(
    tenantPath: string,
    pedidoId: string
  ): Promise<SolicitudLogistica | null>;
  guardarSolicitud(solicitud: SolicitudLogistica): Promise<void>;
  actualizarSolicitud(solicitud: SolicitudLogistica): Promise<void>;

  buscarMisionPorSolicitud(
    tenantPath: string,
    solicitudId: string
  ): Promise<MisionLogistica | null>;
  guardarMision(mision: MisionLogistica): Promise<void>;
  actualizarMision(mision: MisionLogistica): Promise<void>;
}

export interface PuertoSalidasMotor {
  publicarEvento(evento: EventoDominio): Promise<void>;
  enviarSenal(senal: SenalSalida): Promise<void>;
}

export interface PuertoEntradaMotor {
  procesar(senal: SenalEntrada): Promise<ResultadoProcesamiento>;
}
