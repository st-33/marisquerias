# [M3] Informe de validación de ajustes de Reparto

| Campo | Valor |
|---|---|
| Agente | M3 |
| Repositorio | `st-33/marisquerias` |
| Rama operativa | `rama-2` |
| Fecha/hora UTC | `2026-08-28 02:42:33 UTC` |
| Zona | `src/capacidades/reparto/` y `src/ui/roles/administrador/reparto/` |
| Estado | IMPLEMENTADO Y VALIDADO |
| Alcance | Validación de ajustes administrativos de Reparto; no se tocó la RTDB de misiones ni la integración logística de M2 |

## Resumen

Después de actualizar la rama operativa y revisar el manifiesto, la sesión activa y los informes absorbidos, confirmé que la reorganización de Reparto ya fue realizada por el orquestador: `admin_repart` está registrado, `app/_role/admin/repart.tsx` es un contenedor fino y la pantalla vive en `PantallaReparto`. Por ello no repetí esa integración.

La zona libre de solapamiento con mayor valor técnico fue la frontera de **ajustes administrativos de Reparto**. El informe previo de M3 había dejado documentado que la pantalla enviaba incrementos y cambios sin validación de rangos y que las promesas de guardado no tenían feedback de error. M2, en cambio, ya trabajó la cadena negocio → misión logística; esa zona no fue modificada.

## Cambios realizados

| Archivo | Cambio | Clasificación |
|---|---|---|
| `src/capacidades/reparto/validarAjustes.ts` | Nuevo validador puro para umbrales, costos y ventanas. Rechaza valores no finitos, negativos, umbrales fraccionarios, horas inválidas y ventanas invertidas. | EXCLUSIVA_REPARTO |
| `src/capacidades/reparto/index.ts` | Exporta el validador sin alterar el export existente de `useGestionReparto`. | EXCLUSIVA_REPARTO |
| `src/capacidades/reparto/useGestionReparto.ts` | Valida cada parche antes de llamar a `RepartoAjustesRepository`; se conserva la API de acciones existente. | EXCLUSIVA_REPARTO |
| `src/ui/roles/administrador/reparto/PantallaReparto.tsx` | Captura errores de guardado y los muestra mediante `Alert`; no cambia la navegación ni el contrato visual de tarjetas. | EXCLUSIVA_REPARTO |
| `src/capacidades/reparto/__tests__/validarAjustes.test.ts` | Ocho pruebas unitarias puras para valores válidos, negativos, fraccionarios, no finitos, importes decimales y ventanas horarias. | EXCLUSIVA_REPARTO |

No se modificaron `src/sistema/persistencia/reparto-ajustes.repo.ts`, `src/sistema/persistencia/reparto.repo.ts`, Firebase, RTDB, `REGISTRO_PANTALLAS`, capacidades compartidas, carpetas de otros modelos, `CENTRAL/`, `EVENTOS.json` ni `ACTIVACIONES.json`.

## Decisiones técnicas

La validación vive en la capacidad, no en la pantalla ni en el repositorio RTDB. Esto mantiene la regla existente de que la UI no accede directamente a Firebase y evita que otro consumidor de `useGestionReparto` pueda saltarse la frontera. El validador trabaja sobre parches parciales, por lo que no cambia la forma actual de las escrituras.

Los umbrales se validan como números enteros no negativos. Los costos admiten decimales no negativos. Las ventanas usan `HH:MM`, deben representar una hora válida de 24 horas y deben tener inicio anterior al fin. No se fijaron máximos de negocio no demostrados por el contrato actual; imponerlos requeriría una decisión del Orquestador o del dueño del dominio.

La pantalla mantiene los tres gestos existentes y únicamente convierte el rechazo de la capacidad o un fallo RTDB en un mensaje visible. No se inventan datos, estados de misión ni reglas de asignación.

## Evidencia de coordinación

El manifiesto vigente identifica `rama-2` como rama operativa única de `st-33/marisquerias` y `main` como espejo alineado, no como rama de trabajo. El `EVENTOS.json` solo contenía la instrucción histórica `T-M3-01`, ya reportada; el `estado.md` de M3 confirmó que la UI de Reparto estaba reunida y que la integración con `REGISTRO_PANTALLAS` ya había sido absorbida posteriormente por el orquestador. La desfragmentación del 26 de agosto confirma que `admin_repart` ya estaba normalizado y que la deuda restante de calidad estaba en los ajustes y pruebas directas.

La única zona modificada es la autorizada para piezas exclusivas de Reparto: capacidad, pantalla, barril y pruebas focalizadas dentro del mismo dominio. M1/M2 no tienen cambios locales pendientes en este clon y la integración logística de M2 quedó fuera de la edición.

## Validaciones ejecutadas

| Comando | Resultado |
|---|---|
| `npm run check-types` | Verde, sin errores TypeScript. |
| `npx jest src/capacidades/reparto/__tests__/validarAjustes.test.ts --runInBand` | Verde: 1 suite, 8 pruebas. |
| `npm test -- --runInBand` | Verde: 22 suites, 126 pruebas. |
| `npx eslint src/capacidades/reparto/validarAjustes.ts src/capacidades/reparto/useGestionReparto.ts src/ui/roles/administrador/reparto/PantallaReparto.tsx` | Verde, sin salida de errores. |
| `git diff --check` | Verde. |

## Dependencias y bloqueos

No existe bloqueo para esta unidad. Queda una dependencia externa no resuelta: los límites máximos de umbral, SLA y costos no están definidos por el contrato actual; por eso solo se aplicaron invariantes de seguridad y forma. La relación entre los ajustes administrativos en la RTDB operativa y las misiones en la RTDB alias `reparto` continúa siendo una decisión del Orquestador/integración, y no fue alterada.

La instrucción del usuario solicita commit en la rama principal. El manifiesto operativo vigente establece que `rama-2` es la rama principal de trabajo y que `main` es espejo; por coherencia con la autoridad común, el commit se realizará en `rama-2` y se dejará su referencia para que el Orquestador sincronice el espejo si corresponde.

## Siguiente estado

**IMPLEMENTADO Y VALIDADO.** El cambio está listo para commit en `rama-2`. La siguiente decisión corresponde al Orquestador: absorber el endurecimiento de validación, definir límites de dominio superiores si los necesita y mantener separadas las superficies de ajustes y misiones.
