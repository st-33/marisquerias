import { get } from 'firebase/database';
import type { Database } from 'firebase/database';
import { resolverAccessCode } from '../vinculacion/resolver-access-code';

jest.mock('firebase/database', () => ({
  ref: jest.fn((db: unknown, path: string) => ({ db, path })),
  get: jest.fn(),
}));

describe('resolverAccessCode — Fuente de verdad RTDB', () => {
  const dbMock = {} as unknown as Database;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Los cuatro códigos reales son resueltos por RTDB ──────────────────────
  describe('Prueba 1 — Los cuatro códigos reales delegan a RTDB', () => {
    const casos = [
      { code: 'ACC-ALIM-MARISCOS', path: 'marisquerias/__plantilla_base' },
      { code: 'ARRECIFE-24', path: 'marisquerias/el-arrecife' },
      { code: 'PERLA-24', path: 'marisquerias/marisqueria-la-perla-del-pueblo' },
      { code: 'PUERTO-24', path: 'marisquerias/marisqueria-puerto-libres' },
    ];

    it.each(casos)('$code -> $path (desde mock RTDB)', async ({ code, path }) => {
      (get as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        val: () => ({ tenantPath: path, estado: 'activo' }),
      });

      const result = await resolverAccessCode(dbMock, code);

      expect(result.tenantPath).toBe(path);
      expect(result.categoriaId).toBe('marisquerias');
      expect(result.estado).toBe('activo');
      // Confirmar que get fue llamado con la ruta del código — no hubo mapa local
      expect(get).toHaveBeenCalledTimes(1);
    });
  });

  // ── 2. Mutabilidad: si RTDB devuelve otra ruta válida, el resultado la sigue ─
  it('Prueba 2 — Mutabilidad: el resultado sigue exactamente la respuesta remota', async () => {
    // El mock devuelve una ruta completamente distinta a los ejemplos conocidos
    const rutaAlternativa = 'taquerias/taqueria-nueva-esperanza';
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({ tenantPath: rutaAlternativa, estado: 'activo' }),
    });

    const result = await resolverAccessCode(dbMock, 'PERLA-24');

    // El resultado es la ruta del mock, no un mapa local de PERLA-24
    expect(result.tenantPath).toBe(rutaAlternativa);
    expect(result.categoriaId).toBe('taquerias');
    expect(result.tenantId).toBe('taqueria-nueva-esperanza');
  });

  // ── 3. Código vacío ───────────────────────────────────────────────────────────
  it('Prueba 3 — Código vacío falla antes de consultar RTDB', async () => {
    await expect(resolverAccessCode(dbMock, '')).rejects.toThrow(
      'El código de acceso no puede estar vacío'
    );
    expect(get).not.toHaveBeenCalled();
  });

  // ── 4. Código inexistente en RTDB ────────────────────────────────────────────
  it('Prueba 4 — Código inexistente en RTDB falla sin crear sesión', async () => {
    (get as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await expect(resolverAccessCode(dbMock, 'FANTASMA-99')).rejects.toThrow(
      'Código de acceso no encontrado o inválido'
    );
  });

  // ── 5. Ruta remota malformada ─────────────────────────────────────────────────
  it('Prueba 5 — Ruta remota malformada falla sin crear sesión', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({ tenantPath: 'solo-un-segmento', estado: 'activo' }),
    });

    await expect(resolverAccessCode(dbMock, 'MAL-01')).rejects.toThrow(
      'Estructura de ruta inválida o incompleta'
    );
  });

  it('Prueba 5b — Ruta remota de tres segmentos es parseada correctamente', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => 'nicho/categoria/negocio',
    });

    const result = await resolverAccessCode(dbMock, 'GOOD-02');
    expect(result.categoriaId).toBe('categoria');
    expect(result.tenantId).toBe('negocio');
    expect(result.contextoPath).toBe('nicho');
  });

  it('Prueba 5c — Ruta legacy falla sin crear sesión', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => 'restaurantero/mi-negocio',
    });

    await expect(resolverAccessCode(dbMock, 'LEGACY-01')).rejects.toThrow(
      'El código de acceso apunta a una ruta obsoleta'
    );
  });

  // ── 6. Sesión válida persiste datos coherentes ────────────────────────────────
  it('Prueba 6 — Sesión válida contiene tenantPath, tenantId y categoriaId coherentes', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        tenantPath: 'marisquerias/marisqueria-la-perla-del-pueblo',
        estado: 'activo',
        maxUsos: 5,
        usosActuales: 1,
      }),
    });

    const result = await resolverAccessCode(dbMock, 'PERLA-24');

    expect(result.tenantPath).toBe('marisquerias/marisqueria-la-perla-del-pueblo');
    expect(result.tenantId).toBe('marisqueria-la-perla-del-pueblo');
    expect(result.categoriaId).toBe('marisquerias');
    expect(result.nichoId).toBe('marisquerias');
    expect(result.negocioBaseId).toBe('marisqueria-la-perla-del-pueblo');
    expect(result.estado).toBe('activo');
    expect(result.usosActuales).toBe(1);
  });

  // ── 7. Aislamiento: dos códigos diferentes producen sesiones diferentes ───────
  it('Prueba 7 — Dos códigos distintos producen rutas distintas y no se cruzan', async () => {
    (get as jest.Mock)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({ tenantPath: 'marisquerias/el-arrecife', estado: 'activo' }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({ tenantPath: 'marisquerias/marisqueria-puerto-libres', estado: 'activo' }),
      });

    const resultA = await resolverAccessCode(dbMock, 'ARRECIFE-24');
    const resultB = await resolverAccessCode(dbMock, 'PUERTO-24');

    expect(resultA.tenantPath).toBe('marisquerias/el-arrecife');
    expect(resultB.tenantPath).toBe('marisquerias/marisqueria-puerto-libres');
    expect(resultA.tenantId).not.toBe(resultB.tenantId);
    expect(resultA.tenantPath).not.toBe(resultB.tenantPath);
  });

  // ── 8. Sin hardcodeos: get siempre es invocado para cualquier código ──────────
  it('Prueba 8 — Para cualquier código, siempre se consulta RTDB (get invocado)', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({ tenantPath: 'marisquerias/el-arrecife', estado: 'activo' }),
    });

    await resolverAccessCode(dbMock, 'ARRECIFE-24');

    // Si existiera un mapa local, get no sería llamado para este código
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(expect.objectContaining({ path: 'access_codes/ARRECIFE-24' }));
  });

  // ── Validaciones de estado: conservadas ──────────────────────────────────────
  it('rechaza código revocado', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({ tenantPath: 'marisquerias/el-arrecife', estado: 'revocado' }),
    });
    await expect(resolverAccessCode(dbMock, 'REVOCADO-01')).rejects.toThrow('revocado');
  });

  it('rechaza código expirado por estado', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({ tenantPath: 'marisquerias/el-arrecife', estado: 'expirado' }),
    });
    await expect(resolverAccessCode(dbMock, 'EXPIRADO-01')).rejects.toThrow('expirado');
  });

  it('rechaza código expirado por timestamp', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        tenantPath: 'marisquerias/el-arrecife',
        estado: 'activo',
        expiraEn: Date.now() - 1000,
      }),
    });
    await expect(resolverAccessCode(dbMock, 'VIEJO-01')).rejects.toThrow('temporalmente');
  });

  it('rechaza código sin usos disponibles', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        tenantPath: 'marisquerias/el-arrecife',
        estado: 'activo',
        maxUsos: 3,
        usosActuales: 3,
      }),
    });
    await expect(resolverAccessCode(dbMock, 'AGOTADO-01')).rejects.toThrow('agotado');
  });

  it('acepta string plano como tenantPath desde RTDB', async () => {
    (get as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      val: () => 'marisquerias/puerto-libres',
    });

    const result = await resolverAccessCode(dbMock, 'CUALQUIER-CODIGO');

    expect(result.tenantPath).toBe('marisquerias/puerto-libres');
    expect(result.tenantId).toBe('puerto-libres');
  });
});
