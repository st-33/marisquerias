import type { AjustesReparto } from '../../sistema/persistencia/reparto-ajustes.repo';

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const LIMITES_AJUSTES_REPARTO = {
  stockBajo: { minimo: 0, entero: true },
  maxPedidosActivos: { minimo: 0, entero: true },
  tiempoMaxEntregaMin: { minimo: 0, entero: true },
  base: { minimo: 0, entero: false },
  porKm: { minimo: 0, entero: false },
  minimo: { minimo: 0, entero: false },
} as const;

type ErrorAjustesReparto =
  | 'valor_invalido'
  | 'valor_negativo'
  | 'valor_no_entero'
  | 'hora_invalida'
  | 'ventana_invalida';

export class ErrorValidacionAjustesReparto extends Error {
  readonly codigo: ErrorAjustesReparto;

  constructor(codigo: ErrorAjustesReparto, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorValidacionAjustesReparto';
    this.codigo = codigo;
  }
}

function validarNumero(
  nombre: string,
  valor: number | undefined,
  minimo: number,
  entero: boolean
): number | undefined {
  if (valor === undefined) return undefined;
  if (!Number.isFinite(valor)) {
    throw new ErrorValidacionAjustesReparto(
      'valor_invalido',
      `${nombre} debe ser un número finito.`
    );
  }
  if (valor < minimo) {
    throw new ErrorValidacionAjustesReparto(
      'valor_negativo',
      `${nombre} no puede ser menor que ${minimo}.`
    );
  }
  if (entero && !Number.isInteger(valor)) {
    throw new ErrorValidacionAjustesReparto(
      'valor_no_entero',
      `${nombre} debe ser un número entero.`
    );
  }
  return valor;
}

export function validarUmbralesReparto(
  umbrales: Partial<AjustesReparto['umbrales']>
): Partial<AjustesReparto['umbrales']> {
  return {
    ...(umbrales.stockBajo === undefined
      ? {}
      : {
          stockBajo: validarNumero(
            'stockBajo',
            umbrales.stockBajo,
            LIMITES_AJUSTES_REPARTO.stockBajo.minimo,
            true
          ),
        }),
    ...(umbrales.maxPedidosActivos === undefined
      ? {}
      : {
          maxPedidosActivos: validarNumero(
            'maxPedidosActivos',
            umbrales.maxPedidosActivos,
            LIMITES_AJUSTES_REPARTO.maxPedidosActivos.minimo,
            true
          ),
        }),
    ...(umbrales.tiempoMaxEntregaMin === undefined
      ? {}
      : {
          tiempoMaxEntregaMin: validarNumero(
            'tiempoMaxEntregaMin',
            umbrales.tiempoMaxEntregaMin,
            LIMITES_AJUSTES_REPARTO.tiempoMaxEntregaMin.minimo,
            true
          ),
        }),
  };
}

export function validarCostosReparto(
  costos: Partial<AjustesReparto['costos']>
): Partial<AjustesReparto['costos']> {
  return {
    ...(costos.base === undefined
      ? {}
      : { base: validarNumero('base', costos.base, LIMITES_AJUSTES_REPARTO.base.minimo, false) }),
    ...(costos.porKm === undefined
      ? {}
      : {
          porKm: validarNumero('porKm', costos.porKm, LIMITES_AJUSTES_REPARTO.porKm.minimo, false),
        }),
    ...(costos.minimo === undefined
      ? {}
      : {
          minimo: validarNumero(
            'minimo',
            costos.minimo,
            LIMITES_AJUSTES_REPARTO.minimo.minimo,
            false
          ),
        }),
  };
}

function minutos(hora: string): number {
  const [horas, minutosHora] = hora.split(':').map(Number);
  return horas * 60 + minutosHora;
}

export function validarHorariosReparto(
  horarios: Partial<AjustesReparto['horarios']>
): Partial<AjustesReparto['horarios']> {
  if (!horarios.ventanas) return { ...horarios };

  for (const ventana of horarios.ventanas) {
    if (!HORA_RE.test(ventana.inicio) || !HORA_RE.test(ventana.fin)) {
      throw new ErrorValidacionAjustesReparto(
        'hora_invalida',
        'Las horas deben usar el formato HH:MM.'
      );
    }
    if (minutos(ventana.inicio) >= minutos(ventana.fin)) {
      throw new ErrorValidacionAjustesReparto(
        'ventana_invalida',
        'El inicio de una ventana debe ser anterior al fin.'
      );
    }
  }

  return { ...horarios };
}
