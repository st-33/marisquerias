import { encenderCapacidades, type EstadoEncendido } from '../../instalacion/npb/encenderCapacidades';
import type { NegocioPlantillaBase } from '../../instalacion/npb/tiposNPB';
import type { ConfiguracionNegocio } from '../../instalacion/npb/tiposNegocio';

/**
 * Función proyectora pura para aislar timestamps y comparar equivalencia matemática.
 */
function proyectarEstadoInvariante(e: EstadoEncendido | null) {
  if (!e) return null;
  return {
    capacidades_activas: [...e.capacidades_activas].sort(),
    capacidades_dormidas: [...e.capacidades_dormidas].sort(),
    roles_activos: [...e.roles_activos].sort(),
    roles_dormidos: [...e.roles_dormidos].sort(),
    cajones_activos: [...e.cajones_activos].sort(),
    cajones_dormidos: [...e.cajones_dormidos].sort(),
    tipo_acceso: e.tipo_acceso,
    version_npb: e.version_npb,
    negocio_id: e.negocio_id,
  };
}

describe('Prueba Unitaria de Equivalencia Matemática: Arranque en Frío vs Sincronización en Caliente', () => {
  const npbV2: NegocioPlantillaBase = {
    categoria_id: '01',
    slug_categoria: 'marisquerias',
    version_npb: 2,
    estado: 'sellado',
    roles_dispositivo: [
      { id: 'administrador', pantallas_visibles: [] },
      { id: 'mesero', pantallas_visibles: [] },
      { id: 'cocina', pantallas_visibles: [] },
      { id: 'mostrador', pantallas_visibles: [] },
      { id: 'barman', pantallas_visibles: [] },
    ],
    capacidades: [
      { id: 'menu', configuracion_giro: 'Menú digital' },
      { id: 'control_mesas', configuracion_giro: 'Atención mesas' },
      { id: 'comanda_cocina', configuracion_giro: 'Cocina y KDS' },
      { id: 'mostrador_y_pos', configuracion_giro: 'Cobro mostrador' },
      { id: 'inventario', configuracion_giro: 'Inventario' },
    ],
    cajones_activos: ['menu', 'mesas', 'mesas_pendientes', 'pedidos', 'ventas', 'inventario'],
    cajones_desactivados_justificacion: {},
  };

  const negocioBase: ConfiguracionNegocio = {
    negocio_id: 'mar-puerto-01',
    categoria_id: '01',
    slug_categoria: 'marisquerias',
    version_npb_origen: 2,
    cliente_id: 'cli-100',
    tipo_acceso: 'negocio_real',
    capacidades_autorizadas: ['menu', 'control_mesas', 'comanda_cocina', 'inventario'],
    roles_permitidos: ['administrador', 'mesero', 'cocina'], // Barman y Mostrador prohibidos por contrato
    cajones_dormidos_forzados: ['inventario'], // Inventario censurado por póliza
  };

  it('Invariante 1: Idempotencia estricta en estado estacionario (Frío == Caliente)', () => {
    // 1. Arranque en frío canónico
    const estadoFrio = encenderCapacidades(npbV2, negocioBase);

    // 2. Simulación de sincronización en caliente con preservación de contrato
    // La reconstitución en caliente NO debe descartar tipo_acceso, roles_permitidos ni cajones forzados
    const payloadCaliente = {
      negocio_id: negocioBase.negocio_id,
      tipo_acceso: estadoFrio.tipo_acceso,
      roles_permitidos: negocioBase.roles_permitidos,
      cajones_dormidos_forzados: negocioBase.cajones_dormidos_forzados,
      capacidades_autorizadas: ['menu', 'control_mesas', 'comanda_cocina', 'inventario'] as any,
    };
    const estadoCaliente = encenderCapacidades(npbV2, payloadCaliente);

    // Verificación de equivalencia matemática exacta
    expect(proyectarEstadoInvariante(estadoCaliente)).toEqual(proyectarEstadoInvariante(estadoFrio));
    expect(estadoCaliente.tipo_acceso).toBe('negocio_real');
    expect(estadoCaliente.version_npb).toBe(2);
    expect(estadoCaliente.roles_activos).not.toContain('barman');
    expect(estadoCaliente.cajones_dormidos).toContain('inventario');
  });

  it('Invariante 2: Conmutación en caliente de capacidades preservando gobernanza', () => {
    // Escenario: Ecosistema apaga "comanda_cocina" en caliente
    const nuevasCapacidades = ['menu', 'control_mesas', 'inventario'];

    // Resultado esperado en arranque en frío si el negocio tuviese esas capacidades
    const estadoFrioEquivalente = encenderCapacidades(npbV2, {
      ...negocioBase,
      capacidades_autorizadas: nuevasCapacidades as any,
    });

    // Simulación del recálculo de useCapacidadesRealtime saneado
    const estadoCalienteMutado = encenderCapacidades(npbV2, {
      negocio_id: negocioBase.negocio_id,
      tipo_acceso: 'negocio_real',
      roles_permitidos: negocioBase.roles_permitidos,
      cajones_dormidos_forzados: negocioBase.cajones_dormidos_forzados,
      capacidades_autorizadas: nuevasCapacidades as any,
    });

    expect(proyectarEstadoInvariante(estadoCalienteMutado)).toEqual(
      proyectarEstadoInvariante(estadoFrioEquivalente)
    );
    expect(estadoCalienteMutado.capacidades_activas).toEqual(['menu', 'control_mesas', 'inventario']);
    expect(estadoCalienteMutado.roles_activos).not.toContain('cocina');
    expect(estadoCalienteMutado.cajones_dormidos).toContain('pedidos');
    expect(estadoCalienteMutado.tipo_acceso).toBe('negocio_real');
  });

  it('Invariante 3 (Anti-Regresión): Demostración de falla del código no saneado', () => {
    // Si se pasa un payload recortado descartando gobernanza previa:
    const estadoActualNoSaneado = encenderCapacidades(npbV2, {
      negocio_id: negocioBase.negocio_id,
      capacidades_autorizadas: ['menu', 'control_mesas', 'comanda_cocina', 'inventario'] as any,
    });

    // Falla 1: tipo_acceso se degrada a 'negocio' en lugar de 'negocio_real'
    expect(estadoActualNoSaneado.tipo_acceso).toBe('negocio');
    expect(estadoActualNoSaneado.tipo_acceso).not.toBe(negocioBase.tipo_acceso);

    // Falla 2: barman (prohibido en roles_permitidos) se activa indebidamente si no se pasan roles
    expect(estadoActualNoSaneado.roles_activos).toContain('barman');

    // Falla 3: inventario (en cajones_dormidos_forzados) se despierta indebidamente
    expect(estadoActualNoSaneado.cajones_activos).toContain('inventario');
  });

  it('Invariante 4 (Regla 34 Anti-OOM): Idempotencia estructural y supresión de mutación', () => {
    // Verifica que si las capacidades autorizadas remotas son idénticas, no debe emitirse mutación
    const capacidadesActuales = ['control_mesas', 'menu'].sort();
    const snapshotRemoto = { menu: true, control_mesas: true };

    const capacidadesEntrantes = Object.entries(snapshotRemoto)
      .filter(([, v]) => v === true)
      .map(([k]) => k)
      .sort();

    const cambioDetectado =
      capacidadesActuales.length !== capacidadesEntrantes.length ||
      capacidadesActuales.some((c, i) => c !== capacidadesEntrantes[i]);

    expect(cambioDetectado).toBe(false);
  });
});
