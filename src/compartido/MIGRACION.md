# MIGRACION · SANEAMIENTO DE RESIDUOS DE ECOSISTEMA ADI APP

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09

## PURGA EJECUTADA

1. **`src/compartido/ecosistema/`** — eliminado en su totalidad.
   - `components/NodeCard.tsx`: tarjeta de grafo de "estrategias/oportunidades" del Ecosistema ADI APP.
   - `data/ecosystemMock.ts`: grafo mock de nodos de estrategia (modulo-voz, estrategia-velocidad, etc.).
   - Motivo: codigo muerto. Cero importaciones vivas en `app/` y `src/`. Su ruta de destino (`/node/{id}`) no existe en `app/`.
2. **`tsconfig.json`** — eliminado el alias `@ecosistema/*` que apuntaba al directorio purgado.

## CORRECCION DE INTEGRIDAD EN LA FUENTE

- **`fuente_de_verdad/estructura_unidad_central.md`** — corregido el caracter ideografico infiltrado en el campo `ultima_conexion` del nodo `dispositivos_registrados` (linea 401), restaurando la nomenclatura snake_case canonica.

## RESIDUOS DOCUMENTADOS (NO PURGADOS EN ESTA TANDA)

Por estar integrados al runtime del negocio, se documentan pero no se eliminan (requieren renombrado quirurgico en tanda futura):

- `src/sistema/instalacion/vinculacion/generar-device-id-adi.ts` — su sufijo `adi` es residuo de nomenclatura, pero es el generador de identidad de dispositivo del negocio (importado por instalacion, seguridad, pos y devices).
- `src/sistema/central/` y `src/sistema/store/slices/central.ts` — frontera que escucha la configuracion remota del negocio (`central/negocios/{id}/configuracion`). Es abstraccion legitima de gobierno del runtime; su nombre proviene de Unidad Central pero no es codigo muerto.
- `src/sistema/tipos/contratos.ts` — contiene `ContratoDataSources` con multiples RTDB (`repartoUrl`, `perfilesUrl`) heredados de Ecosistema; se conservan por compatibilidad de tipos.
