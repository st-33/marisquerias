/**
 * 🧠 Lógica pura del formulario de producto del módulo Menú.
 * Sin React, sin Firebase: tipos y transformaciones de estado del formulario.
 * Extraído de `PantallaMenuAdmin.tsx` (antes `AdminMenuScreen.tsx`).
 */

import type { Producto } from '../../../../../sistema/persistencia';

export type ModalType = 'addCat' | 'addProd' | 'editProd' | null;

export type FormState = {
  id: string;
  activo: boolean;
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
};

export type CargaFormularioProducto = Omit<FormState, 'id' | 'activo' | 'categoriaId'>;

export const crearFormularioVacio = (): FormState => ({
  id: '',
  activo: true,
  nombre: '',
  precio: '',
  categoriaId: '',
  variantes: {} as Producto['variantes'],
  visible: { digital: true, mesero: true, ventaCrudo: true } as Producto['visible'],
  prepMin: 0,
  receta: {} as Producto['receta'],
  usarConfigPersonalizada: false,
  enviarACocina: true,
  saltarPreparando: false,
  unidad: 'pza',
});

export const productoAFormulario = (producto: Producto): FormState => ({
  id: producto.id,
  activo: producto.activo ?? true,
  nombre: producto.nombre,
  precio: producto.precio != null ? String(producto.precio) : '',
  categoriaId: producto.categoriaId,
  variantes: producto.variantes || {},
  visible: {
    digital: true,
    mesero: true,
    ventaCrudo: true,
    ...(producto.visible || {}),
  } as Producto['visible'],
  prepMin: producto.prepMin || 0,
  receta: producto.receta || {},
  usarConfigPersonalizada: producto.usarConfigPersonalizada || false,
  enviarACocina: producto.enviarACocina ?? true,
  saltarPreparando: producto.saltarPreparando ?? false,
  unidad: (producto.unidad as FormState['unidad']) || 'pza',
});

export const formularioACarga = (form: FormState): CargaFormularioProducto => ({
  nombre: form.nombre,
  precio: form.precio,
  variantes: form.variantes,
  visible: { ...form.visible },
  prepMin: form.prepMin,
  receta: form.receta,
  usarConfigPersonalizada: form.usarConfigPersonalizada,
  enviarACocina: form.enviarACocina,
  saltarPreparando: form.saltarPreparando,
  unidad: form.unidad,
});
