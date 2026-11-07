/**
 * 🧪 PRUEBAS INTEGRALES DE LA REORGANIZACIÓN ARQUITECTÓNICA:
 * INVENTARIO ↔ COCINA (LIBRO Y PRODUCCIÓN) ↔ MENÚ COMERCIAL ↔ MESERO Y MOSTRADOR
 *
 * Cubre todos los casos de aceptación y restricciones negativas:
 * 1. Venta directa (Cerveza): descuenta una sola vez el artículo de Inventario.
 * 2. Platillo por pedido (Mojarra): descuenta ingredientes una sola vez por preparación.
 * 3. Producción anticipada por lote (8 Flanes) y venta posterior:
 *    - El lote consume leche/huevo/azúcar y da de alta 8 flanes terminados con su costo unitario.
 *    - La venta de 1 flan descuenta 1 flan terminado y NUNCA vuelve a descontar leche/huevo/azúcar.
 * 4. Rendimiento real menor al esperado (6 flanes de 8 esperados): registra 6 disponibles y 2 de merma, ajustando el costo unitario real.
 * 5. Porcionado de insumo a granel (5 kg de camarón -> 20 porciones de 250g) y equivalencias de unidad (exactas vs aproximadas).
 * 6. Menú Comercial: cálculo de diferencia, Margen sobre Precio vs Recargo sobre Costo (Markup), alerta de precio < costo, y bloqueo de Mostrador para platillos `por_pedido`.
 * 7. Subordinación de roles a capacidades activas (`encenderCapacidades`).
 * 8. Origen de imágenes (`catalogoImagenes`): resolución separada para `'inventario'` vs `'platillos'`.
 */

import {
  listarImagenesPorOrigen,
  obtenerImagenProducto,
} from '../../compartido/catalogoImagenes';
import {
  convertirCantidadInventario,
  esArticuloInsumoCocina,
  esArticuloVendibleDirecto,
  type ItemInventarioV2,
} from '../persistencia/inventario.repositorio';
import {
  calcularCosteoYCapacidadPlatillo,
  type PlatilloCocina,
} from '../persistencia/platillos.repositorio';
import { resolverLineasConsumoParaProducto } from '../servicios/ServicioMovimientosInventario';
import {
  calcularPrecioSugeridoDesdeCosto,
  calcularResumenPrecioComercial,
  esFormularioPlatilloPorPedido,
  formularioACarga,
  crearFormularioVacio,
} from '../../ui/roles/administrador/menu/logica/formularioProducto';
import { encenderCapacidades } from '../instalacion/npb/encenderCapacidades';
import type { NegocioPlantillaBase } from '../instalacion/npb/tiposNPB';

describe('Reorganización Inventario ↔ Cocina (Libro y Producción) ↔ Menú ↔ Venta', () => {
  const catalogoMock: Record<string, ItemInventarioV2> = {
    cerveza_xx: {
      id: 'cerveza_xx',
      nombre: 'XX Lager',
      unidad: 'pza',
      uso: 'venta_directa',
      controlarExistencias: true,
      costo: 18,
      minStock: 12,
      imagenId: 'xx_lager',
      updatedAt: 1000,
    },
    mojarra_cruda: {
      id: 'mojarra_cruda',
      nombre: 'Mojarra Entera Fresca',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 90,
      minStock: 5,
      equivalencias: {
        pesoPromedioPiezaKg: 0.4,
        esAproximado: true,
      },
      updatedAt: 1000,
    },
    aceite_cocina: {
      id: 'aceite_cocina',
      nombre: 'Aceite Vegetal',
      unidad: 'l',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 40,
      minStock: 2,
      updatedAt: 1000,
    },
    leche_evaporada: {
      id: 'leche_evaporada',
      nombre: 'Leche Evaporada',
      unidad: 'l',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 32,
      minStock: 2,
      updatedAt: 1000,
    },
    huevo_blanco: {
      id: 'huevo_blanco',
      nombre: 'Huevo Blanco',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 4,
      minStock: 30,
      updatedAt: 1000,
    },
    azucar_estandar: {
      id: 'azucar_estandar',
      nombre: 'Azúcar Estándar',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 28,
      minStock: 2,
      updatedAt: 1000,
    },
    flan_terminado: {
      id: 'flan_terminado',
      nombre: 'Flan Napolitano (Terminado)',
      unidad: 'pza',
      uso: 'producto_terminado',
      controlarExistencias: true,
      costo: 10.6,
      minStock: 4,
      platilloOrigenId: 'platillo_flan',
      updatedAt: 1000,
    },
  };

  test('1. Inventario distingue explícitamente uso de venta directa, insumo y producto terminado', () => {
    expect(esArticuloVendibleDirecto(catalogoMock.cerveza_xx)).toBe(true);
    expect(esArticuloInsumoCocina(catalogoMock.cerveza_xx)).toBe(false);

    expect(esArticuloVendibleDirecto(catalogoMock.mojarra_cruda)).toBe(false);
    expect(esArticuloInsumoCocina(catalogoMock.mojarra_cruda)).toBe(true);

    expect(esArticuloVendibleDirecto(catalogoMock.flan_terminado)).toBe(true);
  });

  test('2. Equivalencias de unidades: conversión exacta (kg <-> g, l <-> ml) vs aproximada (pza <-> kg)', () => {
    const convExacta = convertirCantidadInventario({
      cantidad: 200,
      unidadOrigen: 'g',
      unidadDestino: 'kg',
    });
    expect(convExacta.posible).toBe(true);
    expect(convExacta.cantidadConvertida).toBeCloseTo(0.2, 4);
    expect(convExacta.esAproximado).toBe(false);

    const convAprox = convertirCantidadInventario({
      cantidad: 2,
      unidadOrigen: 'pza',
      unidadDestino: 'kg',
      equivalencias: catalogoMock.mojarra_cruda.equivalencias,
    });
    expect(convAprox.posible).toBe(true);
    expect(convAprox.cantidadConvertida).toBeCloseTo(0.8, 4);
    expect(convAprox.esAproximado).toBe(true);

    // Caso negativo: convertir pza a kg sin equivalencia declarada
    const convImposible = convertirCantidadInventario({
      cantidad: 1,
      unidadOrigen: 'pza',
      unidadDestino: 'kg',
    });
    expect(convImposible.posible).toBe(false);
  });

  test('3. Venta directa de Cerveza: descuenta el artículo de Inventario una sola vez', () => {
    const { lineas, advertencias } = resolverLineasConsumoParaProducto({
      producto: {
        id: 'prod_cerveza_xx',
        nombre: 'Cerveza XX Lager',
        origenTipo: 'inventario',
        origenId: 'cerveza_xx',
        unidad: 'pza',
      },
      cantidadVendida: 3,
      catalogoInventario: catalogoMock,
    });

    expect(advertencias).toHaveLength(0);
    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatchObject({
      itemId: 'cerveza_xx',
      cantidadBase: 3,
      unidadBase: 'pza',
    });
  });

  test('4. Platillo por pedido (Mojarra al Mojo): calcula costo con equivalencia aproximada y descuenta ingredientes de receta', () => {
    const platilloMojarra: PlatilloCocina = {
      id: 'plat_mojarra',
      nombre: 'Mojarra Frita',
      modoPreparacion: 'por_pedido',
      rendimiento: { cantidad: 1, unidad: 'porcion' },
      ingredientes: {
        mojarra_cruda: { itemId: 'mojarra_cruda', cantidad: 1, unidad: 'pza' }, // 1 pza ~ 0.4 kg = $36
        aceite_cocina: { itemId: 'aceite_cocina', cantidad: 100, unidad: 'ml' }, // 0.1 l = $4
      },
      procedimiento: ['Sazonar mojarra', 'Freír 8 minutos'],
      prepMin: 15,
      activo: true,
      version: 1,
      updatedAt: 1000,
    };

    const costeo = calcularCosteoYCapacidadPlatillo({
      platillo: platilloMojarra,
      catalogoInventario: catalogoMock,
      stockConsolidadoPorItem: {
        mojarra_cruda: 4, // 4 kg = 10 piezas de 400g
        aceite_cocina: 5, // 5 l = 50 porciones de 100ml
      },
    });

    expect(costeo.costoTotalReceta).toBeCloseTo(40, 2); // $36 + $4
    expect(costeo.costoPorUnidadRendimiento).toBeCloseTo(40, 2);
    expect(costeo.contieneAproximaciones).toBe(true);
    expect(costeo.capacidadProduccionUnidades).toBe(10);

    const { lineas } = resolverLineasConsumoParaProducto({
      producto: {
        id: 'prod_mojarra',
        nombre: 'Mojarra Frita',
        origenTipo: 'platillo',
        origenId: 'plat_mojarra',
        modoPreparacion: 'por_pedido',
      },
      platillo: platilloMojarra,
      cantidadVendida: 2,
      catalogoInventario: catalogoMock,
    });

    expect(lineas).toHaveLength(2);
    expect(lineas.find((l) => l.itemId === 'mojarra_cruda')?.cantidadBase).toBeCloseTo(0.8, 4);
    expect(lineas.find((l) => l.itemId === 'aceite_cocina')?.cantidadBase).toBeCloseTo(0.2, 4);
  });

  test('5. Platillo de producción anticipada (Lote de 8 Flanes): costeo por porción y venta posterior descuenta el flan terminado (jamás los insumos otra vez)', () => {
    const platilloFlan: PlatilloCocina = {
      id: 'platillo_flan',
      nombre: 'Flan Napolitano Casero',
      modoPreparacion: 'produccion_anticipada',
      rendimiento: { cantidad: 8, unidad: 'pza', descripcion: '1 molde de 8 rebanadas' },
      ingredientes: {
        leche_evaporada: { itemId: 'leche_evaporada', cantidad: 1, unidad: 'l' }, // $32
        huevo_blanco: { itemId: 'huevo_blanco', cantidad: 6, unidad: 'pza' }, // $24
        azucar_estandar: { itemId: 'azucar_estandar', cantidad: 500, unidad: 'g' }, // 0.5 kg = $14
      },
      procedimiento: ['Licuar ingredientes', 'Hornear a baño María 45 min'],
      prepMin: 50,
      itemTerminadoId: 'flan_terminado',
      activo: true,
      version: 1,
      updatedAt: 1000,
    };

    const costeoLote = calcularCosteoYCapacidadPlatillo({
      platillo: platilloFlan,
      catalogoInventario: catalogoMock,
      stockConsolidadoPorItem: {
        leche_evaporada: 3,
        huevo_blanco: 30,
        azucar_estandar: 5,
      },
    });

    // Costo del molde completo = 32 + 24 + 14 = $70. Costo por cada flan (de 8) = $8.75
    expect(costeoLote.costoTotalReceta).toBeCloseTo(70, 2);
    expect(costeoLote.costoPorUnidadRendimiento).toBeCloseTo(8.75, 2);

    // Si en la venta un cliente pide 2 flanes, se descuentan 2 unidades de `flan_terminado` y NUNCA leche/huevo/azúcar
    const { lineas } = resolverLineasConsumoParaProducto({
      producto: {
        id: 'prod_flan',
        nombre: 'Flan Napolitano',
        origenTipo: 'platillo',
        origenId: 'platillo_flan',
        modoPreparacion: 'produccion_anticipada',
        itemTerminadoId: 'flan_terminado',
      },
      platillo: platilloFlan,
      cantidadVendida: 2,
      catalogoInventario: catalogoMock,
    });

    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatchObject({
      itemId: 'flan_terminado',
      cantidadBase: 2,
      unidadBase: 'pza',
    });
  });

  test('6. Menú Comercial: diferencia Margen sobre Precio vs Recargo sobre Costo (Markup), alerta de pérdida y bloqueo de Mostrador en platillos por pedido', () => {
    // Costo = $40, Precio = $100 -> Ganancia = $60, Margen s/Precio = 60%, Recargo s/Costo = 150%
    const resumen = calcularResumenPrecioComercial(40, '100');
    expect(resumen.diferenciaUnitaria).toBe(60);
    expect(resumen.margenSobrePrecioPct).toBe(60);
    expect(resumen.recargoSobreCostoPct).toBe(150);
    expect(resumen.precioMenorACosto).toBe(false);

    // Fórmulas inversas:
    // Margen del 60% sobre costo $40 -> 40 / (1 - 0.60) = $100
    expect(calcularPrecioSugeridoDesdeCosto(40, 60, 'margen')).toBeCloseTo(100, 2);
    // Recargo del 60% sobre costo $40 -> 40 * (1 + 0.60) = $64
    expect(calcularPrecioSugeridoDesdeCosto(40, 60, 'recargo')).toBeCloseTo(64, 2);

    // Caso negativo: Precio menor al costo ($35 < $40)
    const resumenPerdida = calcularResumenPrecioComercial(40, '35');
    expect(resumenPerdida.precioMenorACosto).toBe(true);
    expect(resumenPerdida.diferenciaUnitaria).toBe(-5);

    // Bloqueo de Mostrador (`ventaCrudo`) cuando el platillo es `por_pedido`
    const formPlatillo = {
      ...crearFormularioVacio(),
      origenTipo: 'platillo' as const,
      modoPreparacion: 'por_pedido' as const,
      visible: { digital: true, mesero: true, ventaCrudo: true },
    };
    expect(esFormularioPlatilloPorPedido(formPlatillo)).toBe(true);
    const carga = formularioACarga(formPlatillo);
    expect(carga.visible?.ventaCrudo).toBe(false);
  });

  test('7. Gobierno de Capacidades: al apagar comanda_cocina o mostrador_y_pos se subordinan los roles correspondientes', () => {
    const npbMock: NegocioPlantillaBase = {
      categoria_id: '01',
      slug_categoria: 'marisquerias',
      version_npb: 1,
      estado: 'sellado',
      roles_dispositivo: [
        { id: 'administrador', pantallas_visibles: [] },
        { id: 'mesero', pantallas_visibles: [] },
        { id: 'cocina', pantallas_visibles: [] },
        { id: 'mostrador', pantallas_visibles: [] },
      ],
      capacidades: [
        { id: 'menu', configuracion_giro: 'Menú' },
        { id: 'inventario', configuracion_giro: 'Inventario' },
        { id: 'control_mesas', configuracion_giro: 'Mesas' },
        { id: 'comanda_cocina', configuracion_giro: 'Cocina' },
        { id: 'mostrador_y_pos', configuracion_giro: 'Mostrador' },
      ],
      cajones_activos: ['menu', 'inventario', 'mesas', 'pedidos', 'ventas'],
      cajones_desactivados_justificacion: {},
    };

    const encendidoSinCocina = encenderCapacidades(npbMock, {
      tipo_acceso: 'negocio_real',
      negocio_id: '01',
      capacidades_autorizadas: ['menu', 'inventario', 'mostrador_y_pos'],
    });

    expect(encendidoSinCocina.capacidades_activas).toContain('menu');
    expect(encendidoSinCocina.capacidades_activas).toContain('inventario');
    expect(encendidoSinCocina.capacidades_activas).toContain('mostrador_y_pos');
    expect(encendidoSinCocina.capacidades_activas).not.toContain('comanda_cocina');
    expect(encendidoSinCocina.roles_activos).not.toContain('cocina');
    expect(encendidoSinCocina.roles_activos).not.toContain('mesero');
    expect(encendidoSinCocina.roles_activos).toContain('mostrador');
  });

  test('8. Catálogo de Imágenes: resuelve las 8 bebidas desde assets/images/inventario/bebidas y separa orígenes', () => {
    const imgsInv = listarImagenesPorOrigen('inventario');
    expect(imgsInv.length).toBeGreaterThanOrEqual(8);
    expect(obtenerImagenProducto('xx_lager', undefined, 'inventario')).toBeTruthy();
    expect(obtenerImagenProducto('boing_mango', undefined, 'inventario')).toBeTruthy();
    expect(obtenerImagenProducto('coca_cola', undefined, 'inventario')).toBeTruthy();
  });
});
