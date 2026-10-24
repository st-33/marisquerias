import type { Database } from 'firebase/database';
import { get, push, set, update } from 'firebase/database';
import { RepositorioMenu } from '../menu.repositorio';

jest.mock('firebase/database', () => ({
  get: jest.fn(),
  off: jest.fn(),
  onValue: jest.fn(),
  push: jest.fn(),
  ref: jest.fn((db, path) => ({ db, path })),
  remove: jest.fn(),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
}));

const dbMock = {} as Database;
const rutaNegocio = '2 alimentos_y_bebidas/marisquerias/puerto-libres';
const snapshot = (value: unknown) => ({ val: () => value, exists: () => value != null });

describe('RepositorioMenu — payloads compatibles con RTDB', () => {
  const mockGet = get as jest.Mock;
  const mockPush = push as jest.Mock;
  const mockSet = set as jest.Mock;
  const mockUpdate = update as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(snapshot({}));
    mockPush.mockReturnValue({ key: 'producto-1' });
  });

  test('elimina undefined anidados al crear un producto con variantes', async () => {
    const repo = new RepositorioMenu(dbMock, rutaNegocio);

    await repo.crearProducto({
      nombre: 'Cóctel de camarón',
      precio: 120,
      categoriaId: 'mariscos',
      variantes: {
        grupos: {
          tamano: {
            titulo: 'Tamaño',
            tipo: 'single',
            opciones: {
              chico: {
                titulo: 'Chico',
                triggers: { showGroups: undefined, hideGroups: undefined },
              },
            },
            nextGroupId: undefined,
          },
        },
      },
      usarConfigPersonalizada: undefined,
    });

    expect(mockSet).toHaveBeenCalledTimes(2);
    const payload = mockSet.mock.calls[0][1];
    expect(payload).toEqual({
      nombre: 'Cóctel de camarón',
      precio: 120,
      categoriaId: 'mariscos',
      slug: 'coctel-de-camaron',
      variantes: {
        grupos: {
          tamano: {
            titulo: 'Tamaño',
            tipo: 'single',
            opciones: { chico: { titulo: 'Chico', triggers: {} } },
          },
        },
      },
    });
  });

  test('elimina undefined anidados al actualizar un producto', async () => {
    const repo = new RepositorioMenu(dbMock, rutaNegocio);
    mockGet.mockResolvedValue(snapshot({ nombre: 'Cóctel', categoriaId: 'mariscos', precio: 120 }));

    await repo.actualizarProducto('producto-1', {
      variantes: {
        grupos: {
          tamano: {
            titulo: 'Tamaño',
            tipo: 'single',
            opciones: { grande: { titulo: 'Grande', delta: 50 } },
            excludeFromSibling: undefined,
          },
        },
      },
      enviarACocina: undefined,
    });

    expect(mockUpdate).toHaveBeenCalledWith(expect.anything(), {
      variantes: {
        grupos: {
          tamano: {
            titulo: 'Tamaño',
            tipo: 'single',
            opciones: { grande: { titulo: 'Grande', delta: 50 } },
          },
        },
      },
    });
  });
});
