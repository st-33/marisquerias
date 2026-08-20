import fs from 'fs';
import path from 'path';
import React, { type ReactElement } from 'react';
import { InsigniaEstado } from '../InsigniaEstado';
import { TarjetaBase } from '../TarjetaBase';
import { EtiquetaPrecio } from '../EtiquetaPrecio';
import { ControlCantidad } from '../ControlCantidad';

jest.mock('react-native', () => ({
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  StyleSheet: {
    create: <T,>(styles: T) => styles,
  },
}));

interface PropsElementoPrueba {
  children?: React.ReactNode;
  [prop: string]: unknown;
}

type ElementoPrueba = ReactElement<PropsElementoPrueba>;

function obtenerHijos(elemento: ElementoPrueba): ElementoPrueba[] {
  return React.Children.toArray(elemento.props.children) as ElementoPrueba[];
}

function obtenerCallback(elemento: ElementoPrueba, prop: string): (...args: unknown[]) => unknown {
  const callback = elemento.props[prop];
  if (typeof callback !== 'function') {
    throw new Error(`Expected ${prop} to be a function`);
  }
  return callback as (...args: unknown[]) => unknown;
}

describe('Primitivos atómicos de catálogo', () => {
  test('TarjetaBase compone regiones, estilos, interacción y accesibilidad sin sombras forzadas', () => {
    const onPress = jest.fn();
    const style = { margin: 12 };
    const contentStyle = { padding: 20 };
    const tree = TarjetaBase({
      header: 'header',
      media: 'media',
      content: 'content',
      footer: 'footer',
      style,
      contentStyle,
      onPress,
      disabled: true,
      accessibilityLabel: 'Producto de catálogo',
      accessibilityHint: 'Abre el producto',
      accessibilityRole: 'button',
      testID: 'card-shell',
    }) as ElementoPrueba;

    expect(tree.type).toBe('Pressable');
    expect(tree.props.style).toEqual(expect.arrayContaining([style]));
    expect(tree.props.onPress).toBe(onPress);
    expect(tree.props.disabled).toBe(true);
    expect(tree.props.accessibilityLabel).toBe('Producto de catálogo');
    expect(tree.props.accessibilityHint).toBe('Abre el producto');
    expect(tree.props.accessibilityRole).toBe('button');
    expect(tree.props.accessibilityState).toEqual({ disabled: true });
    expect(tree.props.testID).toBe('card-shell');

    const [header, media, content, footer] = obtenerHijos(tree);
    expect(header.props.children).toBe('header');
    expect(media.props.children).toBe('media');
    expect(content.props.children).toBe('content');
    expect(content.props.style).toEqual(expect.arrayContaining([contentStyle]));
    expect(footer.props.children).toBe('footer');

    const estilosRaiz = tree.props.style as Record<string, unknown>[];
    expect(estilosRaiz).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          elevation: expect.anything(),
        }),
      ])
    );
    expect(estilosRaiz).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shadowColor: expect.anything(),
        }),
      ])
    );
  });

  test('TarjetaBase conserva el estilo táctil inyectado según pressed', () => {
    const tree = TarjetaBase({
      content: 'content',
      style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }),
    }) as ElementoPrueba;

    expect(tree.props.style).toEqual(expect.any(Function));
    expect(obtenerCallback(tree, 'style')({ pressed: false })).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
    );
    expect(obtenerCallback(tree, 'style')({ pressed: true })).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0.7 })])
    );
  });

  test('EtiquetaPrecio formatea únicamente el monto final con locale, currency o formatter inyectado', () => {
    const localeTree = EtiquetaPrecio({
      amount: 1234.5,
      locale: 'en-US',
      currency: 'USD',
      testID: 'price',
    }) as ElementoPrueba;
    expect(localeTree.props.children).toBe('$1,234.50');
    expect(localeTree.props.testID).toBe('price');

    const formatter = {
      format: jest.fn((amount: number) => `FINAL:${amount}`),
    };
    const injectedTree = EtiquetaPrecio({ amount: 87.25, formatter }) as ElementoPrueba;
    expect(injectedTree.props.children).toBe('FINAL:87.25');
    expect(formatter.format).toHaveBeenCalledWith(87.25);
  });

  test('ControlCantidad emite intenciones y expone estados y etiquetas accesibles', () => {
    const onIncrease = jest.fn();
    const onDecrease = jest.fn();
    const tree = ControlCantidad({
      value: 2,
      onIncrease,
      onDecrease,
      increaseAccessibilityLabel: 'Aumentar cantidad',
      decreaseAccessibilityLabel: 'Disminuir cantidad',
      valueAccessibilityLabel: 'Cantidad elegida',
      testID: 'quantity',
    }) as ElementoPrueba;

    const [decrease, value, increase] = obtenerHijos(tree);
    expect(decrease.props.accessibilityRole).toBe('button');
    expect(decrease.props.accessibilityLabel).toBe('Disminuir cantidad');
    expect(decrease.props.accessibilityState).toEqual({ disabled: false });
    expect(value.props.accessibilityLabel).toBe('Cantidad elegida');
    expect(value.props.accessibilityValue).toEqual({ now: 2, text: '2' });
    expect(increase.props.accessibilityRole).toBe('button');
    expect(increase.props.accessibilityLabel).toBe('Aumentar cantidad');
    expect(increase.props.accessibilityState).toEqual({ disabled: false });

    obtenerCallback(decrease, 'onPress')();
    obtenerCallback(increase, 'onPress')();
    expect(onDecrease).toHaveBeenCalledTimes(1);
    expect(onIncrease).toHaveBeenCalledTimes(1);
  });

  test('ControlCantidad no emite intenciones cuando el control correspondiente está bloqueado', () => {
    const onIncrease = jest.fn();
    const onDecrease = jest.fn();
    const tree = ControlCantidad({
      value: 0,
      onIncrease,
      onDecrease,
      canIncrease: false,
      canDecrease: true,
      disabled: true,
      increaseAccessibilityLabel: 'Aumentar cantidad',
      decreaseAccessibilityLabel: 'Disminuir cantidad',
    }) as ElementoPrueba;

    const [decrease, , increase] = obtenerHijos(tree);
    expect(decrease.props.disabled).toBe(true);
    expect(increase.props.disabled).toBe(true);
    expect(decrease.props.onPress).toBeUndefined();
    expect(increase.props.onPress).toBeUndefined();
    expect(onDecrease).not.toHaveBeenCalled();
    expect(onIncrease).not.toHaveBeenCalled();
  });

  test.each(['success', 'warning', 'info', 'neutral'] as const)(
    'InsigniaEstado presenta texto con variante explícita %s',
    (variant) => {
      const tree = InsigniaEstado({
        variant,
        text: 'Estado explícito',
        accessibilityLabel: `Estado ${variant}`,
        testID: `badge-${variant}`,
      }) as ElementoPrueba;

      expect(tree.props.accessibilityLabel).toBe(`Estado ${variant}`);
      expect(tree.props.testID).toBe(`badge-${variant}`);
      expect(obtenerHijos(tree)[0].props.children).toBe('Estado explícito');
    }
  );

  test('los primitivos no dependen de tenant, slots, Firebase ni reglas de negocio', () => {
    const archivos = ['TarjetaBase.tsx', 'EtiquetaPrecio.tsx', 'ControlCantidad.tsx', 'InsigniaEstado.tsx'];

    for (const archivo of archivos) {
      const fuente = fs.readFileSync(path.resolve(__dirname, '..', archivo), 'utf8');
      expect(fuente).not.toMatch(/firebase|zustand|ConfiguracionTenant|RenderizadorEspacio|slotRegistry/);
    }
  });
});
