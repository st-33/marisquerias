import {
  RepositorioInventario,
  type AreaInventarioV2,
  type ItemInventarioV2,
  type SeccionInventarioId,
} from './inventario.repositorio';

export { RepositorioInventario };

export type AreaInventario = AreaInventarioV2;
export type InsumoInventario = ItemInventarioV2;
export type IdSeccionInventario = SeccionInventarioId;
