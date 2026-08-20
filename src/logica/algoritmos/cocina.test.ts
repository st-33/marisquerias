// src/verticales/cocina/logica/__tests__/utils.test.ts
import type { ItemCocina } from '../../roles/logica/cocina/useCocinaLogic';
import { calculateStats, deduplicateItems, groupItems } from './cocina';

describe('deduplicateItems', () => {
  it('mantiene el item con mayor prioridad de estado', () => {
    const items: ItemCocina[] = [
      { id: '1', draftId: 'a', estado: 'nuevo', nombre: 'A', cantidad: 1 } as any,
      { id: '2', draftId: 'a', estado: 'listo', nombre: 'A', cantidad: 1 } as any,
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].estado).toBe('listo');
  });
});

describe('groupItems', () => {
  it('agrupa items idénticos sumando cantidad y eligiendo estado avanzado', () => {
    const items: ItemCocina[] = [
      {
        id: '1',
        nombre: 'Pizza',
        productoId: 'p1',
        cantidad: 1,
        estado: 'nuevo',
        variantes: undefined,
        notas: '',
      } as any,
      {
        id: '2',
        nombre: 'Pizza',
        productoId: 'p1',
        cantidad: 2,
        estado: 'listo',
        variantes: undefined,
        notas: '',
      } as any,
    ];
    const result = groupItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].cantidad).toBe(3);
    expect(result[0].estado).toBe('listo');
  });
});

describe('calculateStats', () => {
  it('calcula totales correctamente a partir de los items de la orden', () => {
    const orden = {
      items: [
        { id: '1', estado: 'nuevo' } as any,
        { id: '2', estado: 'listo' } as any,
        { id: '3', estado: 'en_cocina' } as any,
      ],
    } as any;
    const stats = calculateStats(orden);
    expect(stats.itemsTotal).toBe(3);
    expect(stats.itemsPendientes).toBe(2);
    expect(stats.itemsListos).toBe(1);
  });
});
