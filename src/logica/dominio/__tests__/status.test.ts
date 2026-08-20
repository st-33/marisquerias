import { toItemCanonical, toOrderCanonical } from '../status';

describe('compatibilidad de estados operativos legacy', () => {
  test('normaliza una orden abierta con trabajo de cocina como orden activa', () => {
    expect(toOrderCanonical('abierto')).toBe('enviado_cocina');
  });

  test('normaliza el estado legacy preparando de los items', () => {
    expect(toItemCanonical('preparando')).toBe('en_preparacion');
  });
});
