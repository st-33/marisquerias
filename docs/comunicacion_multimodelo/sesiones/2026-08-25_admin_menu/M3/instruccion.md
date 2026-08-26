# Tarea T-M3-01 — Mapa de duplicación y contratos internos del menú

| Campo | Valor |
|---|---|
| ID | `T-M3-01` |
| VERSION | `1` |
| Sesión | `2026-08-25_admin_menu` |
| Agente | M3 |
| Publicada | `2026-08-26 05:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Identificar la **duplicación real** y los **contratos** del módulo Menú: la escritura
dual de `menu.repo.ts` (flat / nested / índice), el contrato de variantes y el de
visibilidad, y señalar incoherencias entre capas.

## 2. Contexto mínimo
`menu.repo.ts` es infraestructura de persistencia compartida (POS, mostrador, mesero y
menú). Interesa entender su deuda de coherencia sin proponer todavía una migración.

## 3. Ruta inicial
`src/sistema/persistencia/menu.repo.ts`

## 4. Alcance
- `src/sistema/persistencia/menu.repo.ts`
- `src/capacidades/menu/useMenuManagement.ts`
- `src/ui/bloques/VariantEditor.tsx` y `src/ui/bloques/VariantsModal.tsx`
- `src/roles/logica/mesero/rules.ts` (solo como consumidor del contrato de variantes)

## 5. Límites
Solo lectura. No edites código ni propongas commits.

## 6. Qué verificar
1. En `menu.repo.ts`: dónde se escribe/lee flat, nested y `productos_index`; qué mutaciones
   tocan más de una ubicación; qué heurística de reparación existe.
2. Contrato de variantes: campos de `variantes` (grupos, reglas, orden) que persisten en el
   editor y que consume el motor del mesero; dónde divergen.
3. Contrato de visibilidad: campos `activo`, `visible.*`, `herencia.*` en producto y
   categoría; quién los escribe y quién los filtra.
4. Señalar solapamientos funcionales (dos piezas que hacen lo mismo) si existen.

## 7. Evidencia que debe producir
Un apartado por punto con tabla de hallazgos: `| hallazgo | evidencia (archivo:línea) | riesgo |`.
Cierra con una lista de "incoherencias entre capas" priorizadas (P0/P1/P2).

## 8. Puede modificar
Ninguno. Solo tu carpeta `M3/`.

## 9. No puede modificar
Código, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`, `ACTIVACIONES.json`, `MANIFIESTO.md`.

## 10. Qué debe documentar
El informe con los cuatro puntos y la lista priorizada.

## 11. Cuándo hacer commit
Un commit al entregar: `docs(multimodelo/M3): mapa de duplicación y contratos menú`.

## 12. Qué debe reportar
Los hallazgos con evidencia y la priorización.

## 13. Condición de terminado
Los cuatro puntos tienen al menos un hallazgo con evidencia o una afirmación explícita
"sin duplicación detectada" justificada.

## 14. Si encuentra una contradicción
Reportarla; no asumas.

## 15. Si la pieza ya fue movida
Rastro → destino → continúa.

## 16. Si necesita salir del límite
Detente y repórtalo.
