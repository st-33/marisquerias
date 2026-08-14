import React from 'react';
import { FlatList, type FlatListProps, type ListRenderItem } from 'react-native';

export type GridCatalogoProps<Item> = Omit<
  FlatListProps<Item>,
  'data' | 'renderItem' | 'keyExtractor' | 'numColumns'
> & {
  items: readonly Item[];
  renderItem: ListRenderItem<Item>;
  keyExtractor: (item: Item, index: number) => string;
  numColumns: number;
};

export function GridCatalogo<Item>({
  items,
  renderItem,
  keyExtractor,
  numColumns,
  ...flatListProps
}: GridCatalogoProps<Item>) {
  return (
    <FlatList
      {...flatListProps}
      data={items}
      key={`grid-catalogo-columns-${numColumns}`}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      renderItem={renderItem}
    />
  );
}
