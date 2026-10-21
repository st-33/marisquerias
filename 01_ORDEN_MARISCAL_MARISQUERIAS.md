# ORDEN DE TRABAJO --- MARISCAL DE MARISQUERÍAS

**Fecha:** 19 de octubre de 2026\
**Ámbito:** Aplicación independiente de la categoría Marisquerías\
**Precedencia:** El contrato rector del Ecosistema define la conexión;
esta orden define la adaptación de Marisquerías.

## 1. Misión

Conectar Marisquerías al Ecosistema mediante el conector canónico de
categoría sin perder su identidad, diseño visual ni lógica operativa
propia. No convertir Marisquerías en una aplicación monolítica ni copiar
indiscriminadamente código del Ecosistema.

## 2. Reglas de categoría

-   El slug esperado de la aplicación es `marisquerias`.
-   El código `MARISQUERIAS-00` corresponde a la plantilla base/entorno
    de pruebas, no a un negocio comercial.
-   Los negocios reales usan `id` de dominio `"01"`, `"02"`, etc.
-   El diseño visual existente debe preservarse salvo orden explícita de
    cambio.
-   Los roles conocidos de Marisquerías son administrador, cocina,
    mesera, menú digital y mostrador. No asumir que todos los negocios
    tienen todos los roles: Puerto Libres no tiene mostrador; El
    Arrecife sí.
-   Servicio a Domicilio/ADIRepart es una categoría/ámbito separado. No
    incrustar sus pantallas o roles en Marisquerías; solo activar una
    capacidad de reparto si el contrato de ese negocio la autoriza y la
    categoría define su comportamiento.

## 3. Trabajo requerido

### A. Conexión

1.  Inspeccionar el arranque actual y documentar cómo resuelve el código
    de acceso.
2.  Integrar `ConectorCategoriaCliente` o adaptar el conector al
    contrato rector publicado, evitando una segunda implementación
    paralela.
3.  Mantener una conexión independiente a Unidad Secundaria para el
    índice de códigos y otra a Unidad Operativa para datos diarios. No
    permitir que cambiar la URL operativa sustituya accidentalmente el
    cliente de Secundaria.
4.  Validar que `slug_categoria === "marisquerias"` antes de habilitar
    acceso a datos operativos.
5.  Usar `db_url_operativa` solo tras validar que la respuesta está
    completa y corresponde a un negocio autorizado.

### B. Capacidades

1.  Obtener las capacidades que ofrece la plantilla base `00` desde la
    ruta canónica aprobada.
2.  Obtener las capacidades autorizadas del negocio real desde el
    registro de acceso/configuración autorizado.
3.  Calcular la intersección únicamente conforme al contrato rector.
4.  Derivar cajones, pantallas y roles de las capacidades activas y de
    la configuración de Marisquerías.
5.  Eliminar catálogos redundantes solo después de demostrar que no
    tienen consumidores. No introducir `cajones_autorizados` o
    `roles_autorizados` como nuevos catálogos duplicados.
6.  Una capacidad ausente o no autorizada debe permanecer desactivada
    por defecto.

### C. Sesión y operación sin conexión

-   Documentar el uso de `deviceIdADI`, la persistencia de sesión y la
    expiración.
-   Al revocar código o negocio, bloquear nuevas operaciones remotas y
    cerrar la sesión conforme a la política aprobada.
-   No borrar pedidos, ventas ni otra información local pendiente de
    sincronización por una revocación.
-   Distinguir datos locales pendientes de datos confirmados en RTDB.
-   Liberar listeners al cerrar sesión o desmontar la aplicación.

### D. Unidad Operativa

Mantener los datos cotidianos del negocio en su Unidad Operativa: menú,
mesas, pedidos, ventas, inventario y demás estructuras que la Fuente de
Verdad de Marisquerías defina. No mover datos operativos a Central ni
duplicarlos en Secundaria.

### E. Compatibilidad de rutas

Inspeccionar el acceso heredado a rutas como
`${slug}/Negocio principal de categoría`, rutas con `negocios/` plural y
cualquier fallback antiguo. Clasificar cada referencia como vigente,
compatibilidad temporal o retirada. No mantener dos rutas como
autoridades simultáneas y no borrar el fallback antes de probar todos
sus consumidores.

## 4. Pruebas obligatorias

-   `MARISQUERIAS-00` abre solo el contexto de plantilla/pruebas.
-   Un código válido de Marisquerías entra al negocio correcto.
-   Un código de otra categoría se rechaza antes de conectar la Unidad
    Operativa.
-   Un código inexistente, revocado o suspendido se rechaza.
-   Capacidades no autorizadas no habilitan pantallas, roles ni
    operaciones.
-   Puerto Libres no muestra mostrador si no está
    autorizado/configurado.
-   El Arrecife conserva mostrador cuando corresponde.
-   La pérdida de red conserva pedidos/ventas locales pendientes.
-   La revocación libera listeners y no borra datos locales pendientes.
-   Fallo de lectura de Secundaria no provoca fallback a una búsqueda
    global no acotada.
-   Reglas de Firebase impiden acceder a la Unidad Operativa de otro
    negocio.
-   Alta y eliminación coordinadas cubren fallos parciales y
    recuperación.

## 5. No hacer

-   No cambiar el diseño visual por conveniencia de la integración.
-   No copiar grandes bloques desde el proyecto histórico
    `mi-ecosistema-adi`.
-   No crear otra clase con el mismo propósito que
    `ConectorCategoriaCliente`.
-   No inventar campos para "hacer más explícito" algo que ya tiene una
    fuente canónica.
-   No purgar rutas antiguas ni datos de Firebase sin inventario de
    consumidores, respaldo/plan de recuperación y autorización.
-   No declarar pruebas de integración real si solo se usaron mocks.

## 6. Entrega del Mariscal

Entregar una tabla con: requisito, archivo/función afectada, evidencia
antes, cambio, prueba, resultado y pendiente. Adjuntar el resultado
completo de `npx tsc --noEmit` y de las suites ejecutadas. Si el
contrato del Ecosistema aún no define una ruta o campo, detener solo esa
parte y reportar la contradicción exacta; no inventar una solución
local.
