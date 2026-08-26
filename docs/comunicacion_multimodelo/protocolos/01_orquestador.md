# Protocolo 01 — Orquestador (DeepSeek) · v2

Solo lo edita el orquestador. Ciclo continuo: el sistema **no se detiene** cuando un
agente trabaja o termina; se sigue construyendo y delegando en paralelo.

## 1. Ciclo continuo del orquestador

```text
TRABAJA en el proyecto local (arquitectura, contratos, construcción)
→ DETECTA necesidad delegable (criterios de la sección 3)
→ ESCRIBE M<n>/instruccion.md (plantilla v2: VERSION, ESTADO: NUEVA, SELLO)
→ ACTUALIZA CENTRAL/estado.md si corresponde
→ COMMIT + PUSH (protocolo 03)
→ (el libro de eventos se actualiza solo vía workflow; en local:
   node herramientas/orquestacion/generar_eventos.mjs y commit del libro)
→ SIGUE trabajando; puede publicar más instrucciones mientras otras están activas
```

Sin cola obligatoria: M1 no tiene que terminar para activar M2. Varios agentes pueden
trabajar a la vez; cada uno solo lee su carpeta y su sección del libro de eventos.

## 2. Recepción continua de resultados

```text
git pull (cuando convenga; nunca se bloquea esperando)
→ LEE EVENTOS.json: eventos INFORME_ENTREGADO no absorbidos
→ VERIFICA la evidencia del informe contra el código local real
→ DECIDE en CENTRAL/decisiones.md: ABSORBIDA | CORREGIDA | RECHAZADA
→ ACTUALIZA CENTRAL/estado.md y el mapa real del territorio
→ COMMIT + PUSH
→ Si la decisión requiere más trabajo: nueva instrucción (sección 1)
```

## 3. Criterio de delegación

Se delega cuando **explicar + coordinar + verificar cuesta menos que hacerlo propio**
y la tarea es: repetitiva-verificable, documental con formato definido, exploratoria
acotada con evidencia exigida, o paralelizable sin solapamiento de archivos. Además:

- **Procesos repetibles** (inventarios de consumidores, detección de huérfanos,
  comparación entre ramas, validación de línea base) se convierten en procedimientos
  reutilizables: la instrucción se copia ajustando rutas y agente.
- **División y paralelismo:** dos tareas van a dos agentes solo si sus conjuntos de
  archivos no se tocan; si comparten zona, se secuencian por decisión del orquestador.
- **Verificación cruzada:** cuando un hallazgo es crítico, se encarga a otro agente
  contrastarlo; ambos informes se absorben juntos.

Se conserva en el orquestador: arquitectura, jerarquía, identidad de piezas, contratos,
movimientos reales, integración y decisión final.

## 4. Publicación y recalibración

- La publicación es solo vía Git; la detección es solo vía `EVENTOS.json` (MANIFIESTO).
- Revisar una instrucción activa = editar `instruccion.md` con `VERSION+1` y
  `ESTADO: NUEVA`: el sello cambia y el libro genera un evento nuevo inequívoco.
- Cancelar = `ESTADO: CANCELADA` + registro en `CENTRAL/decisiones.md`.
- Cambios estructurales del propio sistema (protocolos, plantillas, distribución)
  se documentan en `CENTRAL/decisiones.md` antes de aplicarse.
