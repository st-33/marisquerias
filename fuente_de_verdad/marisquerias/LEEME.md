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

## 4. SECUENCIA DE DEPENDENCIAS (ESTRUCTURA FRACTAL)

### Manual de Construccion (10 subsistemas)

| Subsistema | Depende de |
| --- | --- |
| 01_arranque_y_motor | — |
| 02_roles_y_permisos | 01 |
| 03_comandas_y_salon (incluye kds/) | 02 |
| 04_menu_y_variantes | 02 |
| 05_inventario_bascula_despacho (incluye bascula/) | 04 |
| 06_impresion_escpos (incluye esc_pos/) | 03 |
| 07_mostrador_venta_crudo | 05 |
| 08_reparto_y_logistica | 02 |
| 09_metricas_y_cierres | 03, 05 |
| 10_persistencia_local (incluye sqlite/) | transversal |

### Manual de Diseno (5 subsistemas)

| Subsistema | Depende de |
| --- | --- |
| 01_fundamentos_de_marca | — |
| 02_primitivos_y_bloques | 01 |
| 03_pantallas_por_rol | 02 |
| 04_estados_y_retroalimentacion | 02 |
| 05_superposiciones_y_navegacion | 02, 03 |

### Doble nivel por subsistema

Cada subsistema separa `01_conceptos_y_reglas.md` (lenguaje comun) y `02_contratos_y_tipos.md` (OpenSpec/TypeScript), mas `03_ensamblaje_y_pasos.md`.

## 5. GOBIERNO Y LIMITES

- Todo conocimiento teorico, termino, formula y regla de giro pertenece a la Fuente de Verdad bajo `Alcance: Categoria: Marisquerias`.
- Todo conocimiento tecnico de framework (React Native, Expo, Firebase Client, ESC/POS, Bluetooth) pertenece al proyecto, no a la Fuente general.
- Prohibido promover conocimiento del giro a nivel Ecosistema sin justificacion formal y autorizacion fundadora (clave "tomate", sello "aprobado").
