import { useRolePacker } from '../useRolePacker';
import { onValue, ref } from 'firebase/database';
import type { Database } from 'firebase/database';
import React from 'react';

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
}));

describe('useRolePacker — Autoridad Remota', () => {
  const dbMock = {} as Database;
  const tenantPath = 'marisquerias/el-arrecife';

  let effectCallback: (() => void | (() => void)) | undefined;
  let stateSetter: jest.Mock;
  let mockState: unknown = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockState = null;
    stateSetter = jest.fn((val: unknown | ((previous: unknown) => unknown)) => {
      mockState = typeof val === 'function' ? val(mockState) : val;
    });

    jest.spyOn(React, 'useEffect').mockImplementation((cb) => {
      effectCallback = cb;
    });

    let callCount = 0;
    jest.spyOn(React, 'useState').mockImplementation(((initial: unknown) => {
      // Very naive mock for this specific hook:
      // First call is config, second is loading, third is error.
      const isConfig = callCount % 3 === 0;
      const isLoading = callCount % 3 === 1;
      callCount++;

      if (isConfig) {
        return [mockState, stateSetter];
      }
      if (isLoading) {
        return [false, jest.fn()];
      }
      return [initial, jest.fn()];
    }) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('valida roles remotos y rechaza fallback local cuando RTDB devuelve null', () => {
    (ref as jest.Mock).mockReturnValue('mockRef');

    (onValue as jest.Mock).mockImplementation((ref, callback) => {
      callback({ val: () => null });
      return jest.fn();
    });

    const getRoles = useRolePacker({ db: dbMock, tenantPath }).getRolesHabilitados;

    // Simulate mount
    if (effectCallback) effectCallback();

    // Still empty since fallback was removed
    expect(getRoles()).toEqual([]);
  });

  it('carga roles desde RTDB correctamente', () => {
    (ref as jest.Mock).mockReturnValue('mockRef');

    (onValue as jest.Mock).mockImplementation((ref, callback) => {
      callback({
        val: () => ({
          roles: {
            mesero: true,
            cocina: false,
          },
        }),
      });
      return jest.fn();
    });

    // Simulate mount
    if (effectCallback) effectCallback();

    // Call getRoles after state has updated (simulated by mocking useState returns)
    // We need to re-render conceptually. Let's just call useRolePacker again to get the updated closure if needed.
    // In our simplistic mock, useRolePacker reads `mockState` through the first useState.

    // Mock the state as it would be after setConfig(configData)
    const { getRolesHabilitados } = useRolePacker({ db: dbMock, tenantPath });

    const rolesHabilitados = getRolesHabilitados();

    expect(rolesHabilitados.length).toBe(1);
    expect(rolesHabilitados[0].nombre).toBe('Mesero');
  });
});
