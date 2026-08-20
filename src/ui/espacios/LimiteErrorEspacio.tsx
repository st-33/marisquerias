import React, { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react';

export interface PropsAlternativaEspacio {
  slotId: string;
  error: Error;
}

export interface ContextoErrorEspacio {
  slotId: string;
  componentStack: string | null;
}

export type ManejadorErrorEspacio = (error: Error, context: ContextoErrorEspacio) => void;

export interface PropsLimiteErrorEspacio {
  children: ReactNode;
  fallbackComponent: ComponentType<PropsAlternativaEspacio>;
  onError?: ManejadorErrorEspacio;
  resetKey?: unknown;
  slotId: string;
}

interface EstadoLimiteErrorEspacio {
  error: Error | null;
  resetKey: unknown;
}

export class LimiteErrorEspacio extends Component<PropsLimiteErrorEspacio, EstadoLimiteErrorEspacio> {
  state: EstadoLimiteErrorEspacio = {
    error: null,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(error: Error): Partial<EstadoLimiteErrorEspacio> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: PropsLimiteErrorEspacio,
    state: EstadoLimiteErrorEspacio
  ): Partial<EstadoLimiteErrorEspacio> | null {
    if (!Object.is(props.resetKey, state.resetKey)) {
      return {
        error: null,
        resetKey: props.resetKey,
      };
    }

    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      this.props.onError?.(error, {
        slotId: this.props.slotId,
        componentStack: info.componentStack ?? null,
      });
    } catch {
      // El reportero es observabilidad auxiliar: nunca debe ocultar el fallback seguro.
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      const FallbackComponent = this.props.fallbackComponent;
      return <FallbackComponent error={this.state.error} slotId={this.props.slotId} />;
    }

    return this.props.children;
  }
}
