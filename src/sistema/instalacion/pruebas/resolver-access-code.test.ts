import { get } from 'firebase/database';
import type { Database } from 'firebase/database';
import { resolverAccessCode, resolverNegocioPorCodigo } from '../vinculacion/resolver-access-code';

jest.mock('firebase/database', () => ({
  ref: jest.fn((db: unknown, path: string) => ({ db, path })),
  get: jest.fn(),
}));

describe('resolverAccessCode — Contrato Definitivo Unidad Secundaria', () => {
  const dbMock = {} as unknown as Database;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolverNegocioPorCodigo — Índice plano de código a ruta', () => {
    it('resuelve correctamente la ruta canónica de 4 segmentos del negocio en RTDB', async () => {
      (get as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        val: () => 'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01',
      });

      const res = await resolverNegocioPorCodigo('PUERTO-265316', dbMock);
      expect(res).toBe('comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01');
      expect(get).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'codigo_de_acceso/PUERTO-265316' })
      );
    });

    it('devuelve null si el código no existe', async () => {
      (get as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      });

      const res = await resolverNegocioPorCodigo('INEXISTENTE', dbMock);
      expect(res).toBeNull();
    });

    it('devuelve null con código vacío', async () => {
      const res = await resolverNegocioPorCodigo('   ', dbMock);
      expect(res).toBeNull();
      expect(get).not.toHaveBeenCalled();
    });

    it('rechaza valores que no sean cadena plana en codigo_de_acceso', async () => {
      (get as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        val: () => ({ ruta: 'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01' }),
      });

      await expect(resolverNegocioPorCodigo('OBJETO-INVALIDO', dbMock)).rejects.toThrow(
        'Estructura de ruta inválida o incompleta'
      );
    });
  });

  describe('Flujo completo: /codigo_de_acceso/{CODIGO} -> ruta -> configuración del negocio', () => {
    it('resuelve índice en cadena y obtiene capacidades_autorizadas y url_unidad sin requerir version_npb_origen', async () => {
      const rutaSecundaria = 'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-01';
      (get as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          val: () => rutaSecundaria,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            id: 'marisquerias-01',
            estado: 'activo',
            url_unidad: 'https://marisquerias-01-operativa.firebaseio.com',
            capacidades_autorizadas: {
              menu: true,
              control_mesas: true,
              inventario: false,
            },
          }),
        });

      const result = await resolverAccessCode(dbMock, 'PUERTO-265316');

      expect(result.rutaNegocio).toBe(rutaSecundaria);
      expect(result.categoriaId).toBe('marisquerias');
      expect(result.negocioId).toBe('marisquerias-01');
      expect(result.db_url_operativa).toBe('https://marisquerias-01-operativa.firebaseio.com');
      expect(result.negocio.capacidades_autorizadas).toEqual(['menu', 'control_mesas']);
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('falla antes de consultar RTDB cuando el código está vacío', async () => {
      await expect(resolverAccessCode(dbMock, '')).rejects.toThrow(
        'El código de acceso no puede estar vacío'
      );
      expect(get).not.toHaveBeenCalled();
    });

    it('falla cuando el código no existe en /codigo_de_acceso', async () => {
      (get as jest.Mock).mockResolvedValueOnce({ exists: () => false });

      await expect(resolverAccessCode(dbMock, 'FANTASMA-99')).rejects.toThrow(
        'Código de acceso no encontrado o inválido'
      );
    });

    it('rechaza rutas malformadas o legacy de menos de 4 segmentos', async () => {
      (get as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        val: () => 'marisquerias/puerto-libres',
      });

      await expect(resolverAccessCode(dbMock, 'LEGACY-01')).rejects.toThrow(
        'Estructura de ruta inválida o incompleta'
      );
    });

    it('rechaza negocio revocado o suspendido en su configuración secundaria', async () => {
      const rutaSecundaria = 'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-02';
      (get as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          val: () => rutaSecundaria,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            id: 'marisquerias-02',
            estado: 'revocado',
            url_unidad: 'https://marisquerias-02-operativa.firebaseio.com',
          }),
        });

      await expect(resolverAccessCode(dbMock, 'REVOCADO-01')).rejects.toThrow(/revocado/i);
    });

    it('rechaza negocio real sin url_unidad válida', async () => {
      const rutaSecundaria = 'comedores_y_servicios_de_mesa/marisquerias/negocio/marisquerias-03';
      (get as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          val: () => rutaSecundaria,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            id: 'marisquerias-03',
            estado: 'activo',
            url_unidad: '',
          }),
        });

      await expect(resolverAccessCode(dbMock, 'SIN-URL-01')).rejects.toThrow(
        'El negocio no tiene una Unidad Operativa válida'
      );
    });
  });
});
