import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, type ThemeContextValue, useAppTheme } from '../ThemeContext';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Dimensions: { get: () => ({ width: 1280, height: 800 }) },
  Platform: { OS: 'web' },
  StyleSheet: { create: (styles: unknown) => styles },
  View: 'View',
  useWindowDimensions: () => ({ width: 1280, height: 800 }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

function ThemeProbe({ onContext }: { onContext: (context: ThemeContextValue) => void }) {
  const context = useAppTheme();

  useEffect(() => {
    onContext(context);
  }, [context, onContext]);

  return null;
}

describe('ThemeProvider — aislamiento por tenant', () => {
  const tenantMarisqueria = 'alimentos_y_bebidas/marisquerias/el-arrecife';
  const tenantRestaurante = 'alimentos_y_bebidas/restaurantes/la-barca';
  let renderer: ReactTestRenderer | undefined;
  let context: ThemeContextValue | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockImplementation(async (key: string) =>
      key === `@adi_theme_preference:${tenantMarisqueria}` ? 'elite' : null
    );
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    context = undefined;
  });

  it('lee la preferencia del tenant y escribe en su propia clave', async () => {
    const onContext = (value: ThemeContextValue) => {
      context = value;
    };

    await act(async () => {
      renderer = create(
        <ThemeProvider tenantPath={tenantMarisqueria}>
          <ThemeProbe onContext={onContext} />
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    expect(mockGetItem).toHaveBeenCalledWith(`@adi_theme_preference:${tenantMarisqueria}`);
    expect(context?.themeType).toBe('elite');
    expect(context?.categoryDefault).toBe('elite');

    act(() => {
      context?.setTheme('default');
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      `@adi_theme_preference:${tenantMarisqueria}`,
      'default'
    );
  });

  it('recarga la clave del nuevo tenant y no hereda la preferencia anterior', async () => {
    const onContext = (value: ThemeContextValue) => {
      context = value;
    };

    await act(async () => {
      renderer = create(
        <ThemeProvider tenantPath={tenantMarisqueria}>
          <ThemeProbe onContext={onContext} />
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      renderer?.update(
        <ThemeProvider tenantPath={tenantRestaurante}>
          <ThemeProbe onContext={onContext} />
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    expect(mockGetItem).toHaveBeenLastCalledWith(`@adi_theme_preference:${tenantRestaurante}`);
    expect(context?.themeType).toBe('default');
    expect(context?.categoryDefault).toBe('default');
  });
});
