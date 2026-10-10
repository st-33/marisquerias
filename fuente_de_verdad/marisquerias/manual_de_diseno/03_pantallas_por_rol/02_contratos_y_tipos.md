# CONTRATOS Y TIPOS: PANTALLAS POR ROL

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 03_pantallas_por_rol

## 1. CONTRATO DE EXPERIENCIA POR ROL

| Rol | Pantalla inicial | Accion dominante | Datos siempre visibles |
| --- | --- | --- | --- |
| administrador | Resumen de operacion | Abrir modulo / revisar alerta | Negocio activo, ventas, alertas, permisos |
| mostrador | Venta de mostrador | Agregar producto / cobrar | Carrito, total, metodo de pago, pendientes |
| mesero | Mapa/lista de mesas | Abrir mesa / enviar comanda | Mesa, productos, notas, estado |
| cocina | Cola de cocina | Marcar estado de preparacion | Numero, tiempo, prioridad, lineas |
| reparto | Pedidos de reparto | Asignar / actualizar entrega | Direccion, estado, responsable |

## 2. MAPA DE RESOLUCION

```typescript
REGISTRO_PANTALLAS: Record<string, { Screen: React.ComponentType<any> }>
// claves: selector_roles, cocina, mesero, mostrador, admin_dashboard,
//         admin_menu, admin_tables, admin_inventory, admin_repart, admin_mostrador
```

## 3. INVARIANTES

- Cada rol resuelve exactamente una pantalla inicial.
- El shell incluye cabecera (pantalla, contexto, conectividad).
- La navegacion no oculta una venta/comanda en curso sin advertencia.
- El dato critico (totales, estados, peso, stock) tiene espacio y contraste propios.
