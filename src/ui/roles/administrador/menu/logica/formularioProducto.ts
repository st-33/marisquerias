/**
 * 🧠 Lógica pura del formulario de producto del módulo Menú.
 * Sin React, sin Firebase: tipos y transformaciones de estado del formulario.
 *
 * Responsabilidad de Menú:
 *  - Seleccionar lo existente de Inventario (`origenTipo: 'inventario'`) o del
 *    Libro de Platillos (`origenTipo: 'platillo'`).
 *  - Consultar costo de referencia, calcular diferencia / margen sobre precio /
 *    recargo sobre costo y establecer el precio de venta comercial.
 *  - Habilitar canales de venta (Restaurante / Mostrador / Menú Digital)
 *    respetando la elegibilidad física (los platillos hechos al momento
 *    `por_pedido` no se habilitan como entrega directa en Mostrador).
 */

import type { Producto } from '../../../../../sistema/persistencia';
import type { ModoPreparacionPlatillo } from '../../../../../sistema/persistencia/platillos.repositorio';

export type ModalType = 'addCat' | 'addProd' | 'editProd' | null;

export type FormState = {
  id: string;
  activo: boolean;
  origenTipo: 'inventario' | 'platillo';
  origenId: string;
  modoPreparacion?: ModoPreparacionPlatillo;
  itemTerminadoId?: string;
  costoReferencia: number;
  costoIncompleto?: boolean;
  costoAproximado?: boolean;
  imagenId?: string;
  estacion_preparacion?: Producto['estacion_preparacion'];
  nombre: string;
  precio: string;
  categoriaId: string;
  variantes: Producto['variantes'];
  visible: Producto['visible'];
  prepMin: number;
  receta: Producto['receta'];
  usarConfigPersonalizada: boolean;
  enviarACocina: boolean;
  saltarPreparando: boolean;
  unidad: 'pza' | 'kg';
  inventoryAreaId?: string;
};

export type CargaFormularioProducto = Omit<FormState, 'id' | 'activo' | 'categoriaId'>;

export interface ResumenPrecioComercial {
  costoReferencia: number;
  precioVenta: number;
  diferenciaUnitaria: number;
  margenSobrePrecioPct: number | null;
  recargoSobreCostoPct: number | null;
  precioMenorACosto: boolean;
  costoNoDisponible: boolean;
}

/**
 * Calcula diferencia, margen sobre precio ((P - C) / P) y recargo sobre costo ((P - C) / C).
 * Evita confundir margen sobre precio (`costo / (1 - margen)`) con markup (`costo * (1 + recargo)`).
 */
export function calcularResumenPrecioComercial(
  costoReferenciaInput: number | undefined | null,
  precioVentaInput: string | number | undefined | null,
  costoIncompleto: boolean = false
): ResumenPrecioComercial {
  const costo = Number(costoReferenciaInput || 0);
  const precio =
    typeof precioVentaInput === 'string'
      ? parseFloat(precioVentaInput)
      : Number(precioVentaInput || 0);
  const precioValido = Number.isFinite(precio) && precio >= 0 ? precio : 0;
  const costoValido = Number.isFinite(costo) && costo > 0 ? costo : 0;
  const costoNoDisponible = costoIncompleto || costoValido <= 0;

  const diferenciaUnitaria = Number((precioValido - costoValido).toFixed(2));
  const margenSobrePrecioPct =
    precioValido > 0 && !costoNoDisponible
      ? Number((((precioValido - costoValido) / precioValido) * 100).toFixed(1))
      : null;
  const recargoSobreCostoPct =
    costoValido > 0 && !costoNoDisponible
      ? Number((((precioValido - costoValido) / costoValido) * 100).toFixed(1))
      : null;

  return {
    costoReferencia: Number(costoValido.toFixed(2)),
    precioVenta: Number(precioValido.toFixed(2)),
    diferenciaUnitaria,
    margenSobrePrecioPct,
    recargoSobreCostoPct,
    precioMenorACosto: !costoNoDisponible && precioValido > 0 && precioValido < costoValido,
    costoNoDisponible,
  };
}

/**
 * Calcula el precio sugerido según:
 *  - 'margen': Precio = Costo / (1 - margenPct/100)
 *  - 'recargo': Precio = Costo * (1 + recargoPct/100)
 */
export function calcularPrecioSugeridoDesdeCosto(
  costo: number,
  porcentaje: number,
  modo: 'margen' | 'recargo'
): number {
  const c = Number(costo || 0);
  const pct = Number(porcentaje || 0);
  if (c <= 0 || pct <= 0) return Number(c.toFixed(2));

  if (modo === 'margen') {
    const divisor = 1 - pct / 100;
    if (divisor <= 0.01) return Number((c * 10).toFixed(2));
    return Number((c / divisor).toFixed(2));
  }

  return Number((c * (1 + pct / 100)).toFixed(2));
}

/**
 * Determina si un formulario corresponde a un platillo hecho al momento (por pedido),
 * el cual no puede habilitarse como entrega directa en Mostrador (`ventaCrudo`).
 */
export function esFormularioPlatilloPorPedido(form: Pick<FormState, 'origenTipo' | 'modoPreparacion'>): boolean {
  return form.origenTipo === 'platillo' && form.modoPreparacion !== 'produccion_anticipada';
}

export const crearFormularioVacio = (): FormState => ({
  id: '',
  activo: true,
  origenTipo: 'inventario',
  origenId: '',
  modoPreparacion: undefined,
  itemTerminadoId: undefined,
  costoReferencia: 0,
  costoIncompleto: false,
  costoAproximado: false,
  imagenId: undefined,
  estacion_preparacion: undefined,
  nombre: '',
  precio: '',
  categoriaId: '',
  variantes: {} as Producto['variantes'],
  visible: { digital: true, mesero: true, ventaCrudo: true } as Producto['visible'],
  prepMin: 0,
  receta: {} as Producto['receta'],
  usarConfigPersonalizada: false,
  enviarACocina: false,
  saltarPreparando: true,
  unidad: 'pza',
  inventoryAreaId: '',
});

export const productoAFormulario = (producto: Producto): FormState => {
  const tieneRecetaLegacy =
    producto.receta?.ingredientes && Object.keys(producto.receta.ingredientes).length > 0;
  const origenTipo: 'inventario' | 'platillo' =
    producto.origenTipo ||
    (tieneRecetaLegacy || (producto.enviarACocina && !producto.saltarPreparando)
      ? 'platillo'
      : 'inventario');

  const modoPreparacion: ModoPreparacionPlatillo | undefined =
    producto.modoPreparacion ||
    (origenTipo === 'platillo' ? 'por_pedido' : undefined);

  const esPorPedido = origenTipo === 'platillo' && modoPreparacion !== 'produccion_anticipada';

  const visibleBase = {
    digital: true,
    mesero: true,
    ventaCrudo: !esPorPedido,
    ...(producto.visible || {}),
  } as Producto['visible'];

  if (esPorPedido && visibleBase) {
    visibleBase.ventaCrudo = false;
  }

  return {
    id: producto.id,
    activo: producto.activo ?? true,
    origenTipo,
    origenId: producto.origenId || producto.id || '',
    modoPreparacion,
    itemTerminadoId: producto.itemTerminadoId,
    costoReferencia: Number(producto.costoReferencia || 0),
    costoIncompleto: false,
    costoAproximado: false,
    imagenId: producto.imagenId || (producto as any).imagen_id,
    estacion_preparacion: producto.estacion_preparacion,
    nombre: producto.nombre,
    precio: producto.precio != null ? String(producto.precio) : '',
    categoriaId: producto.categoriaId,
    variantes: producto.variantes || {},
    visible: visibleBase,
    prepMin: producto.prepMin || 0,
    receta: producto.receta || {},
    usarConfigPersonalizada: producto.usarConfigPersonalizada || false,
    enviarACocina: producto.enviarACocina ?? (origenTipo === 'platillo' && esPorPedido),
    saltarPreparando: producto.saltarPreparando ?? !esPorPedido,
    unidad: (producto.unidad as FormState['unidad']) || 'pza',
    inventoryAreaId: (producto as any).inventoryAreaId || (producto as any).areaId || '',
  };
};

export const formularioACarga = (form: FormState): CargaFormularioProducto => {
  const esPorPedido = esFormularioPlatilloPorPedido(form);
  const visibleLimpio = {
    ...form.visible,
    ventaCrudo: esPorPedido ? false : Boolean(form.visible?.ventaCrudo),
  };

  return {
    origenTipo: form.origenTipo,
    origenId: form.origenId,
    modoPreparacion: form.modoPreparacion,
    itemTerminadoId: form.itemTerminadoId,
    costoReferencia: Number(form.costoReferencia || 0),
    costoIncompleto: form.costoIncompleto,
    costoAproximado: form.costoAproximado,
    imagenId: form.imagenId,
    estacion_preparacion: form.estacion_preparacion,
    nombre: form.nombre,
    precio: form.precio,
    variantes: form.variantes,
    visible: visibleLimpio,
    prepMin: form.prepMin,
    receta: form.receta,
    usarConfigPersonalizada: form.usarConfigPersonalizada,
    enviarACocina: form.enviarACocina,
    saltarPreparando: form.saltarPreparando,
    unidad: form.unidad,
    inventoryAreaId: form.inventoryAreaId || undefined,
  };
};
