/**
 * 🛒 HOOK — ESTADO LOCAL DEL CARRITO (UI Puro)
 *
 * DOGMA ADI — LÓGICA VISUAL:
 * Este hook es un estado efímero de interfaz SOLAMENTE.
 * NO persiste nada. NO llama a Firebase. NO llama a AsyncStorage.
 *
 * La persistencia real ocurre en DraftsLocalRepo (Core Ciego).
 * El intermediario que une ambas capas es useMostradorVisual.ts.
 *
 * Contrato: solo expone mutaciones de estado en memoria local.
 */

import { useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type ItemCarrito = {
  itemId: string;
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  tamano?: Record<string, string>;
  preparacion?: Record<string, string>;
  precioBase?: number;
  deltaPrecio?: number;
  prepMinutos?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estado en memoria del carrito activo para una mesa/takeaway.
 * Se inicializa con los ítems recuperados por el Core; no hace I/O propio.
 */
export function useCartUI(itemsIniciales: ItemCarrito[] = []) {
  const [items, setItems] = useState<ItemCarrito[]>(itemsIniciales);

  /** Reemplaza todos los ítems (usado al cargar desde el Core). */
  const cargarItems = useCallback((nuevosItems: ItemCarrito[]) => {
    setItems(nuevosItems);
  }, []);

  /** Agrega un ítem al estado local. */
  const agregarItem = useCallback((item: ItemCarrito) => {
    setItems((prev) => [...prev, item]);
  }, []);

  /** Incrementa cantidad de un ítem por índice en el array local. */
  const incrementarItem = useCallback((itemId: string, delta: number = 1) => {
    setItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, cantidad: it.cantidad + delta } : it))
    );
  }, []);

  /** Elimina un ítem por su itemId del estado local. */
  const eliminarItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((it) => it.itemId !== itemId));
  }, []);

  /** Vacía el carrito en UI. */
  const vaciarCarrito = useCallback(() => {
    setItems([]);
  }, []);

  const totalLocal = items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);

  return {
    items,
    totalLocal,
    cargarItems,
    agregarItem,
    incrementarItem,
    eliminarItem,
    vaciarCarrito,
  };
}
