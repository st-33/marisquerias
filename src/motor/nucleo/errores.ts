export type CodigoErrorMotor =
  | 'SENAL_INVALIDA'
  | 'TENANT_NO_ENCONTRADO'
  | 'TENANT_INCORRECTO'
  | 'TENANT_DESHABILITADO'
  | 'CAPACIDAD_DESACTIVADA'
  | 'ACTOR_NO_AUTORIZADO'
  | 'REFERENCIA_INCONSISTENTE'
  | 'REFERENCIA_NO_ENCONTRADA'
  | 'TRANSICION_INVALIDA'
  | 'IDEMPOTENCIA_CONFLICTIVA'
  | 'PEDIDO_REPETIDO';

export class ErrorMotor extends Error {
  readonly nombre = 'ErrorMotor';

  constructor(
    readonly codigo: CodigoErrorMotor,
    mensaje: string,
    readonly detalles?: Readonly<Record<string, unknown>>
  ) {
    super(mensaje);
    this.name = 'ErrorMotor';
  }
}

export function errorSenalInvalida(mensaje: string, detalles?: Readonly<Record<string, unknown>>) {
  return new ErrorMotor('SENAL_INVALIDA', mensaje, detalles);
}
