import {
  validar_ruta_negocio,
  descomponer_ruta_negocio,
  crear_ruta_negocio,
  extraer_negocio_id_canonico,
  es_ruta_legacy,
  validarRutaNegocio,
  descomponerRutaNegocio,
  crearRutaNegocio,
} from '../ruta_negocio';
import { ensureNegocioBootstrap } from '../../../ciclo_de_vida/ensureNegocio';
import { get, set } from 'firebase/database';
import type { Database } from 'firebase/database';

jest.mock('firebase/database', () => ({
  ref: jest.fn((db: unknown, path: string) => ({ db, path })),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../../monitoreo', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ruta_negocio — contrato canónico de >= 2 segmentos', () => {
  const dbMock = {} as unknown as Database;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validar_ruta_negocio', () => {
    it('acepta rutas válidas de 2 o más segmentos', () => {
      expect(validar_ruta_negocio('marisquerias/el-arrecife')).toBe(true);
      expect(validar_ruta_negocio('nicho/marisquerias/__plantilla_base')).toBe(true);
      expect(validar_ruta_negocio('a/b/c/d/e')).toBe(true);
      expect(validarRutaNegocio('marisquerias/el-arrecife')).toBe(true);
    });

    it('rechaza rutas con menos de 2 segmentos', () => {
      expect(validar_ruta_negocio('marisquerias')).toBe(false);
      expect(validarRutaNegocio('marisquerias')).toBe(false);
    });

    it('rechaza rutas legacy', () => {
      expect(validar_ruta_negocio('restaurantero/el-arrecife')).toBe(false);
      expect(validarRutaNegocio('restaurantero/el-arrecife')).toBe(false);
      expect(es_ruta_legacy('restaurantero/el-arrecife')).toBe(true);
      expect(es_ruta_legacy('marisquerias/el-arrecife')).toBe(false);
    });

    it('rechaza valores vacíos o tipos inválidos', () => {
      expect(validar_ruta_negocio('')).toBe(false);
      expect(validar_ruta_negocio(null as unknown as string)).toBe(false);
      expect(validar_ruta_negocio(undefined as unknown as string)).toBe(false);
    });
  });

  describe('crear_ruta_negocio', () => {
    it('construye ruta canónica de 2 segmentos', () => {
      expect(
        crear_ruta_negocio({
          categoria_id: 'marisquerias',
          negocio_id: 'el-arrecife',
        })
      ).toBe('marisquerias/el-arrecife');
    });

    it('construye ruta con contexto superior', () => {
      expect(
        crear_ruta_negocio({
          contexto_path: 'alimentos_y_bebidas',
          categoria_id: 'marisquerias',
          negocio_id: 'el-arrecife',
        })
      ).toBe('alimentos_y_bebidas/marisquerias/el-arrecife');
    });
  });

  describe('extraer_negocio_id_canonico', () => {
    it('extrae y aisla puerto_libres a partir de marisqueria-puerto-libres', () => {
      expect(extraer_negocio_id_canonico('marisquerias/marisqueria-puerto-libres')).toBe('puerto_libres');
      expect(extraer_negocio_id_canonico('marisqueria-puerto-libres', 'marisquerias')).toBe('puerto_libres');
    });

    it('normaliza guiones a snake_case y conserva ids simples', () => {
      expect(extraer_negocio_id_canonico('el-arrecife', 'marisquerias')).toBe('el_arrecife');
      expect(extraer_negocio_id_canonico('marisquerias/puerto-libres')).toBe('puerto_libres');
    });
  });

  describe('descomponer_ruta_negocio', () => {
    it('descompone correctamente rutas de 2 segmentos con identidad canónica', () => {
      const result = descomponer_ruta_negocio('marisquerias/el-arrecife');
      expect(result).toEqual({
        ruta_negocio: 'marisquerias/el-arrecife',
        negocio_id: 'el-arrecife',
        categoria_id: 'marisquerias',
        contexto_path: '',
        rutaNegocio: 'marisquerias/el-arrecife',
        negocioId: 'el-arrecife',
        categoriaId: 'marisquerias',
        contextoPath: '',
        nichoId: 'marisquerias',
        negocioBaseId: 'el-arrecife',
        negocio_id_canonico: 'el_arrecife',
        negocioIdCanonico: 'el_arrecife',
      });
    });

    it('descompone correctamente rutas de múltiples segmentos preservando contexto', () => {
      const result = descomponer_ruta_negocio('alimentos_y_bebidas/marisquerias/el-arrecife');
      expect(result).toEqual({
        ruta_negocio: 'alimentos_y_bebidas/marisquerias/el-arrecife',
        negocio_id: 'el-arrecife',
        categoria_id: 'marisquerias',
        contexto_path: 'alimentos_y_bebidas',
        rutaNegocio: 'alimentos_y_bebidas/marisquerias/el-arrecife',
        negocioId: 'el-arrecife',
        categoriaId: 'marisquerias',
        contextoPath: 'alimentos_y_bebidas',
        nichoId: 'marisquerias',
        negocioBaseId: 'el-arrecife',
        negocio_id_canonico: 'el_arrecife',
        negocioIdCanonico: 'el_arrecife',
      });
    });

    it('categoria_id y negocio_id son siempre los dos últimos segmentos y deriva negocio_id_canonico', () => {
      const result = descomponer_ruta_negocio('org/region/marisquerias/marisqueria-puerto-libres');
      expect(result?.categoria_id).toBe('marisquerias');
      expect(result?.negocio_id).toBe('marisqueria-puerto-libres');
      expect(result?.negocio_id_canonico).toBe('puerto_libres');
      expect(result?.contexto_path).toBe('org/region');
    });

    it('retorna null para rutas inválidas', () => {
      expect(descomponer_ruta_negocio('marisquerias')).toBe(null);
      expect(descomponer_ruta_negocio('restaurantero/el-arrecife')).toBe(null);
      expect(descomponerRutaNegocio('marisquerias')).toBe(null);
    });
  });

  describe('ensureNegocioBootstrap', () => {
    it('inicializa mesas vacías y deshabilita mesero/cocina para categorías que no son alimentos preparados', async () => {
      const rutaNegocio = 'panaderias/el-trigal';

      const polSnap = { exists: () => true };
      const mesasSnap = { exists: () => false };
      const repartUmbSnap = { exists: () => true };
      const repartHorSnap = { exists: () => true };
      const pathsSnap = { exists: () => true };
      const carSnap = { exists: () => false };

      (get as jest.Mock)
        .mockResolvedValueOnce(polSnap)
        .mockResolvedValueOnce(mesasSnap)
        .mockResolvedValueOnce(repartUmbSnap)
        .mockResolvedValueOnce(repartHorSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(carSnap)
        .mockResolvedValueOnce({ exists: () => false });

      await ensureNegocioBootstrap(dbMock, rutaNegocio);

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${rutaNegocio}/mesas` }),
        {}
      );

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${rutaNegocio}/caracteristicas` }),
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
      const rutaNegocio = 'marisquerias/el-arrecife';

      const polSnap = { exists: () => true };
      const mesasSnap = { exists: () => false };
      const mesasLegacySnap = { exists: () => false };
      const repartUmbSnap = { exists: () => true };
      const repartHorSnap = { exists: () => true };
      const pathsSnap = { exists: () => true };
      const carSnap = { exists: () => false };

      (get as jest.Mock)
        .mockResolvedValueOnce(polSnap)
        .mockResolvedValueOnce(mesasSnap)
        .mockResolvedValueOnce(mesasLegacySnap)
        .mockResolvedValueOnce(repartUmbSnap)
        .mockResolvedValueOnce(repartHorSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(pathsSnap)
        .mockResolvedValueOnce(carSnap)
        .mockResolvedValueOnce({ exists: () => false });

      await ensureNegocioBootstrap(dbMock, rutaNegocio);

      expect(set).toHaveBeenCalledWith(expect.objectContaining({ path: `${rutaNegocio}/mesas` }), {
        '1': { estado: 'libre', updatedAt: expect.any(Number) },
        '2': { estado: 'libre', updatedAt: expect.any(Number) },
        '3': { estado: 'libre', updatedAt: expect.any(Number) },
      });

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ path: `${rutaNegocio}/caracteristicas` }),
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
