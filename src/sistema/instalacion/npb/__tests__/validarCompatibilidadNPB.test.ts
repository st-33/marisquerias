import { validarCompatibilidadNPB } from '../validarCompatibilidadNPB';
import type { NegocioPlantillaBase } from '../tiposNPB';

describe('validarCompatibilidadNPB — Validador Puro de Compatibilidad de NPB 00', () => {
  const npbValido: NegocioPlantillaBase = {
    categoria_id: '01',
    slug_categoria: 'marisquerias',
    version_npb: 1,
    estado: 'sellado',
    roles_dispositivo: [
      { id: 'administrador', pantallas_visibles: ['/_role/admin/dashboard'] },
      { id: 'mesero', pantallas_visibles: ['/_role/mesero'] },
    ],
    capacidades: [
      { id: 'menu', configuracion_giro: 'Catálogo de productos' },
      { id: 'tickets_impresion', configuracion_giro: 'Emisión de recibos' },
    ],
    cajones_activos: ['menu', 'tickets'],
    cajones_desactivados_justificacion: {},
  };

  test('retorna compatible true y lista vacía cuando el NPB cumple con todos los catálogos cerrados', () => {
    const res = validarCompatibilidadNPB(npbValido);
    expect(res.compatible).toBe(true);
    expect(res.faltantes).toEqual([]);
  });

  test('detecta capacidad ajena al catálogo cerrado de 9 capacidades', () => {
    const npbInvalido: NegocioPlantillaBase = {
      ...npbValido,
      capacidades: [
        { id: 'menu', configuracion_giro: 'Catálogo' },
        { id: 'capacidad_inexistente', configuracion_giro: 'No soportada' },
      ],
    };
    const res = validarCompatibilidadNPB(npbInvalido);
    expect(res.compatible).toBe(false);
    expect(res.faltantes).toContain('capacidad:capacidad_inexistente');
  });

  test('detecta rol ajeno al catálogo cerrado de 10 roles', () => {
    const npbInvalido: NegocioPlantillaBase = {
      ...npbValido,
      roles_dispositivo: [
        { id: 'administrador', pantallas_visibles: [] },
        { id: 'rol_extraterrestre', pantallas_visibles: [] },
      ],
    };
    const res = validarCompatibilidadNPB(npbInvalido);
    expect(res.compatible).toBe(false);
    expect(res.faltantes).toContain('rol:rol_extraterrestre');
  });

  test('detecta cajón ajeno a los 9 cajones canónicos del APK', () => {
    const npbInvalido: NegocioPlantillaBase = {
      ...npbValido,
      cajones_activos: ['menu', 'cajon_desconocido'],
    };
    const res = validarCompatibilidadNPB(npbInvalido);
    expect(res.compatible).toBe(false);
    expect(res.faltantes).toContain('cajon:cajon_desconocido');
  });

  test('acumula múltiples faltantes en la lista diagnóstica', () => {
    const npbMultiplesFaltantes: NegocioPlantillaBase = {
      ...npbValido,
      capacidades: [{ id: 'cap_x', configuracion_giro: 'x' }],
      roles_dispositivo: [{ id: 'rol_y', pantallas_visibles: [] }],
      cajones_activos: ['cajon_z'],
    };
    const res = validarCompatibilidadNPB(npbMultiplesFaltantes);
    expect(res.compatible).toBe(false);
    expect(res.faltantes).toEqual(['capacidad:cap_x', 'rol:rol_y', 'cajon:cajon_z']);
  });
});
