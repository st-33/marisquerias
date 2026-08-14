import React, { type ReactElement } from 'react';
import { GridCatalogo } from '../GridCatalogo';

jest.mock('react-native', () => ({
  FlatList: 'FlatList',
}));

interface ItemCatalogo {
  id: string;
  nombre: string;
}

describe('GridCatalogo', () => {
  test('delega la virtualización a FlatList con items readonly y keyExtractor requerido', () => {
    const items = Object.freeze([
      { id: 'pan-1', nombre: 'Concha' },
      { id: 'pan-2', nombre: 'Cuernito' },
    ]) satisfies readonly ItemCatalogo[];
    const renderItem = jest.fn(({ item }: { item: ItemCatalogo }) =>
      React.createElement('producto', { nombre: item.nombre })
    );
    const keyExtractor = jest.fn((item: ItemCatalogo) => item.id);

    const tree = GridCatalogo({
      items,
      renderItem,
      keyExtractor,
      numColumns: 2,
      testID: 'grid-catalogo',
    }) as ReactElement<Record<string, unknown>>;

    expect(tree.type).toBe('FlatList');
    expect(tree.props.data).toBe(items);
    expect(tree.props.renderItem).toBe(renderItem);
    expect(tree.props.keyExtractor).toBe(keyExtractor);
    expect(tree.props.numColumns).toBe(2);
    expect(tree.props.testID).toBe('grid-catalogo');
  });

  test('deriva la key interna de numColumns para recrear FlatList al cambiar columnas', () => {
    const props = {
      items: [] as readonly ItemCatalogo[],
      renderItem: ({ item }: { item: ItemCatalogo }) =>
        React.createElement('producto', { nombre: item.nombre }),
      keyExtractor: (item: ItemCatalogo) => item.id,
    };

    const dosColumnas = GridCatalogo({ ...props, numColumns: 2 }) as ReactElement<
      Record<string, unknown>
    >;
    const tresColumnas = GridCatalogo({ ...props, numColumns: 3 }) as ReactElement<
      Record<string, unknown>
    >;

    expect(dosColumnas.key).toBe('grid-catalogo-columns-2');
    expect(tresColumnas.key).toBe('grid-catalogo-columns-3');
    expect(tresColumnas.key).not.toBe(dosColumnas.key);
  });
});
