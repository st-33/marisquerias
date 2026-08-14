import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { RenderSlot } from '../RenderSlot';
import { defineSlotRegistry, resolveSlotOverride } from '../slotRegistry';
import { SlotErrorBoundary, type SlotFallbackProps } from '../SlotErrorBoundary';

interface DemoProps {
  label: string;
}

interface DemoSlots {
  tarjeta_producto: DemoProps;
}

function BaseComponent({ label }: DemoProps) {
  return React.createElement('slot-output', { testID: 'base' }, `base:${label}`);
}

function OverrideComponent({ label }: DemoProps) {
  return React.createElement('slot-output', { testID: 'override' }, `override:${label}`);
}

function FallbackComponent({ slotId, error }: SlotFallbackProps) {
  return React.createElement(
    'slot-fallback',
    { testID: 'fallback', slotId },
    `${slotId}:${error.message}`
  );
}

const registry = defineSlotRegistry<DemoSlots>()({
  tarjeta_producto: {
    panaderia_compacta: OverrideComponent,
  },
});

const ACT_ENVIRONMENT = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const actEnvironmentAnterior = ACT_ENVIRONMENT.IS_REACT_ACT_ENVIRONMENT;
ACT_ENVIRONMENT.IS_REACT_ACT_ENVIRONMENT = true;

let consoleErrorSpy: jest.SpyInstance;
const consoleErrorOriginal = console.error;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const mensaje = args.map(String).join(' ');
    const ruidoEsperado =
      mensaje.includes('react-test-renderer is deprecated') ||
      mensaje.includes('SLOT_TEST_ERROR') ||
      mensaje.includes('FallaEnConstructor') ||
      mensaje.includes('FallaEnRender') ||
      mensaje.includes('FallaEnLifecycle') ||
      mensaje.includes('ComponenteRecuperable');

    if (!ruidoEsperado) {
      consoleErrorOriginal(...args);
    }
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

afterAll(() => {
  ACT_ENVIRONMENT.IS_REACT_ACT_ENVIRONMENT = actEnvironmentAnterior;
});

describe('slotRegistry', () => {
  test('resuelve únicamente IDs string registrados en la allowlist local', () => {
    expect(resolveSlotOverride(registry, 'tarjeta_producto', 'panaderia_compacta')).toBe(
      OverrideComponent
    );
    expect(resolveSlotOverride(registry, 'tarjeta_producto', 'desconocida')).toBeUndefined();
    expect(resolveSlotOverride(registry, 'tarjeta_producto', null)).toBeUndefined();
    expect(resolveSlotOverride(registry, 'tarjeta_producto', 42)).toBeUndefined();
    expect(
      resolveSlotOverride(registry, 'tarjeta_producto', {
        module: 'panaderia_compacta',
      })
    ).toBeUndefined();
  });

  test('no contiene ejecución o carga dinámica basada en strings remotos', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '../slotRegistry.ts'), 'utf8');
    expect(fuente).not.toMatch(/\beval\s*\(/);
    expect(fuente).not.toMatch(/\brequire\s*\(/);
    expect(fuente).not.toMatch(/\bimport\s*\(/);
    expect(fuente).not.toMatch(/catalogo\/nichos|@nichos/);
  });
});

describe('RenderSlot', () => {
  test('renderiza el componente base cuando no recibe override', () => {
    let renderer: ReactTestRenderer | undefined;

    act(() => {
      renderer = create(
        <RenderSlot
          slotId="tarjeta_producto"
          baseComponent={BaseComponent}
          componentProps={{ label: 'demo' }}
          fallbackComponent={FallbackComponent}
        />
      );
    });

    expect(renderer!.root.findByProps({ testID: 'base' }).children).toEqual(['base:demo']);

    act(() => renderer!.unmount());
  });

  test('prefiere el override inyectado sobre el componente base', () => {
    let renderer: ReactTestRenderer | undefined;

    act(() => {
      renderer = create(
        <RenderSlot
          slotId="tarjeta_producto"
          baseComponent={BaseComponent}
          overrideComponent={OverrideComponent}
          componentProps={{ label: 'demo' }}
          fallbackComponent={FallbackComponent}
        />
      );
    });

    expect(renderer!.root.findAllByProps({ testID: 'base' })).toHaveLength(0);
    expect(renderer!.root.findByProps({ testID: 'override' }).children).toEqual(['override:demo']);

    act(() => renderer!.unmount());
  });
});

describe('SlotErrorBoundary', () => {
  class FallaEnConstructor extends React.Component {
    constructor(props: object) {
      super(props);
      throw new Error('SLOT_TEST_ERROR:constructor');
    }

    render() {
      return null;
    }
  }

  function FallaEnRender(): never {
    throw new Error('SLOT_TEST_ERROR:render');
  }

  class FallaEnLifecycle extends React.Component {
    componentDidMount() {
      throw new Error('SLOT_TEST_ERROR:lifecycle');
    }

    render() {
      return React.createElement('slot-output', { testID: 'antes-del-error' });
    }
  }

  test.each([
    ['constructor', FallaEnConstructor],
    ['render', FallaEnRender],
    ['lifecycle', FallaEnLifecycle],
  ])('captura errores de %s, registra slotId, ejecuta onError y muestra fallback', (_, Falla) => {
    const onError = jest.fn();
    let renderer: ReactTestRenderer | undefined;

    act(() => {
      renderer = create(
        <SlotErrorBoundary
          slotId="tarjeta_producto"
          fallbackComponent={FallbackComponent}
          onError={onError}
          resetKey="version-1"
        >
          <Falla />
        </SlotErrorBoundary>
      );
    });

    const fallback = renderer!.root.findByProps({ testID: 'fallback' });
    expect(fallback.props.slotId).toBe('tarjeta_producto');
    expect(fallback.children.join('')).toContain('SLOT_TEST_ERROR');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        slotId: 'tarjeta_producto',
        componentStack: expect.any(String),
      })
    );

    act(() => renderer!.unmount());
  });

  test('mantiene visible el fallback cuando el reportero lanza una excepción', () => {
    const onError = jest.fn(() => {
      throw new Error('REPORTER_ERROR');
    });
    let renderer: ReactTestRenderer | undefined;

    act(() => {
      renderer = create(
        <SlotErrorBoundary
          slotId="tarjeta_producto"
          fallbackComponent={FallbackComponent}
          onError={onError}
        >
          <FallaEnRender />
        </SlotErrorBoundary>
      );
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(renderer!.root.findByProps({ testID: 'fallback' })).toBeDefined();

    act(() => renderer!.unmount());
  });

  test('se recupera cuando cambia resetKey', () => {
    let debeFallar = true;

    function ComponenteRecuperable() {
      if (debeFallar) {
        throw new Error('SLOT_TEST_ERROR:recuperable');
      }
      return React.createElement('slot-output', { testID: 'recuperado' }, 'recuperado');
    }

    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <SlotErrorBoundary
          slotId="tarjeta_producto"
          fallbackComponent={FallbackComponent}
          resetKey="version-1"
        >
          <ComponenteRecuperable />
        </SlotErrorBoundary>
      );
    });
    expect(renderer!.root.findByProps({ testID: 'fallback' })).toBeDefined();

    debeFallar = false;
    act(() => {
      renderer!.update(
        <SlotErrorBoundary
          slotId="tarjeta_producto"
          fallbackComponent={FallbackComponent}
          resetKey="version-2"
        >
          <ComponenteRecuperable />
        </SlotErrorBoundary>
      );
    });

    expect(renderer!.root.findAllByProps({ testID: 'fallback' })).toHaveLength(0);
    expect(renderer!.root.findByProps({ testID: 'recuperado' }).children).toEqual(['recuperado']);

    act(() => renderer!.unmount());
  });
});
