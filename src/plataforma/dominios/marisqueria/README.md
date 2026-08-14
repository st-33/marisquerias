# Dominio Marisquería

El dominio `marisqueria` contiene los flujos operativos y administrativos propios de una marisquería. No cambia los contratos persistentes ni las rutas públicas de Expo; organiza físicamente la lógica que ya está conectada al flujo real.

| Área | Ubicación |
|---|---|
| Mesero | `mesero/` |
| Cocina | `cocina/` |
| Administración de menú y productos | `administracion/menu/` |
| Administración del dashboard | `administracion/dashboard/` |
| Administración de inventario | `administracion/inventario/` |
| Configuración administrativa | `administracion/configuracion/` |

La infraestructura permanece compartida cuando tiene consumidores reales en más de un circuito. Entre esas piezas están la persistencia base, la tienda central, `SincronizadorCocina`, `RepositorioInventario` y `usePuenteAccionesFlotantes`; no se mueven solo para mejorar la apariencia del árbol.

## Regla de movimiento

Una pieza puede entrar a este dominio únicamente cuando se demuestra su consumidor activo, su pertenencia exclusiva al circuito y la ausencia de otro consumidor legítimo fuera de él. El movimiento debe reconectar imports y barriles, conservar contratos y rutas públicas, pasar tipos y pruebas, y quedar en un commit pequeño. Si la evidencia es insuficiente, la pieza permanece donde está y se registra como pendiente.
