import {
  validar_ruta_negocio,
  descomponer_ruta_negocio,
  crear_ruta_negocio,
  extraer_negocio_id_canonico,
  es_ruta_legacy,
  validarRutaNegocio,
  descomponerRutaNegocio,
  crearRutaNegocio,
  resolver_nombre_negocio,
  resolverNombreNegocio,
  CAJONES_CANONICOS,
  resolverRutaCajon,
  rutaMenu,
  rutaInventario,
  rutaMesas,
  rutaMesasPendientes,
  rutaPedidos,
  rutaVentas,
  rutaRepartoAjustes,
  rutaTickets,
  rutaDispositivos,
  esCajonDormido,
  assertCajonActivo,
  registrarProveedorCajonesDormidos,
  RUTA_RAIZ_UNIDAD_OPERATIVA,
} from '../ruta_negocio';

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

    it('acepta la raíz de una Unidad Operativa independiente', () => {
      expect(validar_ruta_negocio(RUTA_RAIZ_UNIDAD_OPERATIVA)).toBe(true);
      expect(validarRutaNegocio(RUTA_RAIZ_UNIDAD_OPERATIVA)).toBe(true);
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
      expect(extraer_negocio_id_canonico('marisquerias/marisqueria-puerto-libres')).toBe(
        'puerto_libres'
      );
      expect(extraer_negocio_id_canonico('marisqueria-puerto-libres', 'marisquerias')).toBe(
        'puerto_libres'
      );
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

    it('representa la raíz operativa sin inventar contenedores RTDB', () => {
      expect(descomponer_ruta_negocio(RUTA_RAIZ_UNIDAD_OPERATIVA)).toMatchObject({
        ruta_negocio: '/',
        categoria_id: 'marisquerias',
        negocio_id: 'unidad_operativa',
      });
    });
  });

  describe('resolver_nombre_negocio', () => {
    it('retorna nombreConfig cuando está presente', () => {
      expect(
        resolver_nombre_negocio({
          nombreConfig: 'Marisquería Puerto Libres',
          negocioId: 'mpl',
        })
      ).toBe('Marisquería Puerto Libres');
    });

    it('resuelve mpl a Marisquería Puerto Libres', () => {
      expect(resolver_nombre_negocio({ negocioId: 'mpl' })).toBe('Marisquería Puerto Libres');
      expect(resolver_nombre_negocio({ rutaNegocio: 'marisquerias/mpl' })).toBe(
        'Marisquería Puerto Libres'
      );
      expect(resolver_nombre_negocio({ accessCode: 'MPL-01' })).toBe('Marisquería Puerto Libres');
      expect(resolver_nombre_negocio({ negocioId: 'marisqueria-puerto-libres' })).toBe(
        'Marisquería Puerto Libres'
      );
    });

    it('formatea negocios estándar y marisquerías correctamente', () => {
      expect(
        resolver_nombre_negocio({
          negocioId: 'el-arrecife',
          rutaNegocio: 'marisquerias/el-arrecife',
        })
      ).toBe('Marisquería El Arrecife');

      expect(
        resolver_nombre_negocio({
          negocioId: 'la-esquina-del-cafe',
          rutaNegocio: 'cafeterias/la-esquina-del-cafe',
        })
      ).toBe('La Esquina Del Cafe');
    });

    it('retorna Mi Negocio como fallback si no hay información', () => {
      expect(resolver_nombre_negocio({})).toBe('Mi Negocio');
      expect(resolverNombreNegocio({})).toBe('Mi Negocio');
    });

    it('funciona el alias crearRutaNegocio', () => {
      expect(
        crearRutaNegocio({
          categoria_id: 'marisquerias',
          negocio_id: 'el-arrecife',
        })
      ).toBe('marisquerias/el-arrecife');
    });
  });

  describe('Cajones canónicos db-rtdb-unidad', () => {
    const ruta = 'marisquerias/el-arrecife';

    it('incluye exactamente los 9 cajones canónicos', () => {
      expect(CAJONES_CANONICOS).toEqual([
        'menu',
        'inventario',
        'mesas',
        'mesas_pendientes',
        'pedidos',
        'ventas',
        'reparto_ajustes',
        'tickets',
        'dispositivos',
      ]);
    });

    it('resuelve correctamente las rutas de los 9 cajones', () => {
      expect(resolverRutaCajon(ruta, 'menu')).toBe(`${ruta}/menu`);
      expect(rutaMenu(ruta)).toBe(`${ruta}/menu`);
      expect(rutaMenu(ruta, 'productos')).toBe(`${ruta}/menu/productos`);
      expect(rutaInventario(ruta)).toBe(`${ruta}/inventario`);
      expect(rutaMesas(ruta)).toBe(`${ruta}/mesas`);
      expect(rutaMesasPendientes(ruta)).toBe(`${ruta}/mesas_pendientes`);
      expect(rutaPedidos(ruta)).toBe(`${ruta}/pedidos`);
      expect(rutaVentas(ruta)).toBe(`${ruta}/ventas`);
      expect(rutaRepartoAjustes(ruta)).toBe(`${ruta}/reparto_ajustes`);
      expect(rutaTickets(ruta)).toBe(`${ruta}/tickets`);
      expect(rutaDispositivos(ruta)).toBe(`${ruta}/dispositivos`);
    });

    it('resuelve los cajones directamente en la raíz de la Unidad Operativa', () => {
      expect(rutaMenu(RUTA_RAIZ_UNIDAD_OPERATIVA)).toBe('menu');
      expect(rutaPedidos(RUTA_RAIZ_UNIDAD_OPERATIVA, 'pedido-01')).toBe(
        'pedidos/pedido-01'
      );
      expect(rutaDispositivos(RUTA_RAIZ_UNIDAD_OPERATIVA)).toBe('dispositivos');
    });

    it('bloquea accesos a cajones dormidos con assertCajonActivo y resolverRutaCajon', () => {
      const dormidos = ['mesas', 'pedidos'] as const;

      expect(esCajonDormido('mesas', dormidos)).toBe(true);
      expect(esCajonDormido('menu', dormidos)).toBe(false);

      expect(() => assertCajonActivo('mesas', dormidos)).toThrow(/El cajón 'mesas' está dormido/);
      expect(() => resolverRutaCajon(ruta, 'mesas', undefined, dormidos)).toThrow(
        /El cajón 'mesas' está dormido/
      );

      // Si no está dormido, no lanza error
      expect(() => assertCajonActivo('menu', dormidos)).not.toThrow();
      expect(resolverRutaCajon(ruta, 'menu', undefined, dormidos)).toBe(`${ruta}/menu`);
    });

    it('soporta registrarProveedorCajonesDormidos para resolución global dinámica', () => {
      let mockDormidos: readonly string[] = ['tickets'];
      registrarProveedorCajonesDormidos(() => mockDormidos as any);

      expect(esCajonDormido('tickets')).toBe(true);
      expect(() => assertCajonActivo('tickets')).toThrow(/El cajón 'tickets' está dormido/);

      // Limpiar proveedor
      registrarProveedorCajonesDormidos(() => null);
      expect(esCajonDormido('tickets')).toBe(false);
      expect(() => assertCajonActivo('tickets')).not.toThrow();
    });

    it('bloquea cajón dormido con hidratacionCompleta === true y permite acceso si hidratacionCompleta === false', () => {
      const dormidos = ['pedidos'] as const;

      // 1. Con hidratacionCompleta === true (o por defecto), bloquea el cajón dormido
      expect(() => assertCajonActivo('pedidos', dormidos, { hidratacionCompleta: true })).toThrow(
        /El cajón 'pedidos' está dormido/
      );

      // 2. Con hidratacionCompleta === false, permite lecturas de bootstrap
      expect(() =>
        assertCajonActivo('pedidos', dormidos, { hidratacionCompleta: false })
      ).not.toThrow();
    });
  });
});
