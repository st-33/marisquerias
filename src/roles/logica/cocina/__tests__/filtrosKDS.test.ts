import { filtrarComandasPorEstacion } from '../filtrosKDS';
import type { OrdenCocina } from '../useLogicaCocina';
import type { Producto } from '../../../../sistema/persistencia/menu.repositorio';

describe('filtrosKDS — Filtrado de Comandas KDS por Estación', () => {
  const productosCatalogo: Record<string, Producto> = {
    'prod-mojito': {
      id: 'prod-mojito',
      nombre: 'Mojito Cubano',
      precio: 95,
      categoriaId: 'cat-bebidas',
      estacion_preparacion: 'barra',
    },
    'prod-margarita': {
      id: 'prod-margarita',
      nombre: 'Margarita Clásica',
      precio: 110,
      categoriaId: 'cat-bebidas',
      estacion_preparacion: 'barra',
    },
    'prod-espresso': {
      id: 'prod-espresso',
      nombre: 'Café Espresso',
      precio: 45,
      categoriaId: 'cat-cafe',
      estacion_preparacion: 'cafeteria',
    },
    'prod-pescado-asado': {
      id: 'prod-pescado-asado',
      nombre: 'Huachinango a las Brasas',
      precio: 280,
      categoriaId: 'cat-parrilla',
      estacion_preparacion: 'parrilla',
    },
    'prod-combo-salida': {
      id: 'prod-combo-salida',
      nombre: 'Paquete Marisquero Para Llevar',
      precio: 450,
      categoriaId: 'cat-combos',
      estacion_preparacion: 'empaque',
    },
    // Producto huérfano de estación (sin estacion_preparacion)
    'prod-ensalada': {
      id: 'prod-ensalada',
      nombre: 'Ensalada Verde de la Casa',
      precio: 80,
      categoriaId: 'cat-entradas',
    },
  };

  const ordenMesa1: OrdenCocina = {
    id: 'ord-01',
    tipo: 'mesa',
    mesaId: 'mesa-01',
    estatus: 'enviado_cocina',
    items: [
      {
        id: 'it-1',
        productoId: 'prod-mojito',
        nombre: 'Mojito Cubano',
        cantidad: 2,
        precio: 95,
        estado: 'nuevo',
      },
      {
        id: 'it-2',
        productoId: 'prod-pescado-asado',
        nombre: 'Huachinango a las Brasas',
        cantidad: 1,
        precio: 280,
        estado: 'nuevo',
      },
      {
        id: 'it-3',
        productoId: 'prod-ensalada',
        nombre: 'Ensalada Verde de la Casa',
        cantidad: 1,
        precio: 80,
        estado: 'nuevo',
      },
    ],
    itemsTotal: 3,
    itemsPendientes: 3,
    itemsListos: 0,
    tiempoTranscurrido: 120,
    esUrgente: false,
    createdAt: Date.now() - 120000,
  };

  const ordenMesa2: OrdenCocina = {
    id: 'ord-02',
    tipo: 'mesa',
    mesaId: 'mesa-02',
    estatus: 'enviado_cocina',
    items: [
      {
        id: 'it-4',
        productoId: 'prod-espresso',
        nombre: 'Café Espresso',
        cantidad: 2,
        precio: 45,
        estado: 'nuevo',
      },
    ],
    itemsTotal: 1,
    itemsPendientes: 1,
    itemsListos: 0,
    tiempoTranscurrido: 60,
    esUrgente: false,
    createdAt: Date.now() - 60000,
  };

  const ordenesMuestra: OrdenCocina[] = [ordenMesa1, ordenMesa2];

  test('1. PantallaCocina sin estación muestra todas las comandas y todos los ítems', () => {
    // Cuando estacion es undefined
    const resultado = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, undefined);

    expect(resultado.length).toBe(2);
    expect(resultado[0].id).toBe('ord-01');
    expect(resultado[0].items.length).toBe(3);
    expect(resultado[1].id).toBe('ord-02');
    expect(resultado[1].items.length).toBe(1);
  });

  test('2. PantallaCocina con estación="barra" solo muestra comandas e ítems con producto.estacion_preparacion === "barra"', () => {
    const resultado = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, 'barra');

    // Solo orden 1 tiene mojito (barra); orden 2 solo tiene espresso (cafeteria)
    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe('ord-01');

    // La comanda filtrada solo incluye los productos de barra
    expect(resultado[0].items.length).toBe(1);
    expect(resultado[0].items[0].productoId).toBe('prod-mojito');
    expect(resultado[0].items[0].nombre).toBe('Mojito Cubano');
  });

  test('3. Productos sin estacion_preparacion no aparecen en filtros por estación (van a la vista general de cocina)', () => {
    // prod-ensalada no tiene estacion_preparacion
    const resBarra = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, 'barra');
    const resParrilla = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, 'parrilla');
    const resCafe = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, 'cafeteria');

    const contieneEnsalada = (lista: OrdenCocina[]) =>
      lista.some((o) => o.items.some((i) => i.productoId === 'prod-ensalada'));

    expect(contieneEnsalada(resBarra)).toBe(false);
    expect(contieneEnsalada(resParrilla)).toBe(false);
    expect(contieneEnsalada(resCafe)).toBe(false);

    // Pero SÍ aparece en la vista general (sin estación)
    const resGeneral = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, undefined);
    expect(contieneEnsalada(resGeneral)).toBe(true);
  });

  test('4. Estación parrilla filtra correctamente huachinango y descarta orden 2', () => {
    const resParrilla = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, 'parrilla');

    expect(resParrilla.length).toBe(1);
    expect(resParrilla[0].id).toBe('ord-01');
    expect(resParrilla[0].items.length).toBe(1);
    expect(resParrilla[0].items[0].productoId).toBe('prod-pescado-asado');
  });

  test('5. Estación cafeteria solo muestra café espresso de orden 2', () => {
    const resCafe = filtrarComandasPorEstacion(ordenesMuestra, productosCatalogo, 'cafeteria');

    expect(resCafe.length).toBe(1);
    expect(resCafe[0].id).toBe('ord-02');
    expect(resCafe[0].items.length).toBe(1);
    expect(resCafe[0].items[0].productoId).toBe('prod-espresso');
  });

  test('6. Estación empaque filtra correctamente productos asignados a empaque', () => {
    const ordenEmpaque: OrdenCocina = {
      id: 'ord-03',
      tipo: 'delivery',
      estatus: 'enviado_cocina',
      items: [
        {
          id: 'it-5',
          productoId: 'prod-combo-salida',
          nombre: 'Paquete Marisquero Para Llevar',
          cantidad: 1,
          precio: 450,
          estado: 'nuevo',
        },
      ],
      itemsTotal: 1,
      itemsPendientes: 1,
      itemsListos: 0,
      tiempoTranscurrido: 10,
      esUrgente: false,
      createdAt: Date.now(),
    };

    const resEmpaque = filtrarComandasPorEstacion([ordenEmpaque], productosCatalogo, 'empaque');
    expect(resEmpaque.length).toBe(1);
    expect(resEmpaque[0].id).toBe('ord-03');
    expect(resEmpaque[0].items[0].productoId).toBe('prod-combo-salida');
  });

  test('7. Comanda cuyos ítems ninguno pertenece a la estación consultada se descarta completamente', () => {
    // ordenMesa2 solo tiene café espresso (cafeteria). Consultar barra debe descartarla totalmente.
    const resBarra = filtrarComandasPorEstacion([ordenMesa2], productosCatalogo, 'barra');
    expect(resBarra.length).toBe(0);
  });

  test('8. Productos no existentes en catálogo no causan error y no coinciden con ninguna estación específica', () => {
    const ordenDesconocida: OrdenCocina = {
      id: 'ord-unknown',
      tipo: 'mesa',
      estatus: 'enviado_cocina',
      items: [
        {
          id: 'it-x',
          productoId: 'prod-inexistente-999',
          nombre: 'Platillo Misterio',
          cantidad: 1,
          precio: 100,
          estado: 'nuevo',
        },
      ],
      itemsTotal: 1,
      itemsPendientes: 1,
      itemsListos: 0,
      tiempoTranscurrido: 5,
      esUrgente: false,
      createdAt: Date.now(),
    };

    const resBarra = filtrarComandasPorEstacion([ordenDesconocida], productosCatalogo, 'barra');
    expect(resBarra.length).toBe(0);

    const resGeneral = filtrarComandasPorEstacion([ordenDesconocida], productosCatalogo, undefined);
    expect(resGeneral.length).toBe(1);
    expect(resGeneral[0].items[0].productoId).toBe('prod-inexistente-999');
  });
});
