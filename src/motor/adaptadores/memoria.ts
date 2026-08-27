import type {
  ContextoOperativo,
  EventoDominio,
  MisionLogistica,
  RegistroProcesamiento,
  SenalSalida,
  SolicitudLogistica,
} from '../nucleo/contratos';
import type {
  PuertoContextoOperativo,
  PuertoPersistenciaMotor,
  PuertoSalidasMotor,
} from '../puertos';

export class ContextoOperativoEnMemoria implements PuertoContextoOperativo {
  private readonly contextos = new Map<string, ContextoOperativo>();

  constructor(contextos: readonly ContextoOperativo[] = []) {
    contextos.forEach((contexto) => this.contextos.set(contexto.tenantPath, contexto));
  }

  async obtenerContexto(tenantPath: string): Promise<ContextoOperativo | null> {
    return this.contextos.get(tenantPath) || null;
  }

  establecer(contexto: ContextoOperativo) {
    this.contextos.set(contexto.tenantPath, contexto);
  }
}

export class PersistenciaMotorEnMemoria implements PuertoPersistenciaMotor {
  readonly procesamientos: RegistroProcesamiento[] = [];
  readonly solicitudes: SolicitudLogistica[] = [];
  readonly misiones: MisionLogistica[] = [];

  async buscarPorEvento(tenantPath: string, eventId: string) {
    return (
      this.procesamientos.find(
        (registro) => registro.tenantPath === tenantPath && registro.eventId === eventId
      ) || null
    );
  }

  async buscarPorIdempotencia(tenantPath: string, idempotencyKey: string) {
    return (
      this.procesamientos.find(
        (registro) =>
          registro.tenantPath === tenantPath && registro.idempotencyKey === idempotencyKey
      ) || null
    );
  }

  async guardarProcesamiento(registro: RegistroProcesamiento) {
    const index = this.procesamientos.findIndex(
      (existente) =>
        existente.tenantPath === registro.tenantPath && existente.eventId === registro.eventId
    );
    if (index === -1) this.procesamientos.push(registro);
    else this.procesamientos[index] = registro;
  }

  async buscarSolicitudPorPedido(tenantPath: string, pedidoId: string) {
    return (
      this.solicitudes.find(
        (solicitud) => solicitud.tenant.tenantPath === tenantPath && solicitud.pedidoId === pedidoId
      ) || null
    );
  }

  async guardarSolicitud(solicitud: SolicitudLogistica) {
    this.solicitudes.push(solicitud);
  }

  async actualizarSolicitud(solicitud: SolicitudLogistica) {
    const index = this.solicitudes.findIndex(
      (existente) =>
        existente.tenant.tenantPath === solicitud.tenant.tenantPath && existente.id === solicitud.id
    );
    if (index === -1) throw new Error(`Solicitud inexistente: ${solicitud.id}`);
    this.solicitudes[index] = solicitud;
  }

  async buscarMisionPorSolicitud(tenantPath: string, solicitudId: string) {
    return (
      this.misiones.find(
        (mision) =>
          mision.tenant.tenantPath === tenantPath && mision.solicitudLogisticaId === solicitudId
      ) || null
    );
  }

  async guardarMision(mision: MisionLogistica) {
    this.misiones.push(mision);
  }

  async actualizarMision(mision: MisionLogistica) {
    const index = this.misiones.findIndex(
      (existente) =>
        existente.tenant.tenantPath === mision.tenant.tenantPath && existente.id === mision.id
    );
    if (index === -1) throw new Error(`Misión inexistente: ${mision.id}`);
    this.misiones[index] = mision;
  }
}

export class SalidasMotorEnMemoria implements PuertoSalidasMotor {
  readonly eventos: EventoDominio[] = [];
  readonly senales: SenalSalida[] = [];

  async publicarEvento(evento: EventoDominio) {
    this.eventos.push(evento);
  }

  async enviarSenal(senal: SenalSalida) {
    this.senales.push(senal);
  }
}
