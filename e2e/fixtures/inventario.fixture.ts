/**
 * Fixture de datos de inventario (M4) para la auditoría visual Playwright.
 * NO toca código de producción: solo provee datos de sesión/RTDB para que la
 * pantalla real se renderice con datos deterministas y ejercitar todos los
 * estados (vistas, modales, FAB, empty, bajo stock, etc.).
 */

export const RUTA_NEGOCIO = 'marisquerias/el-arrecife';
export const DEVICE_ID_ADI = 'adi_test_device_0001';

// --- Sesión persistida (clave @system:session:active, en sessionStorage) ---
export const SESION_PERSISTIDA = {
  access_code: 'PL2026-24',
  rutaNegocio: RUTA_NEGOCIO,
  ruta_negocio: RUTA_NEGOCIO,
  negocioId: 'el-arrecife',
  negocio_id: 'el_arrecife',
  niche: 'restaurante',
  category: 'marisquerias',
  categoria_id: 'marisquerias',
  rol: 'admin',
};

// --- Vínculo de dispositivo activo (clave adi_dispositivo_vinculado) ---
export const VINCULO_DISPOSITIVO = {
  deviceIdADI: DEVICE_ID_ADI,
  rutaNegocio: RUTA_NEGOCIO,
  negocioId: 'el-arrecife',
  aliasDispositivo: 'Fierro ADI TEST',
  estado: 'activo',
  nivelOperativo: 'operador',
  puedeCambiarRol: true,
  vinculadoEn: Date.now(),
  actualizadoEn: Date.now(),
};

// --- Características del negocio: admin + inventario habilitado ---
export const CARACTERISTICAS_ADMIN = {
  roles: {
    admin: {
      dashboard: true,
      menu: true,
      inventario: true,
      mesas: true,
      dispositivos: true,
      repart: true,
      mostrador: true,
    },
  },
  module_venta_crudo: false,
};

// --- Fixture RTDB (lo que devuelve el WebSocket de Firebase) ---
// Catálogo global de insumos. Claves estables para poder validar textos.
export const CATALOGO = {
  item_alim_camaron: {
    id: 'item_alim_camaron',
    nombre: 'Camarón',
    sectionId: 'alimentos',
    unidad: 'kg',
    minStock: 5,
    updatedAt: Date.now(),
  },
  item_alim_pescado_entero: {
    id: 'item_alim_pescado_entero',
    nombre: 'Pescado Entero',
    sectionId: 'alimentos',
    unidad: 'kg',
    minStock: 5,
    updatedAt: Date.now(),
  },
  item_alim_pulpo_cocido: {
    id: 'item_alim_pulpo_cocido',
    nombre: 'Pulpo Cocido',
    sectionId: 'alimentos',
    unidad: 'kg',
    minStock: 3,
    updatedAt: Date.now(),
  },
  item_alim_cerveza: {
    id: 'item_alim_cerveza',
    nombre: 'Cerveza',
    sectionId: 'alimentos',
    unidad: 'pza',
    minStock: 12,
    updatedAt: Date.now(),
  },
  item_alim_refresco: {
    id: 'item_alim_refresco',
    nombre: 'Refresco',
    sectionId: 'alimentos',
    unidad: 'pza',
    minStock: 12,
    updatedAt: Date.now(),
  },
  item_losa_plato: {
    id: 'item_losa_plato',
    nombre: 'Plato',
    sectionId: 'losa_cristaleria',
    unidad: 'pza',
    minStock: 24,
    updatedAt: Date.now(),
  },
  item_losa_vaso: {
    id: 'item_losa_vaso',
    nombre: 'Vaso',
    sectionId: 'losa_cristaleria',
    unidad: 'pza',
    minStock: 24,
    updatedAt: Date.now(),
  },
  item_otros_bolsas: {
    id: 'item_otros_bolsas',
    nombre: 'Bolsas',
    sectionId: 'otros',
    unidad: 'pza',
    minStock: 50,
    updatedAt: Date.now(),
  },
};

// Secciones (stock directo en sección — modelo "zombie" P-01)
export const SECCIONES = {
  alimentos: {
    id: 'alimentos',
    nombre: 'Alimentos / Consumibles',
    icon: '🍲',
    stock: { item_alim_camaron: 2 },
    updatedAt: Date.now(),
  },
  losa_cristaleria: {
    id: 'losa_cristaleria',
    nombre: 'Losa / Cristalería',
    icon: '🍽️',
    stock: {},
    updatedAt: Date.now(),
  },
  otros: {
    id: 'otros',
    nombre: 'Otros',
    icon: '📦',
    stock: {},
    updatedAt: Date.now(),
  },
};

// Áreas (nodos raíz sin parentId) y contenedores (con parentId)
export const AREAS = {
  area_alim_cocina: {
    id: 'area_alim_cocina',
    hubId: 'restaurante',
    sectionId: 'alimentos',
    nombre: 'Cocina',
    icon: '🍳',
    tipo: 'cocina',
    stock: {},
    updatedAt: Date.now(),
  },
  area_alim_barra: {
    id: 'area_alim_barra',
    hubId: 'restaurante',
    sectionId: 'alimentos',
    nombre: 'Barra',
    icon: '🍸',
    tipo: 'otro',
    stock: {},
    updatedAt: Date.now(),
  },
  area_losa_servicio: {
    id: 'area_losa_servicio',
    hubId: 'restaurante',
    sectionId: 'losa_cristaleria',
    nombre: 'Servicio',
    icon: '🍽️',
    tipo: 'otro',
    stock: {},
    updatedAt: Date.now(),
  },
  area_otros_general: {
    id: 'area_otros_general',
    hubId: 'restaurante',
    sectionId: 'otros',
    nombre: 'General',
    icon: '🧰',
    tipo: 'otro',
    stock: {},
    updatedAt: Date.now(),
  },
  // Contenedores (parentId -> área raíz)
  'area_alim_cocina__default': {
    id: 'area_alim_cocina__default',
    hubId: 'restaurante',
    sectionId: 'alimentos',
    nombre: 'Refri Principal',
    icon: '🧊',
    tipo: 'refri',
    parentId: 'area_alim_cocina',
    stock: {
      item_alim_camaron: 21,
      item_alim_pescado_entero: 8,
      item_alim_pulpo_cocido: 2,
    },
    updatedAt: Date.now(),
  },
  'area_alim_barra__default': {
    id: 'area_alim_barra__default',
    hubId: 'restaurante',
    sectionId: 'alimentos',
    nombre: 'Refri Principal',
    icon: '🧊',
    tipo: 'refri',
    parentId: 'area_alim_barra',
    stock: {
      item_alim_cerveza: 24,
      item_alim_refresco: 10,
    },
    updatedAt: Date.now(),
  },
  'area_losa_servicio__default': {
    id: 'area_losa_servicio__default',
    hubId: 'restaurante',
    sectionId: 'losa_cristaleria',
    nombre: 'Contenedor Principal',
    icon: '📦',
    tipo: 'almacen',
    parentId: 'area_losa_servicio',
    stock: {
      item_losa_plato: 60,
      item_losa_vaso: 20,
    },
    updatedAt: Date.now(),
  },
  'area_otros_general__default': {
    id: 'area_otros_general__default',
    hubId: 'restaurante',
    sectionId: 'otros',
    nombre: 'Contenedor Principal',
    icon: '📦',
    tipo: 'almacen',
    parentId: 'area_otros_general',
    stock: {
      item_otros_bolsas: 200,
    },
    updatedAt: Date.now(),
  },
};
