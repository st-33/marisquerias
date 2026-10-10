import type { FabItem } from '../../sistema/tipos/contratos';

export function ejecutarAccionFab(item: FabItem): void {
  item.onPress?.();
}
