# Informe M6 — contrato de lectura de báscula

**Agente:** M6  
**Repositorio intervenido:** `st-33/marisquerias`  
**Fecha:** 2026-08-27  
**Alcance:** contrato canónico de dispositivos y lectura de báscula.

## 1. Contexto reconstruido

La coordinación previa M1–M5 trabajó principalmente en la desfragmentación de Menú, Inventario, Mesas y Reparto del rol Administrador. La última sesión dejó las pantallas en rutas canónicas, registró Reparto en la fábrica de pantallas y cerró con TypeScript sin errores y 19 suites/102 pruebas verdes. M4 confirmó que no había huérfanos en el territorio auditado y M5 señaló que la cobertura directa de varios módulos administrativos era limitada.

Los otros repositorios cumplen funciones distintas. `st-33/verdulerias` es una plantilla operativa Expo/Firebase para comercio de productos frescos, con aislamiento por tenant y una fórmula visible reducida a Ventas, Admin e Inventario. `st-33/servicio-a-domicilio` es una base web neutral multi-tenant que ya tiene enrolamiento de dispositivos de repartidor y una proyección SQL de misiones. Ninguno de esos repositorios debía modificarse para el frente seleccionado.

## 2. Hallazgo técnico

El roadmap de Marisquerías prioriza contratos y aceptación de dispositivos antes de declarar operación física completa. En el estado real, `MostradorPro` ya consume `useFierros` para la báscula y `useMostradorPro` concentra el flujo de venta. La brecha concreta estaba en `ServicioFierros.leerPeso`: el parser aceptaba cualquier número y devolvía únicamente `exito`, `peso`, `unidad` y `mensaje`. No había código de error estable, señal de estabilidad observada, distinción de timeout ni una función pura que pudiera probarse sin Bluetooth.

El contrato heredado `src/sistema/servicios/ContratoHardware.ts` conserva otra forma de API y sigue conectado al slice histórico de Zustand. M6 no lo mezcló con la API canónica ni lo eliminó, porque hacerlo requiere una tarea específica de consolidación del store.

## 3. Trabajo ejecutado

Se amplió `ResultadoPeso` con los campos opcionales `estable`, `cancelado`, `timeout` y `codigoError`. Los campos son opcionales para no afirmar estabilidad física cuando el protocolo no la informa y para mantener compatibilidad con consumidores existentes.

Se creó `servicio/interpretarPeso.ts`, que interpreta respuestas con separador decimal punto o coma, detecta `kg`/`lb`, reconoce `ST` como estable y `US` como inestable, y devuelve `undefined` cuando no existe señal explícita. También se centralizó la construcción de errores para báscula no conectada, timeout y error de comunicación.

`ServicioFierros.leerPeso` ahora delega el parseo a esa función y clasifica los errores de transporte. La pantalla `MostradorPro`, la navegación, los drivers Bluetooth, la impresión y el motor de reparto no fueron modificados.

## 4. Verificación

| Validación | Resultado |
|---|---|
| `npm run check-types` | PASS |
| Suite focalizada del parser | PASS — 1 suite, 6 pruebas |
| Suite global `npm test -- --runInBand` | PASS — 20 suites, 108 pruebas |
| ESLint focalizado | PASS — sin errores ni advertencias en los archivos intervenidos |
| `git diff --check` | PASS |

## 5. Límites declarados

Este cambio no demuestra estabilidad física del peso ni soporte real de cancelación del driver Bluetooth. Solo hace explícitas las señales que el protocolo o la capa de transporte entregan. La integración de misiones entre la RTDB separada de Marisquerías y la proyección MySQL de Servicio a domicilio continúa pendiente y debe resolverse mediante un adaptador idempotente en un frente independiente.

## Referencias internas

1. `docs/planes/ruta_producto_funcional.md` — fases, criterios de aceptación y siguiente acción recomendada.
2. `docs/desfragmentaciones/2026-08-26_desfragmentacion_inventario_mesas_reparto.md` — cierre de la sesión M1–M5 más reciente.
3. `src/ui/bloques/MostradorPro.tsx` — consumidor operativo de la báscula.
4. `src/sistema/impresion/fierros/servicio/ServicioFierros.ts` — implementación de lectura y transporte.
5. `src/sistema/impresion/fierros/contratos/tipos.ts` — contrato canónico de resultados.
6. `src/sistema/servicios/ContratoHardware.ts` y `src/sistema/store/slices/hardware.ts` — contrato y store heredados no consolidados.
