import React from 'react';
import { FlatList, type FlatListProps, type ListRenderItem } from 'react-native';

export type MallaProductosProps<Item> = Omit<
  FlatListProps<Item>,
  'data' | 'renderItem' | 'keyExtractor' | 'numColumns'
> & {
  items: readonly Item[];
  renderItem: ListRenderItem<Item>;
  keyExtractor: (item: Item, index: number) => string;
  numColumns: number;
};

export function MallaProductos<Item>({
  items,
  renderItem,
  keyExtractor,
  numColumns,
  ...flatListProps
}: MallaProductosProps<Item>) {
  return (
    <FlatList
      {...flatListProps}
      data={items}
      key={`grid-productos-columns-${numColumns}`}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      renderItem={renderItem}
    />
  );
}
