/**
 * 🏷️ Etiquetas de texto configurables del módulo Menú.
 * Extraído de `PantallaMenuAdmin.tsx`.
 */

export interface EtiquetasMenu {
  catalogTitle: string;
  catalogSubtitle: string;
  itemLabel: string;
  itemsPluralLabel: string;
  categoryLabel: string;
  recipeTab: string;
  preparationFlow: string;
  sendToPreparation: string;
  sellerVisibility: string;
  sellerSubtext: string;
  showVentaCrudo?: boolean;
}

export const ETIQUETAS_MENU_POR_DEFECTO: EtiquetasMenu = {
  catalogTitle: 'Gestión de Catálogo / Menú',
  catalogSubtitle: 'Administra tus categorías, productos e insumos en tiempo real',
  itemLabel: 'Producto',
  itemsPluralLabel: 'productos',
  categoryLabel: 'Categoría',
  recipeTab: 'Receta / Insumos',
  preparationFlow: 'Flujo de Despacho / Preparación',
  sendToPreparation: 'Enviar a Despacho / Cocina',
  sellerVisibility: 'Visible para Operadores',
  sellerSubtext: 'Aparece en la app de atención y ventas',
  showVentaCrudo: true,
};
