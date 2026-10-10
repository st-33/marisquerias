# CONTRATOS Y TIPOS: ESTADOS Y RETROALIMENTACION

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 04_estados_y_retroalimentacion

## 1. CONTRATO DE ESTADOS DE SISTEMA

| Estado | Mensaje esperado | Accion posible |
| --- | --- | --- |
| cargando | "Cargando [contenido]..." | Cancelar si la operacion lo permite |
| vacio_inicial | Explicacion breve del contexto | Crear, agregar o cambiar periodo |
| sin_coincidencias | "No encontramos resultados con estos filtros." | Limpiar filtros |
| offline | "Sin conexion. Los cambios quedaran pendientes." | Ver pendientes / reintentar |
| error_recuperable | Que fallo y por que importa | Reintentar o alternativa segura |
| permiso_insuficiente | Que rol puede ejecutar la accion | Volver o solicitar autorizacion |
| exito | Que quedo hecho | Continuar; consultar comprobante |
| pendiente | Que se guardo localmente o espera dispositivo | Ver estado, reintentar, cancelar |

## 2. RETROALIMENTACION DE CAMPO

```typescript
formulario + validacion_visual = formulario_cerrado;
campo_de_entrada_visual + estado_visual = retroalimentacion_campo;
mensaje_visual + duracion_visual = notificacion_temporal;
```

## 3. INVARIANTES

- Toda pantalla de datos cubre los 8 estados; ninguno puede omitirse.
- Nunca borrar el contexto de una venta/pedido para mostrar un error.
- Formularios conservan datos editables cuando sea seguro.
- Diferenciar "no guardado", "guardado pendiente", "guardado confirmado".
