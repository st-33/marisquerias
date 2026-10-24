# Relevo para la siguiente sesión: gobierno del Ecosistema

**Fecha:** 2026-10-22. **Estado:** instrucciones preparadas; auditoría pendiente.

Prioridad: demostrar que el Ecosistema administra y controla correctamente cada cliente, negocio y unidad, no solo que presenta su organización visual. Esta sesión deja el trabajo delimitado; no autoriza depurar bases, migrar datos ni ampliar funciones.

## Punto de partida y evidencia pendiente

- El usuario reporta varios pedidos, una impresión y un recorrido operativo completo. Es evidencia de uso reportada, no certificación exhaustiva ni prueba de aislamiento entre negocios.
- Reporta monitoreo incompleto, datos que no se actualizan y nodos aparentemente ajenos en Unidad y Unidad Secundaria. No se ha recibido ni examinado aquí la exportación de esas bases; su causa y alcance siguen sin confirmar.
- Unidad Central no fue revisada por el usuario en esta prueba. No inferir su estado.
- Timbrado SAT, suscripciones y pagos se registran como requisitos futuros, no como funciones auditadas ni necesariamente implementadas.
- Los ajustes del menú y la serialización están en código y APK, con verificaciones locales registradas en la conversación. No equivalen a aprobación comercial del sistema completo.

## Antes de distribuir el trabajo

Recibir las exportaciones que compartirá el usuario y confirmar repositorio/rama del Ecosistema, versión de cada aplicación, identidad de las unidades y contrato rector vigente. No deducir que la unidad denominada «Unidad» sea la Operativa sin confirmarlo.

Conservar una copia original inmutable con fecha y hash. Trabajar con copia anonimizada fuera de producción; no subir datos personales, códigos de acceso ni credenciales a Git. Inventariar qué fuentes faltan. Una exportación muestra estructura y valores, pero no demuestra qué aplicación escribió cada nodo: se necesita traza de escritores y evidencia de ejecución.

La orden `01_ORDEN_MARISCAL_MARISQUERIAS.md` establece subordinación al contrato rector del Ecosistema. Contrastar dicho contrato con lo que realmente consumen los binarios; esta orden de relevo no redefine rutas ni esquemas.

## Orden A — Mariscal del Ecosistema

**Misión:** auditar el gobierno efectivo desde la interfaz hasta cada unidad.

1. Inventariar botones, acciones y funciones por categoría, nicho, cliente, negocio y unidad. Marcar implementado, incompleto, no implementado o pendiente de verificación.
2. Para cada acción, trazar: interfaz → autorización → servicio → unidad/ruta → consumidor → confirmación visible. Identificar dónde queda solo un cambio visual sin efecto persistido o aplicado.
3. Reproducir primero el monitoreo: registro, conexión reciente, presencia actual, desconexión, reconexión y datos desactualizados. No presentar «última conexión» como «conectado».
4. En entorno de prueba, demostrar una acción de gobierno ya existente sobre un negocio, su aplicación efectiva y que no afecta a otros. Probar rechazo de acciones fuera del alcance autorizado.

**Entregable:** matriz `acción | actor autorizado | cliente/negocio | unidad/ruta | efecto esperado | efecto observado | evidencia | defecto` y agrupación de fallos por causa comprobada, no una solución distinta por botón.

**Límite:** no reescribir Marisquerías ni crear esquemas alternativos para compensar discrepancias.

## Orden B — Mariscal de Datos y Unidades

**Misión:** explicar cada estructura observada antes de proponer una limpieza.

1. Comparar las exportaciones con el contrato rector y los lectores/escritores reales.
2. Clasificar nodos: canónicos, compatibilidad activa, históricos, huérfanos demostrados, duplicados demostrados o desconocidos. Un nombre extraño no prueba que sobre.
3. Rastrear qué escritor crea cada anomalía y qué consumidor depende de ella; incluir procesos del Ecosistema y de aplicaciones conectadas.
4. Comprobar identidad, aislamiento, permisos de lectura/escritura y destino de cada conexión. Priorizar precios, pedidos, cobros y configuración compartida.

**Entregable:** mapa `unidad | ruta | propietario | escritor | lectores | contrato | evidencia | clasificación`, con propuesta de reparación por causa y plan de respaldo, validación y reversión.

**Límite:** auditoría de solo lectura. Ningún borrado, renombrado, migración ni cambio de reglas en vivo. Los nodos desconocidos permanecen pendientes, no se eliminan.

## Orden C — Mariscal de Marisquerías

**Misión:** demostrar que la aplicación opera dentro del gobierno acordado, preservando su lógica operativa.

1. Retomar INC-001 (acceso al regresar) e INC-002 (presencia/monitoreo) de `INCIDENTES_PRUEBA_CAMPO.md`; coordinar INC-002 con el responsable del Ecosistema, sin duplicar correcciones.
2. Documentar las unidades/rutas que lee y escribe para acceso, configuración, catálogo, pedidos, impresión y registro de venta.
3. Repetir creación/edición de producto con variantes, pedido, cocina, impresión y cierre; conservar trazas y resultados. Verificar ausencia de duplicación tras reintento o reconexión.
4. Probar recepción y aplicación de una configuración autorizada del Ecosistema y distinguir caché local de valor remoto vigente.

**Entregable:** recorrido reproducible con versión de APK, negocio de prueba, evidencia por paso, discrepancias y rutas involucradas.

**Límite:** instalación nativa, sin dependencia de Expo Go ni servidor de desarrollo. No modificar lógica ajena al defecto comprobado ni cargar productos ficticios en negocios reales como parte de esta auditoría.

## Orden D — Auditor de integración

**Misión:** contrastar los resultados de los tres mariscales con ejecución independiente, sin aceptar «compila» como prueba funcional.

- Ejecutar en entorno aislado con tres negocios de prueba, incluyendo al menos dos clientes, para comprobar ambos límites de aislamiento.
- Cambiar precio/configuración de uno y verificar que los otros conservan sus valores; intentar acceso cruzado y comprobar su rechazo.
- Comprobar presencia real frente a última conexión y actualización de la consola tras eventos de las aplicaciones.
- Repetir operaciones y reconexiones: no duplicar pedidos, movimientos o registros de venta.
- Asociar cada conclusión a caso reproducible, resultado esperado, observado y evidencia. Marcar explícitamente lo no probado.

**Entregable:** informe de riesgos y bloqueos de salida comercial. No certificar SAT, cobros ni suscripciones sin pruebas específicas de esas integraciones.

## Registro inicial de pendientes

Clasificación inicial: 3 reportes de mecanismo incierto (E) y 1 grupo de requisitos futuros (D). No se han demostrado causas comunes.

| ID | Reporte | Clasificación | Responsable |
|---|---|---|---|
| ECO-01 | Monitoreo no refleja operación/dispositivos | E; vinculado a INC-002 | Ecosistema + Marisquerías |
| ECO-02 | Acciones o datos no se actualizan como se espera | E; falta enumerar acciones y reproducir | Ecosistema |
| DAT-01 | Nodos aparentemente improcedentes en unidades | E; faltan exportaciones y trazas | Datos |
| FUT-01 | Suscripciones, pagos por cliente y timbrado | D; alcance y estado por verificar | Ecosistema, etapa posterior |

Urgente para la auditoría: comprobar aislamiento y autoridad sobre precios y escrituras. Es un riesgo a investigar, no una filtración o alteración confirmada.

## Secuencia de la siguiente sesión

1. Recibir archivos, preservar evidencia y resolver contrato/unidades/repositorios.
2. Ecosistema y Datos reconstruyen el circuito de una acción representativa; Marisquerías aporta las trazas del mismo caso.
3. Consolidar causas comprobadas y acordar el lote mínimo de correcciones antes de modificar.
4. Auditor verifica el lote corregido y los escenarios de aislamiento. Pendientes sin evidencia no se cierran.
5. Solo después, definir contratos de suscripción/pago/timbrado en sus entornos de prueba, sin cobros ni emisión fiscal reales.

**Primer paso al retomar:** abrir este documento y revisar los archivos de bases que entregue el usuario. No comenzar por limpiar nodos ni por añadir botones.
