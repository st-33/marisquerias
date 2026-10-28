import { encenderCapacidades } from '../encenderCapacidades';
import type { NegocioPlantillaBase } from '../tiposNPB';

describe('encenderCapacidades — Motor de Encendido Dinámico', () => {
  test('activa únicamente las capacidades, roles y cajones declarados y duerme los no listados', () => {
    const npb: NegocioPlantillaBase = {
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      estado: 'sellado',
      roles_dispositivo: [{ id: 'administrador', pantallas_visibles: ['/_role/admin/dashboard'] }],
      capacidades: [{ id: 'menu', configuracion_giro: 'Catálogo base' }],
      cajones_activos: ['menu'],
      cajones_desactivados_justificacion: {
        reparto_ajustes: 'Sin delivery',
      },
    };

    const estado = encenderCapacidades(npb);

    expect(estado.capacidades_activas).toEqual(['menu']);
    expect(estado.capacidades_dormidas).toContain('tickets_impresion');
    expect(estado.capacidades_dormidas).toContain('control_mesas');
    expect(estado.capacidades_dormidas.length).toBe(8);

    expect(estado.roles_activos).toEqual(['administrador']);
    expect(estado.roles_dormidos).toContain('mesero');
    expect(estado.roles_dormidos).toContain('cocina');
    expect(estado.roles_dormidos.length).toBe(9);

    expect(estado.cajones_activos).toEqual(['menu']);
    expect(estado.cajones_dormidos).toContain('mesas');
    expect(estado.cajones_dormidos).toContain('ventas');
    expect(estado.cajones_dormidos.length).toBe(8);
  });

  test('tolerancia a colecciones vacías o indefinidas sin lanzar excepciones', () => {
    const npbVacio: NegocioPlantillaBase = {
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      estado: 'sellado',
      roles_dispositivo: [],
      capacidades: [],
      cajones_activos: [],
      cajones_desactivados_justificacion: {},
    };

    const estado = encenderCapacidades(npbVacio);

    expect(estado.capacidades_activas).toEqual([]);
    expect(estado.capacidades_dormidas.length).toBe(9);
    expect(estado.roles_activos).toEqual([]);
    expect(estado.roles_dormidos.length).toBe(10);
    expect(estado.cajones_activos).toEqual([]);
    expect(estado.cajones_dormidos.length).toBe(9);
  });

  test('enciende directamente desde la configuración individual del negocio sin descargar el NPB 00 remoto', () => {
    const negocioConcreto = {
      tipo_acceso: 'negocio_real' as const,
      negocio_id: 'mar-puerto-libres',
      capacidades_autorizadas: ['menu', 'control_mesas'] as any[],
      cajones_dormidos_forzados: ['reparto_ajustes'] as any[],
      roles_permitidos: ['administrador', 'mesero', 'cocina'],
    };

    const estado = encenderCapacidades(negocioConcreto);

    expect(estado.capacidades_activas).toEqual(['menu', 'control_mesas']);
    expect(estado.capacidades_dormidas).toContain('comanda_cocina');
    expect(estado.capacidades_dormidas).toContain('reparto_logistica');
    expect(estado.capacidades_dormidas).toContain('inventario');

    expect(estado.cajones_activos).toContain('menu');
    expect(estado.cajones_activos).toContain('mesas');
    expect(estado.cajones_dormidos).toContain('inventario');
    expect(estado.cajones_dormidos).toContain('reparto_ajustes');

    // 'cocina' requiere 'comanda_cocina', que está dormida -> se subordina y queda dormido
    expect(estado.roles_activos).toEqual(['administrador', 'mesero']);
    expect(estado.roles_dormidos).toContain('cocina');
    expect(estado.roles_dormidos).toContain('repartidor');
    expect(estado.tipo_acceso).toBe('negocio_real');
  });

  test('modo plantilla: enciende el 100% de capacidades de la categoría sin restricciones individuales', () => {
    const accesoPlantilla = {
      tipo_acceso: 'plantilla' as const,
      negocio_id: '00',
    };

    const estado = encenderCapacidades(accesoPlantilla);

    expect(estado.tipo_acceso).toBe('plantilla');
    expect(estado.capacidades_activas.length).toBe(9);
    expect(estado.roles_activos.length).toBe(10);
  });
});
