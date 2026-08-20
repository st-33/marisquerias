import {
  InventoryV2Repository,
  type InventoryAreaV2,
  type InventoryItemV2,
  type InventorySectionId,
} from '../../../../sistema/persistencia/inventory.v2.repo';

export { InventoryV2Repository as RepositorioInventario };

export type AreaInventario = InventoryAreaV2;
export type InsumoInventario = InventoryItemV2;
export type IdSeccionInventario = InventorySectionId;
