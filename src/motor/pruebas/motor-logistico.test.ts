import {
  ContextoOperativoEnMemoria,
  MotorLogistico,
  PersistenciaMotorEnMemoria,
  SalidasMotorEnMemoria,
  type ContextoOperativo,
  type SenalEntrada,
} from '../index';
import { transicionarMision, transicionarPedido } from '../nucleo/transiciones';
import { validarContextoParaSenal } from '../nucleo/validaciones';

const tenantA = {
  tenantPath: 'marisquerias/el-arrecife',
  tenantId: 'el-arrecife',
  categoriaId: 'marisquerias',
} as const;

const tenantB = {
  tenantPath: 'marisquerias/la-perla',
  tenantId: 'la-perla',
  categoriaId: 'marisquerias',
} as const;

const contextoActivo: ContextoOperativo = {
  ...tenantA,
  tenantExiste: true,
  habilitado: true,
  capacidades: {
    motorLogistico: true,
    delivery: true,
    solicitudesLogisticas: true,
  },
  actoresAutorizados: ['negocio', 'sistema', 'automatizacion', 'central', 'repartidor'],
};

function crearSenalEntrega(
  overrides: Partial<Extract<SenalEntrada, { tipo: 'pedido.requiere_entrega' }>> = {}
): SenalEntrada {
  return {
    id: 'evt-pedido-001',
    schemaVersion: 1,
    operationId: 'op-pedido-001',
    tenant: tenantA,
    origen: 'negocio',
    canal: 'negocio',
    actor: { tipo: 'negocio', id: 'el-arrecife' },
    destino: 'motor_logistico',
    tipo: 'pedido.requiere_entrega',
    occurredAt: '2026-08-27T12:00:00.000Z',
    idempotencyKey: 'idem-pedido-001',
    referencias: [{ tipo: 'pedido', id: 'pedido-001', tenantPath: tenantA.tenantPath }],
    payload: {
      pedidoId: 'pedido-001',
      estadoPedido: 'confirmado',
      modalidad: 'domicilio',
      puntoRecoleccion: { direccion: 'Av. Centro 1' },
      puntoEntrega: { direccion: 'Calle Mar 2' },
      prioridad: 'alta',
    },
    ...overrides,
  };
}

function crearSenalCancelacion(): SenalEntrada {
  return {
    id: 'evt-pedido-001-cancelado',
    schemaVersion: 1,
    operationId: 'op-pedido-001-cancelado',
    tenant: tenantA,
    origen: 'negocio',
    canal: 'negocio',
    actor: { tipo: 'negocio', id: 'el-arrecife' },
    destino: 'motor_logistico',
    tipo: 'pedido.cancelado',
    occurredAt: '2026-08-27T12:05:00.000Z',
    idempotencyKey: 'idem-pedido-001-cancelado',
    referencias: [{ tipo: 'pedido', id: 'pedido-001', tenantPath: tenantA.tenantPath }],
    payload: {
      pedidoId: 'pedido-001',
      motivo: 'cliente_canceló',
    },
  };
}

function crearMotor(
  contexto: ContextoOperativo = contextoActivo,
  persistencia = new PersistenciaMotorEnMemoria(),
  salidas = new SalidasMotorEnMemoria()
) {
  return {
    motor: new MotorLogistico({
      contexto: new ContextoOperativoEnMemoria([contexto]),
      persistencia,
      salidas,
      ahora: () => new Date('2026-08-27T12:10:00.000Z'),
    }),
    persistencia,
    salidas,
  };
}

describe('MotorLogistico', () => {
  it('procesa una necesidad del negocio y produce solicitud y misión propuesta', async () => {
    const { motor, persistencia, salidas } = crearMotor();

    const resultado = await motor.procesar(crearSenalEntrega());

    expect(resultado.codigo).toBe('ACEPTADA');
    expect(resultado.estado).toBe('procesada');
    expect(resultado.solicitudLogistica?.estado).toBe('solicitada');
    expect(resultado.mision?.estado).toBe('propuesta');
    expect(persistencia.solicitudes).toHaveLength(1);
    expect(persistencia.misiones).toHaveLength(1);
    expect(resultado.eventos.map((evento) => evento.tipo)).toEqual([
      'pedido.en_proceso',
      'solicitud_logistica.creada',
      'mision.propuesta',
    ]);
    expect(salidas.senales[0]?.tipo).toBe('mision.propuesta');
  });

  it('impide una transición de pedido inválida', () => {
    expect(() =>
      transicionarPedido('provisional', 'pedido.requiere_entrega', {
        tipo: 'negocio',
        id: 'el-arrecife',
      })
    ).toThrow('No existe transición');
  });

  it('impide una transición de misión inválida desde estado terminal', () => {
    expect(() =>
      transicionarMision('entregada', 'mision.cancelada', {
        tipo: 'central',
        id: 'central',
      })
    ).toThrow('No se puede cancelar');
  });

  it('rechaza un contexto que pertenece a otro tenant', () => {
    const señal = crearSenalEntrega({ tenant: tenantB });

    expect(() => validarContextoParaSenal(contextoActivo, señal)).toThrow(
      'no coincide con el tenant'
    );
  });

  it('rechaza una capacidad logística desactivada', async () => {
    const { motor } = crearMotor({
      ...contextoActivo,
      capacidades: { ...contextoActivo.capacidades, delivery: false },
    });

    await expect(motor.procesar(crearSenalEntrega())).rejects.toMatchObject({
      codigo: 'CAPACIDAD_DESACTIVADA',
    });
  });

  it('rechaza un actor no autorizado por el tenant', async () => {
    const { motor } = crearMotor({
      ...contextoActivo,
      actoresAutorizados: ['sistema'],
    });

    await expect(motor.procesar(crearSenalEntrega())).rejects.toMatchObject({
      codigo: 'ACTOR_NO_AUTORIZADO',
    });
  });

  it('devuelve el mismo resultado sin volver a crear misión ante evento duplicado', async () => {
    const { motor, persistencia } = crearMotor();
    const señal = crearSenalEntrega();

    await motor.procesar(señal);
    const repetida = await motor.procesar(señal);

    expect(repetida.estado).toBe('repetida');
    expect(repetida.codigo).toBe('EVENTO_REPETIDO');
    expect(persistencia.solicitudes).toHaveLength(1);
    expect(persistencia.misiones).toHaveLength(1);
  });

  it('rechaza una idempotencyKey repetida con otro evento', async () => {
    const { motor } = crearMotor();
    await motor.procesar(crearSenalEntrega());

    await expect(
      motor.procesar(
        crearSenalEntrega({
          id: 'evt-pedido-002',
          operationId: 'op-pedido-002',
          idempotencyKey: 'idem-pedido-001',
          referencias: [{ tipo: 'pedido', id: 'pedido-002', tenantPath: tenantA.tenantPath }],
          payload: {
            pedidoId: 'pedido-002',
            estadoPedido: 'confirmado',
            modalidad: 'domicilio',
            puntoRecoleccion: { direccion: 'Av. Centro 1' },
            puntoEntrega: { direccion: 'Calle Mar 3' },
          },
        })
      )
    ).rejects.toMatchObject({ codigo: 'IDEMPOTENCIA_CONFLICTIVA' });
  });

  it('no crea otra misión si el mismo pedido llega con una señal nueva', async () => {
    const { motor, persistencia } = crearMotor();
    await motor.procesar(crearSenalEntrega());

    const repetida = await motor.procesar(
      crearSenalEntrega({
        id: 'evt-pedido-001-reintento',
        operationId: 'op-pedido-001-reintento',
        idempotencyKey: 'idem-pedido-001-reintento',
      })
    );

    expect(repetida.codigo).toBe('PEDIDO_REPETIDO');
    expect(persistencia.solicitudes).toHaveLength(1);
    expect(persistencia.misiones).toHaveLength(1);
  });

  it('cancela la solicitud y la misión mediante una señal posterior autorizada', async () => {
    const { motor, persistencia, salidas } = crearMotor();
    await motor.procesar(crearSenalEntrega());

    const resultado = await motor.procesar(crearSenalCancelacion());

    expect(resultado.codigo).toBe('ACEPTADA');
    expect(resultado.solicitudLogistica?.estado).toBe('cancelada');
    expect(resultado.mision?.estado).toBe('cancelada');
    expect(persistencia.solicitudes[0]?.estado).toBe('cancelada');
    expect(persistencia.misiones[0]?.estado).toBe('cancelada');
    expect(salidas.senales.at(-1)?.tipo).toBe('mision.cancelada');
  });

  it('rechaza referencias de pedido inconsistentes con la señal', async () => {
    const { motor } = crearMotor();
    const señal = crearSenalEntrega({
      referencias: [{ tipo: 'pedido', id: 'otro-pedido', tenantPath: tenantA.tenantPath }],
    });

    await expect(motor.procesar(señal)).rejects.toMatchObject({
      codigo: 'REFERENCIA_INCONSISTENTE',
    });
  });
});
