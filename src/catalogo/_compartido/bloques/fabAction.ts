import type { FabItem } from '../../../plataforma/base/tipos/contratos';

export function ejecutarAccionFab(item: FabItem): void {
  item.onPress?.();
}
