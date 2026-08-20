import { useFeatureFlag } from '../../negocio/roles/FeatureManager';

// Mock del Zustand Store
jest.mock('../../sistema/store', () => {
  const state = {
    negocio: {
      features: {
        delivery: { enabled: true },
        inventario: {
          enabled: true,
          features: {
            alertas: {
              enabled: false,
              features: {
                bajoStock: { enabled: false },
              },
            },
          },
        },
      },
    },
  };
  return {
    useStore: jest.fn((selector) => selector(state)),
  };
});

describe('useFeatureFlag', () => {
  it('debe retornar true si la feature flag plana está habilitada', () => {
    const isDeliveryEnabled = useFeatureFlag('delivery');
    expect(isDeliveryEnabled).toBe(true);
  });

  it('debe retornar false si la feature flag anidada está deshabilitada', () => {
    const isAlertEnabled = useFeatureFlag('inventario.alertas.bajoStock');
    expect(isAlertEnabled).toBe(false);
  });

  it('debe retornar false por defecto si la feature flag no existe y no hay defaultValue', () => {
    const isNonExistentEnabled = useFeatureFlag('nonexistent.feature');
    expect(isNonExistentEnabled).toBe(false);
  });

  it('debe retornar el defaultValue si la feature flag no existe y se provee defaultValue', () => {
    const isNonExistentWithDefault = useFeatureFlag('nonexistent.feature', true);
    expect(isNonExistentWithDefault).toBe(true);
  });

  it('debe respetar el valor de la flag aunque sea false, ignorando el defaultValue', () => {
    const isAlertWithDefault = useFeatureFlag('inventario.alertas.bajoStock', true);
    expect(isAlertWithDefault).toBe(false);
  });
});
