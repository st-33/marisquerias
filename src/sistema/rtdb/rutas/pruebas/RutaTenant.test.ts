import { validarRutaTenant, descomponerRutaTenant } from '../RutaTenant';
import { ensureTenantBootstrap } from '../../../ciclo_de_vida/ensureTenant';
import { get, set } from 'firebase/database';
import type { Database } from 'firebase/database';

jest.mock('firebase/database', () => ({
  ref: jest.fn((db: unknown, path: string) => ({ db, path })),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../../monitoring', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RutaTenant — contrato de >= 2 segmentos', () => {
  const dbMock = {} as unknown as Database;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validarRutaTenant', () => {
    it('acepta rutas válidas de 2 o más segmentos', () => {
      expect(validarRutaTenant('marisquerias/el-arrecife')).toBe(true);
      expect(validarRutaTenant('nicho/marisquerias/__plantilla_base')).toBe(true);
      expect(validarRutaTenant('a/b/c/d/e')).toBe(true);
    });

    it('rechaza rutas con menos de 2 segmentos', () => {
      expect(validarRutaTenant('marisquerias')).toBe(false);
    });

    it('rechaza rutas legacy', () => {
      expect(validarRutaTenant('restaurantero/el-arrecife')).toBe(false);
    });

    it('rechaza valores vacíos o tipos inválidos', () => {
      expect(validarRutaTenant('')).toBe(false);
      expect(validarRutaTenant(null as unknown as string)).toBe(false);
    });
  });

  describe('descomponerRutaTenant', () => {
    it('descompone correctamente rutas de 2 segmentos', () => {
      const result = descomponerRutaTenant('marisquerias/el-arrecife');
      expect(result).toEqual({
        categoriaId: 'marisquerias',
        contextoPath: '',
        nichoId: 'marisquerias',
        tenantId: 'el-arrecife',
        tenantPath: 'marisquerias/el-arrecife',
        negocioBaseId: 'el-arrecife',
      });
    });

    it('descompone correctamente rutas de múltiples segmentos preservando contexto', () => {
      const result = descomponerRutaTenant('alimentos_y_bebidas/marisquerias/el-arrecife');
      expect(result).toEqual({
        categoriaId: 'marisquerias',
        contextoPath: 'alimentos_y_bebidas',
        nichoId: 'marisquerias',
        tenantId: 'el-arrecife',
        tenantPath: 'alimentos_y_bebidas/marisquerias/el-arrecife',
        negocioBaseId: 'el-arrecife',
      });
    });

    it('categoriaId y tenantId son siempre los dos últimos segmentos', () => {
      const result = descomponerRutaTenant('org/region/marisquerias/marisqueria-puerto-libres');
      expect(result?.categoriaId).toBe('marisquerias');
      expect(result?.tenantId).toBe('marisqueria-puerto-libres');
      expect(result?.contextoPath).toBe('org/region');
    });

    it('retorna null para rutas inválidas', () => {
      expect(descomponerRutaTenant('marisquerias')).toBe(null);
      expect(descomponerRutaTenant('restaurantero/el-arrecife')).toBe(null);
    });
  });

  describe('ensureTenantBootstrap', () => {
    it('inicializa mesas vacías y deshabilita mesero/cocina para categorías que no son alimentos preparados', async () => {
      const tenantPath = 'panaderias/el-trigal';

      const schemaSnap = { exists: () => false };
      const legacySnap = { exists: () => false };
      const polSnap = { exists: () => true };
      const mesasSnap = { exists: () => false };
      const repartUmbSnap = { exists: () => true };
      const repartHorSnap = { exists: () => true };
      const repartCosSnap = { exists: () => true };
      const pathsSnap = { exists: () => true };
      const carSnap = { exists: () => false };

      (get as jest.Mock)
        .mockResolvedValueOnce(schemaSnap)
        .mockResolvedValueOnce(legacySnap)
        .mockResolvedValueOnce(polSnap)
        .mockResolvedValueOnce(mesasSnap)
        .mockResolvedValueOnce(repartUmbSnap)
        .mockResolvedValueOnce(repartHorSnap)
        .mockResolvedValueOnce(repartCosSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(carSnap)
        .mockResolvedValueOnce({ exists: () => false });

      await ensureTenantBootstrap(dbMock, tenantPath);

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${tenantPath}/mesas` }),
        {}
      );

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${tenantPath}/caracteristicas` }),
        {
          roles: {
            mesero: false,
            cocina: false,
            admin: {
              dashboard: true,
              menu: true,
              inventario: true,
              mesas: false,
              dispositivos: true,
              repart: true,
            },
          },
          delivery: true,
          inventory_auto_discount: true,
        }
      );
    });

    it('inicializa mesas y habilita mesero/cocina para marisquerias (2 segmentos)', async () => {
      const tenantPath = 'marisquerias/el-arrecife';

      const schemaSnap = { exists: () => false };
      const legacySnap = { exists: () => false };
      const polSnap = { exists: () => true };
      const mesasSnap = { exists: () => false };
      const mesasLegacySnap = { exists: () => false };
      const repartUmbSnap = { exists: () => true };
      const repartHorSnap = { exists: () => true };
      const repartCosSnap = { exists: () => true };
      const pathsSnap = { exists: () => true };
      const carSnap = { exists: () => false };

      (get as jest.Mock)
        .mockResolvedValueOnce(schemaSnap)
        .mockResolvedValueOnce(legacySnap)
        .mockResolvedValueOnce(polSnap)
        .mockResolvedValueOnce(mesasSnap)
        .mockResolvedValueOnce(mesasLegacySnap)
        .mockResolvedValueOnce(repartUmbSnap)
        .mockResolvedValueOnce(repartHorSnap)
        .mockResolvedValueOnce(repartCosSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(carSnap)
        .mockResolvedValueOnce({ exists: () => false });

      await ensureTenantBootstrap(dbMock, tenantPath);

      expect(set).toHaveBeenCalledWith(expect.objectContaining({ path: `${tenantPath}/mesas` }), [
        null,
        { estado: 'libre', updatedAt: expect.any(Number) },
        { estado: 'libre', updatedAt: expect.any(Number) },
        { estado: 'libre', updatedAt: expect.any(Number) },
      ]);

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${tenantPath}/caracteristicas` }),
        {
          roles: {
            mesero: true,
            cocina: true,
            admin: {
              dashboard: true,
              menu: true,
              inventario: true,
              mesas: true,
              dispositivos: true,
              repart: false,
            },
          },
          delivery: false,
          inventory_auto_discount: false,
        }
      );
    });
  });
});
