# INSTRUCCION: PRIMITIVOS Y BLOQUES

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 02

## ORIGEN

- Terminos: PRIMITIVO, BLOQUE, COMPONENTE, TARJETA, BADGE, BOTON, CAMPO DE ENTRADA VISUAL, ICONO.
- Formulas: componente + paleta + tipografia = componente_consistente.
- Reglas: CONSISTENCIA VISUAL (rubro en reglas_diseno.md).
- Codigo real inspeccionado: `src/ui/primitivos/*`, `src/ui/bloques/*`, `src/compartido/componentes/ui/*`.

## PASO 01: PRIMITIVOS DE INTERFAZ

### ESPECIFICACION

- Los primitivos (elemento minimo indivisible) viven en `src/ui/primitivos/` (ej. AtmosphereLayer).
- Un primitivo no puede subdividirse sin perder significado.

## PASO 02: BLOQUES REUTILIZABLES

### ESPECIFICACION

- Los bloques viven en `src/ui/bloques/`: ActionArea, Badge, FabRadial, OrderItemCard, TarjetaComanda, MostradorPro, VariantsModal.
- Un bloque es una subdivision funcional que agrupa elementos relacionados por proposito.

## PASO 03: COMPONENTES COMPARTIDOS DE UI

### ESPECIFICACION

- Los componentes compartidos viven en `src/compartido/componentes/ui/`: AnimatedButton, Card, ModernAlert, PulsingCard, TableBadge, Toast.
- Todo componente conserva su identidad funcional en cualquier pantalla y respeta paleta, tipografia y espaciado.

## PASO 04: BOTONES Y ESTADOS

### ESPECIFICACION

- El boton primario ejecuta la accion principal y cubre: normal, pressed, loading, disabled, success/error.
- El boton secundario cubre: normal, pressed, disabled.
- Todo boton declara su disparo; quedan prohibidos los controles sin consecuencia comunicada.

## PASO 05: CAMPOS Y BADGES

### ESPECIFICACION

- El campo de entrada visual cubre los estados: empty, focused, filled, invalid, disabled.
- El badge comunica un estado breve mediante texto, icono o ambos, sin depender unicamente del color.
