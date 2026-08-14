# Administración de Marisquerías

## Estado operativo

El tramo **Menú** ya resuelve su pantalla activa desde `administracion/menu/AdminMenuScreen.tsx`. También quedaron reubicados en el mismo bloque `CategorySidebar.tsx` y `ProductCard.tsx`, exclusivos de esa pantalla. `ScreenRegistry` conserva la clave funcional `admin_menu` y ahora apunta a esta ubicación.

Los editores de receta y variantes, los hooks de menú, el inventario y la lógica de Mesero/Cocina no se movieron porque siguen siendo compartidos o requieren delimitación adicional.

## Siguiente bloque

Continuar con **Productos**: comprobar si `RecipeEditor` y `VariantEditor` tienen consumidores adicionales antes de separarlos del catálogo compartido.
