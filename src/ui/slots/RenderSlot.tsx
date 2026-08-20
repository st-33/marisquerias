import React, { type ComponentType } from 'react';
import {
  SlotErrorBoundary,
  type SlotErrorHandler,
  type SlotFallbackProps,
} from './SlotErrorBoundary';

export interface RenderSlotProps<ComponentProps extends object> {
  slotId: string;
  baseComponent: ComponentType<ComponentProps>;
  overrideComponent?: ComponentType<ComponentProps> | null;
  fallbackComponent: ComponentType<SlotFallbackProps>;
  componentProps: ComponentProps;
  onError?: SlotErrorHandler;
  resetKey?: unknown;
}

export function RenderSlot<ComponentProps extends object>({
  slotId,
  baseComponent,
  overrideComponent,
  fallbackComponent,
  componentProps,
  onError,
  resetKey,
}: RenderSlotProps<ComponentProps>) {
  const ComponenteSeleccionado = overrideComponent ?? baseComponent;

  return (
    <SlotErrorBoundary
      fallbackComponent={fallbackComponent}
      onError={onError}
      resetKey={resetKey ?? ComponenteSeleccionado}
      slotId={slotId}
    >
      <ComponenteSeleccionado {...componentProps} />
    </SlotErrorBoundary>
  );
}
