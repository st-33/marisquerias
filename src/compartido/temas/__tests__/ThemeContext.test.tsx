import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, type ThemeContextValue, useAppTheme } from '../ThemeContext';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 1280, height: 800 }) },
  Platform: { OS: 'web' },
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

describe('ThemeProvider — aislamiento por negocio', () => {
  const negocioMarisqueria = 'alimentos_y_bebidas/marisquerias/el-arrecife';
  const negocioRestaurante = 'alimentos_y_bebidas/restaurantes/la-barca';
  let renderer: ReactTestRenderer | undefined;
  let context: ThemeContextValue | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockImplementation(async (key: string) =>
      key === `@adi_theme_preference:${negocioMarisqueria}` ? 'elite' : null
    );
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    context = undefined;
  });

  it('lee la preferencia del negocio y escribe en su propia clave', async () => {
    const onContext = (value: ThemeContextValue) => {
      context = value;
    };

    await act(async () => {
      renderer = create(
        <ThemeProvider rutaNegocio={negocioMarisqueria}>
          <ThemeProbe onContext={onContext} />
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    expect(mockGetItem).toHaveBeenCalledWith(`@adi_theme_preference:${negocioMarisqueria}`);
    expect(context?.themeType).toBe('elite');
    expect(context?.categoryDefault).toBe('elite');

    act(() => {
      context?.setTheme('default');
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      `@adi_theme_preference:${negocioMarisqueria}`,
      'default'
    );
  });

  it('recarga la clave del nuevo negocio y no hereda la preferencia anterior', async () => {
    const onContext = (value: ThemeContextValue) => {
      context = value;
    };

    await act(async () => {
      renderer = create(
        <ThemeProvider rutaNegocio={negocioMarisqueria}>
          <ThemeProbe onContext={onContext} />
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    await act(async () => {
      renderer?.update(
        <ThemeProvider rutaNegocio={negocioRestaurante}>
          <ThemeProbe onContext={onContext} />
        </ThemeProvider>
      );
      await Promise.resolve();
    });

    expect(mockGetItem).toHaveBeenLastCalledWith(`@adi_theme_preference:${negocioRestaurante}`);
    expect(context?.themeType).toBe('default');
    expect(context?.categoryDefault).toBe('default');
  });
});
