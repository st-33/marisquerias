import React, { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react';

export interface SlotFallbackProps {
  slotId: string;
  error: Error;
}

export interface SlotErrorContext {
  slotId: string;
  componentStack: string | null;
}

export type SlotErrorHandler = (error: Error, context: SlotErrorContext) => void;

export interface SlotErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent: ComponentType<SlotFallbackProps>;
  onError?: SlotErrorHandler;
  resetKey?: unknown;
  slotId: string;
}

interface SlotErrorBoundaryState {
  error: Error | null;
  resetKey: unknown;
}

export class SlotErrorBoundary extends Component<SlotErrorBoundaryProps, SlotErrorBoundaryState> {
  state: SlotErrorBoundaryState = {
    error: null,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(error: Error): Partial<SlotErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: SlotErrorBoundaryProps,
    state: SlotErrorBoundaryState
  ): Partial<SlotErrorBoundaryState> | null {
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
