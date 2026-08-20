import React, { type ComponentType } from 'react';
import {
  LimiteErrorEspacio,
  type ManejadorErrorEspacio,
  type PropsAlternativaEspacio,
} from './LimiteErrorEspacio';

export interface PropsRenderizadorEspacio<ComponentProps extends object> {
  slotId: string;
  baseComponent: ComponentType<ComponentProps>;
  overrideComponent?: ComponentType<ComponentProps> | null;
  fallbackComponent: ComponentType<PropsAlternativaEspacio>;
  componentProps: ComponentProps;
  onError?: ManejadorErrorEspacio;
  resetKey?: unknown;
}

export function RenderizadorEspacio<ComponentProps extends object>({
  slotId,
  baseComponent,
  overrideComponent,
  fallbackComponent,
  componentProps,
  onError,
  resetKey,
}: PropsRenderizadorEspacio<ComponentProps>) {
  const ComponenteSeleccionado = overrideComponent ?? baseComponent;

  return (
    <LimiteErrorEspacio
      fallbackComponent={fallbackComponent}
      onError={onError}
      resetKey={resetKey ?? ComponenteSeleccionado}
      slotId={slotId}
    >
      <ComponenteSeleccionado {...componentProps} />
    </LimiteErrorEspacio>
  );
}
