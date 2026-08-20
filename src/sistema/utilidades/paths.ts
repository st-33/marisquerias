export type PathKey =
  | 'mesas_estado'
  | 'pedidos'
  | 'features'
  | 'caracteristicas'
  | 'access_codes'
  | 'menu_categorias'
  | 'menu_productos';

// Resolución básica ES↔EN para evitar romper bases existentes durante transición.
// Se usa concatenando tenantPath + '/' + resolver(key)
export function resolver(key: PathKey): string {
  switch (key) {
    case 'mesas_estado':
      // ⚠️ DEPRECATED: 'mesas/estado' duplicado eliminado. Apunta a 'mesas'.
      return 'mesas';
    case 'pedidos':
      return 'pedidos';
    case 'features':
      return 'features';
    case 'caracteristicas':
      return 'caracteristicas';
    case 'access_codes':
      return 'access_codes';
    case 'menu_categorias':
      return 'menu/categorias';
    case 'menu_productos':
      return 'menu/productos';
    default:
      return String(key);
  }
}

// En caso de necesitar leer de rutas legacy en inglés, este helper puede
// intentar múltiples candidates en orden, devolviendo la primera que exista.
// Aquí solo se define la lista; la lógica de prueba de existencia la aplicará el módulo llamador.
export function candidatesFor(key: PathKey): string[] {
  switch (key) {
    case 'mesas_estado':
      return ['mesas', 'mesas/estado', 'tables/status'];
    case 'pedidos':
      return ['pedidos', 'orders'];
    case 'menu_categorias':
      return ['menu/categorias', 'menu/categories'];
    case 'menu_productos':
      return ['menu/productos', 'menu/products'];
    case 'caracteristicas':
      return ['caracteristicas', 'features'];
    case 'features':
      return ['features', 'caracteristicas'];
    default:
      return [resolver(key)];
  }
}
