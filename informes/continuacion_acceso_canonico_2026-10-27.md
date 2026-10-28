# Entrega para continuar en Codex: acceso canónico Ecosistema / Marisquerías

Registro: 2026-10-27T19:04:21-06:00 (America/Mexico_City).
Estado: avance en curso publicado por instrucción fundadora. No es cierre funcional ni despliegue.
Rama autorizada: main en ambos repositorios, sin crear ramas nuevas.
Repositorios: st-33/Ecosistema y st-33/marisquerias.
Bases remotas consultadas: Ecosistema c83bc6fe10703034bc3ab64b364ce955d26a2bac; Marisquerías 9ae5794bcf24951ec38990c765058de090c908b5.
Se contrastaron los hashes base de todos los archivos modificados contra main remoto: sin divergencias en esos archivos. La publicación conserva los demás archivos remotos.

## Decisiones que deben conservarse

- Índice secundario: codigo_de_acceso/CODIGO_EN_MAYUSCULAS contiene únicamente una ruta string: nicho/categoria/negocio/nombre_registrado. No volver a escribir objetos duplicados en el índice. La revocación elimina la referencia, sin borrar el negocio.
- El nombre registrado determina el nodo de negocio; el consecutivo administrativo (01, 02…) se guarda como dato. Revisar colisiones y relaciones sin recrear IDs redundantes.
- Central gobierna relaciones administrativas; Secundaria contiene plantilla y configuración; cada negocio dispone de una RTDB operativa propia, incluso si comparte cliente o categoría.
- URL operativa, versión NPB de origen y autorizaciones se leen del negocio apuntado. El índice no las duplica.
- Conservar histórico NPB y bitácora. Un negocio en v1 no se migra automáticamente por existir una plantilla v2.
- No generar _control_ecosistema ni rellenos _control en la RTDB operativa.
- No demostrar el circuito con escrituras REST o datos prefabricados sobre Firebase. Usar orquestadores e interfaz real.
- Android: elegir perfil con un toque, sin segunda contraseña individual en ese paso; no afirmar autenticación personal inexistente.
- La instrucción fundadora de trabajar en main prevalece sobre la indicación antigua rama-2 de AGENTS.md de Marisquerías. El protocolo M1–M5 no corresponde a una asignación de subagente de esta entrega.

## Cambios incluidos

Ecosistema:
- Contrato CodigoAccesoNodo como string y helper indice_acceso.ts; lectura heredada limitada sin reescritura automática.
- Productor crear_negocio_real.ts: ruta por nombre registrado, consecutivo administrativo y reservas por transacción; compensación limitada a nodos creados por la operación.
- Lectores validar_codigo_acceso.ts, conector_categoria_cliente.ts y codigos_de_negocio.ts: índice -> negocio -> plantilla/versionado.
- Ficha de negocio: use_acceso_negocio.ts separa carga, fallo de consulta, presencia del código y estado del negocio; retirada del bloque de diagnóstico de esa ficha.
- Preparación operativa y tipos: retirada de marcadores de control del alcance editado. Esto no acredita purga completa del repositorio ni de datos vivos.
- Sellado NPB: conserva el histórico dentro del nuevo payload para evitar borrarlo al reemplazar la raíz de la plantilla.
- Reglas secundarias adaptadas al índice string, sin desplegarlas.

Marisquerías:
- resolver-access-code.ts resuelve índice y lee URL, versión y capacidades del negocio.
- cargarNPB.ts recibe ruta completa derivada de pertenencia; carga histórico de la versión asignada, sin nicho fijo.
- Arranque y persistencia conservan ruta NPB.
- encenderCapacidades.ts exige true explícito en mapas y no hereda todo ante ausencia de autorización en un negocio real; restaurada declaración de roles usada por el motor.
- Selector de perfiles actualiza clave de rol y conserva contexto de sesión; evita volver a hashear el hash y perder la ruta de plantilla.
- POS protege acceso a inventoryRepo cuando es null.

## Evidencia de verificación

- npx tsc --noEmit: pasa en ambos checkouts. Se generó expo-env.d.ts local con referencia a expo/types; es archivo generado/ignorado y no se publica como código fuente.
- Ecosistema: 20 suites, 14 pasan y 6 fallan; 240 pruebas, 212 pasan y 28 fallan.
- Marisquerías: 36 suites, 32 pasan y 4 fallan; 241 pruebas, 200 pasan y 41 fallan.
- Pasan 8 pruebas nuevas del índice, 4 nuevas del acceso canónico, 4 del motor de capacidades y 64 de gobierno/auditoría: 80 focalizadas.
- Lint focal de los cuatro archivos editados en la continuación de Marisquerías: corregido con eslint --fix, ejecución exitosa.
- No se ejecutaron escrituras Firebase, despliegue de reglas, compilación/instalación Android ni prueba visual web en esta continuación.

## Orden de trabajo para Codex

1. Abrir ambos main publicados y leer este reporte. Reproducir TypeScript y Jest con dependencias del proyecto. No confundir las 80 focalizadas con una batería integral aprobada.
2. Resolver las suites fallidas listadas abajo. Hay fixtures y expectativas antiguas (índice objeto, rutas cortas, nombres secuenciales), además de integración pendiente. Revisar cada fallo; no dar por hecho que todos son obsolescencia ni borrar pruebas para obtener verde.
3. Alta gobernada: comprobar nombre registrado, consecutivo, colisiones de código/ruta/ID, transacciones y compensación con fallos parciales y concurrencia. Confirmar persistencia y derivación de relaciones Central/Secundaria. Revisar que compensaciones no dejen relaciones parciales en fallos de auditoría o de una segunda base.
4. Acceso/revocación: comprobar inexistente, revocado por eliminación, negocio inactivo, ruta inválida, URL ausente, versión no disponible y capacidades/roles no autorizados. Revisar coherencia entre los tres consumidores de acceso y suscripciones activas; no permitir roles adicionales ni perfiles ficticios por defecto.
5. Histórico NPB: probar varios resellados sucesivos y lectura de una versión antigua; revisar consistencia Central/Secundaria, concurrencia y recuperación ante fallos. No alterar automáticamente las versiones de negocios existentes.
6. Datos vivos: leer y contrastar exportaciones actuales con productores/lectores; preparar migración gobernada mínima del índice y redundancias confirmadas. Ningún cambio en el código de esta entrega migró la RTDB existente.
7. Interfaz: verificar tarjetas Nicho/Categoría/Negocio/Cliente con información correspondiente, IDs consecutivos, código visible correcto y estados coherentes. Verificar retirada completa del diagnóstico solicitado; sólo se comprobó por código la ficha de negocio editada.
8. Probar vinculación -> perfil -> operación persistida, primero con circuito real y luego Android en equipo disponible; venta/cobro/ticket físico pendientes. Si falla, registrar el punto exacto sin declarar producto terminado.
9. Actualizar contratos/documentación que aún describan el índice objeto o rutas antiguas y alinear reglas antes del despliegue. Mantener intactos los históricos y los datos manuales ajenos al cambio.

## Suites fallidas al entregar


### Ecosistema

- tests/altaNegocio.test.ts: 11 fallos.
- ecosistema/logica/__tests__/validar_codigo_acceso.test.ts: 4 fallos.
- tests/flujo_acceso_npb_y_negocio.test.ts: 5 fallos.
- tests/alineacion_multi_rtdb.test.ts: 3 fallos.
- tests/eliminacion_coordinada.test.ts: 1 fallos.
- tests/conector_categoria_cliente.test.ts: 4 fallos.


### marisquerias

- src/sistema/instalacion/npb/__tests__/flujoVinculacion.integration.test.ts: 17 fallos.
- src/sistema/instalacion/pruebas/ensamblador-instalacion.test.ts: 6 fallos.
- src/sistema/instalacion/pruebas/resolver-access-code.test.ts: 15 fallos.
- src/sistema/instalacion/npb/__tests__/arranqueO1.integration.test.ts: 3 fallos.

## Alcance de la publicación

Se publica el avance existente con fallos conocidos por instrucción explícita de la Intención Fundadora para continuar en Codex. Un commit actualizado no instala APK, no cambia automáticamente una aplicación desplegada y no migra Firebase. Esta entrega no afirma que el acceso de los datos vivos funcione aún.
