import { limpiarUndefined } from '../serializacion';

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
