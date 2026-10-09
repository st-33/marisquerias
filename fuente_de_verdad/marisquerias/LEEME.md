# LEEME · ORQUESTADOR MAESTRO DE MARISQUERIAS

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Categoria padre: Marisquerias
- Tipo de artefacto: APK / Web (Expo/React Native + Firebase RTDB)
- Autoridad de redaccion: Mariscal del Proyecto
- Regla de gobierno: Se rige por las leyes, terminos y formulas de la Fuente de Verdad principal sin contradecirlas.

## 1. PROPOSITO

Este archivo es el indice de orquestacion del aplicable Marisquerias: sistema de punto de venta y toma de comandas para el giro de marisqueria. Declara el flujo de inicializacion, la frontera de soberania con Unidad Central (Ecosistema ADI APP) y la secuencia de dependencias entre las fases de construccion y diseno.

## 2. FLUJO DE INICIALIZACION

1. **Arranque**: `app/index.tsx` redirige a `/access`; `useBootstrapper()` hidrata el estado global.
2. **Instalacion y vinculacion**: `ContratoInstalacion { accessCode, aliasDispositivo? }` valida el codigo de acceso y vincula el dispositivo (`DispositivoVinculado` con `deviceIdADI`).
3. **Resolucion de rol**: el empaquetador de roles lee `{rutaNegocio}/caracteristicas` y `{rutaNegocio}/features` para habilitar capacidades.
4. **Gobierno remoto (solo lectura)**: `CentralListener` escucha `central/negocios/{negocio_id}/configuracion` y `.../estado` en modo unidireccional.
5. **Operacion**: el aplicable gobierna sus subarboles operativos bajo `{rutaNegocio}/*` (`pedidos`, `menu`, `inventario`, `ventas`, `tickets`).

## 3. FRONTERA DE SOBERANIA CON UNIDAD CENTRAL

- **Unidad Central (Ecosistema ADI APP)** retiene el control exclusivo de: `codigos_acceso`, `negocios_registrados`, `dispositivos_registrados`, generacion de `deviceIdADI` y entrega unidireccional de configuraciones de gobierno.
- **Aplicable Marisquerias** gobierna soberanamente sus subarboles operativos bajo `{rutaNegocio}/*` sin escribir ni interferir en la RTDB central.
- **Frontera unidireccional**: Marisquerias solo LEE y ESCUCHA a Unidad Central; nunca escribe en `central/*`.
- **Cero bloqueos sincronos**: si Unidad Central no responde, la operacion local continua.

## 4. SECUENCIA DE DEPENDENCIAS

### Manual de Construccion

| Fase | Nombre | Depende de |
| --- | --- | --- |
| FASE 01 | Arranque y arquitectura base | — |
| FASE 02 | Roles operativos y control de acceso | FASE 01 |
| FASE 03 | Comandas y elaboracion | FASE 02 |
| FASE 04 | Menu y productos | FASE 02 |
| FASE 05 | Inventario y despacho por peso | FASE 04 |
| FASE 06 | Impresion y tickets | FASE 03 |
| FASE 07 | Reparto y logistica | FASE 02 |
| FASE 08 | Metricas y cierre de jornada | FASE 03, FASE 05 |

### Manual de Diseno

| Fase | Nombre | Depende de |
| --- | --- | --- |
| FASE 01 | Fundamentos de marca | — |
| FASE 02 | Primitivos y bloques | FASE 01 |
| FASE 03 | Pantallas por rol | FASE 02 |
| FASE 04 | Estados visuales y retroalimentacion | FASE 02 |
| FASE 05 | Superposiciones, navegacion y responsive | FASE 02, FASE 03 |

## 5. GOBIERNO Y LIMITES

- Todo conocimiento teorico, termino, formula y regla de giro pertenece a la Fuente de Verdad bajo `Alcance: Categoria: Marisquerias`.
- Todo conocimiento tecnico de framework (React Native, Expo, Firebase Client, ESC/POS, Bluetooth) pertenece al proyecto, no a la Fuente general.
- Prohibido promover conocimiento del giro a nivel Ecosistema sin justificacion formal y autorizacion fundadora (clave "tomate", sello "aprobado").
