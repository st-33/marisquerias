import { encenderCapacidades } from '../encenderCapacidades';
import type { NegocioPlantillaBase } from '../tiposNPB';

describe('encenderCapacidades — Motor de Encendido Dinámico', () => {
  test('activa únicamente las capacidades, roles y cajones declarados y duerme los no listados', () => {
    const npb: NegocioPlantillaBase = {
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      version_npb: 1,
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
    expect(estado.capacidades_dormidas.length).toBe(8); // 9 canónicas - 1 activa

    expect(estado.roles_activos).toEqual(['administrador']);
    expect(estado.roles_dormidos).toContain('mesero');
    expect(estado.roles_dormidos).toContain('cocina');
    expect(estado.roles_dormidos.length).toBe(9); // 10 canónicos - 1 activo

    expect(estado.cajones_activos).toEqual(['menu']);
    expect(estado.cajones_dormidos).toContain('mesas');
    expect(estado.cajones_dormidos).toContain('ventas');
    expect(estado.cajones_dormidos.length).toBe(8); // 9 canónicos - 1 activo
  });

  test('tolerancia a colecciones vacías o indefinidas sin lanzar excepciones', () => {
    const npbVacio: NegocioPlantillaBase = {
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      version_npb: 1,
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
});
