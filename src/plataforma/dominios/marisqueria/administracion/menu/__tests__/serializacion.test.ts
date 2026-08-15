import { limpiarUndefined, normalizarVariantes } from '../serializacion';

describe('limpiarUndefined', () => {
  it('omite undefined en objetos anidados sin alterar valores válidos', () => {
    expect(
      limpiarUndefined({
        titulo: 'Salsas',
        rol: undefined,
        triggers: { showGroups: undefined, hideGroups: ['g2'] },
        opciones: { o1: { titulo: 'Picante', delta: undefined } },
      })
    ).toEqual({
      titulo: 'Salsas',
      triggers: { hideGroups: ['g2'] },
      opciones: { o1: { titulo: 'Picante' } },
    });
  });

  it('omite undefined dentro de arreglos para evitar payloads inválidos', () => {
    expect(limpiarUndefined(['g1', undefined, 'g2'])).toEqual(['g1', 'g2']);
  });
});

describe('normalizarVariantes', () => {
  it('agrega label legible a opciones nuevas y conserva el ID interno', () => {
    expect(
      normalizarVariantes({
        grupos: {
          gSalsas: {
            titulo: 'Salsas',
            tipo: 'single',
            opciones: {
              snAgu: { titulo: 'Sin Aguacate' },
              oGr: { label: 'Grande', titulo: 'Grande', delta: 20 },
            },
          },
        },
      })
    ).toEqual({
      grupos: {
        gSalsas: {
          titulo: 'Salsas',
          tipo: 'single',
          opciones: {
            snAgu: { titulo: 'Sin Aguacate', label: 'Sin Aguacate' },
            oGr: { label: 'Grande', titulo: 'Grande', delta: 20 },
          },
        },
      },
    });
  });

  it('convierte una opción legacy tipo string a objeto legible', () => {
    expect(
      normalizarVariantes({
        grupos: {
          g: { titulo: 'Tamaño', opciones: { oCam: 'Camaronera' } },
        },
      }).grupos.g.opciones.oCam
    ).toEqual({ label: 'Camaronera', titulo: 'Camaronera' });
  });
});
