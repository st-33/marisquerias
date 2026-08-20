import React, { type ReactElement } from 'react';
import { MallaProductos } from '../MallaProductos';

jest.mock('react-native', () => ({
  FlatList: 'FlatList',
}));

interface ItemProducto {
  id: string;
  nombre: string;
}

describe('MallaProductos', () => {
  test('delega la virtualización a FlatList con items readonly y keyExtractor requerido', () => {
    const items = Object.freeze([
      { id: 'pan-1', nombre: 'Concha' },
      { id: 'pan-2', nombre: 'Cuernito' },
    ]) satisfies readonly ItemProducto[];
    const renderItem = jest.fn(({ item }: { item: ItemProducto }) =>
      React.createElement('producto', { nombre: item.nombre })
    );
    const keyExtractor = jest.fn((item: ItemProducto) => item.id);

    const tree = MallaProductos({
      items,
      renderItem,
      keyExtractor,
      numColumns: 2,
      testID: 'grid-productos',
    }) as ReactElement<Record<string, unknown>>;

    expect(tree.type).toBe('FlatList');
    expect(tree.props.data).toBe(items);
    expect(tree.props.renderItem).toBe(renderItem);
    expect(tree.props.keyExtractor).toBe(keyExtractor);
    expect(tree.props.numColumns).toBe(2);
    expect(tree.props.testID).toBe('grid-productos');
  });

  test('deriva la key interna de numColumns para recrear FlatList al cambiar columnas', () => {
    const props = {
      items: [] as readonly ItemProducto[],
      renderItem: ({ item }: { item: ItemProducto }) =>
        React.createElement('producto', { nombre: item.nombre }),
      keyExtractor: (item: ItemProducto) => item.id,
    };

    const dosColumnas = MallaProductos({ ...props, numColumns: 2 }) as ReactElement<
      Record<string, unknown>
    >;
    const tresColumnas = MallaProductos({ ...props, numColumns: 3 }) as ReactElement<
      Record<string, unknown>
    >;

    expect(dosColumnas.key).toBe('grid-productos-columns-2');
    expect(tresColumnas.key).toBe('grid-productos-columns-3');
    expect(tresColumnas.key).not.toBe(dosColumnas.key);
  });
});
