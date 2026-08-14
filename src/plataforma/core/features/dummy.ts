import React from 'react';

// Componente React dummy universal para evitar crasheos de renderizado
const DummyComponent: React.FC<any> = () => null;

export default DummyComponent;

// --- Componentes UI Dummies ---
export const BluetoothPrinterModal = DummyComponent;
export const ProductPickerOverlay = DummyComponent;
export const PuestoMando = DummyComponent;
export const VariantsModal = DummyComponent;
export const PanelInventario = DummyComponent;
export const RecipeEditor = DummyComponent;
export const VariantEditor = DummyComponent;
export const MostradorPro = DummyComponent;
export const CardVenta = DummyComponent;
export const GridMesas = DummyComponent;

// --- Hooks Dummies ---
export const useMeseroLogic = () => ({
  loading: false,
  mesas: [],
  actions: {
    abrirMesa: () => Promise.resolve(),
    cerrarMesa: () => Promise.resolve(),
    agregarItem: () => {},
  },
});

export const useProductSelector = () => ({
  selectedProduct: null,
  selectProduct: () => {},
  clearSelection: () => {},
});

export const useVariantSelector = () => ({
  selectedVariants: {},
  selectVariant: () => {},
  resetVariants: () => {},
});

export const useCocinaLogic = () => ({
  orders: [],
  stats: { total: 0, urgentes: 0, itemsPendientes: 0, itemsListos: 0 },
  loading: false,
  actions: {
    startItem: () => Promise.resolve(),
    finishItem: () => Promise.resolve(),
    finishOrder: () => Promise.resolve(),
  },
});

export const useAdminLogic = () => ({
  loading: false,
  actions: {},
  stats: { total: 0, urgentes: 0, itemsPendientes: 0, itemsListos: 0 },
});

export const useAlertasInteligentes = () => [];
export const usePrediccionStock = () => ({ predicciones: [], loading: false });
export const usePuenteAccionesFlotantes = () => ({ acciones: [] });
export const useDevicesManagement = () => ({ devices: [], actions: {} });
export const useMenuManagement = () => ({ menu: [], actions: {} });
export const usePosConfig = () => ({ config: {}, actions: {} });
export const useMostradorPro = () => ({
  loading: false,
  productos: [],
  categorias: [],
  carrito: [],
  total: 0,
  efectivo: '',
  setEfectivo: () => {},
  cambio: 0,
  actions: {
    agregarAlCarrito: () => {},
    agregarPorCodigo: () => false,
    eliminarItem: () => {},
    limpiarCarrito: () => {},
    completarVenta: () => Promise.resolve({ success: true }),
    reimprimirUltimoTicket: () => Promise.resolve({ success: true }),
  },
});
export const usePOS = () => ({
  cart: [],
  total: 0,
  actions: {},
});
