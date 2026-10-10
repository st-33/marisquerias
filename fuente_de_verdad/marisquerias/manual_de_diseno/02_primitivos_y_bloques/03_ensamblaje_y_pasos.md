# ENSAMBLAJE Y PASOS: PRIMITIVOS Y BLOQUES
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

Pasos normativos de construcción visual del subsistema `02_primitivos_y_bloques`.
Cada paso hace referencia a los contratos definidos en `02_contratos_y_tipos.md`
(secciones indicadas entre paréntesis). La construcción avanza del nivel más
pequeño (primitivo) al más completo (componente), reutilizando lo ya aprobado.

## PASO 01: Montar los primitivos mínimos

### ESPECIFICACION
- Se construyen las piezas indivisibles en `src/ui/primitivos/` (sección 3),
  empezando por el `AtmosphereLayer` que aplica el fondo profundo del
  subsistema de fundamentos.
- Cada primitivo depende solo de los tokens de paleta, tipografía y forma ya
  consolidados; no introduce colores ni tamaños propios.
- Condición de terminado: un primitivo no se puede dividir más sin dejar de
  cumplir su función, y ninguno rompe la disciplina heredada de fundamentos.

## PASO 02: Armar los bloques sobre los primitivos

### ESPECIFICACION
- Se agrupan primitivos en bloques funcionales dentro de `src/ui/bloques/`
  (sección 3): `ActionArea`, `Badge`, `FabRadial`, `OrderItemCard`,
  `TarjetaComanda`, `MostradorPro`, `VariantsModal`.
- Cada bloque cumple un propósito concreto (una tarjeta de plato, una fila de
  mesa, una comanda) usando primitivos ya aprobados, sin rediseñar piezas.
- Condición de terminado: cada bloque declara su contenido y su función con el
  espaciado y el radio que le corresponden según el contrato de fundamentos.

## PASO 03: Elevar bloques a componentes compartidos

### ESPECIFICACION
- Se elevan a estándar reutilizable los componentes de
  `src/compartido/componentes/ui/` (sección 3): `AnimatedButton`, `Card`,
  `ModernAlert`, `PulsingCard`, `TableBadge`, `Toast`.
- Un componente es un bloque ya pensado para repetirse tal cual, cambiando solo
  su contenido; conserva identidad funcional en cualquier pantalla (invariante
  3).
- Condición de terminado: el mismo componente aparece idéntico (salvo
  contenido) en todas las pantallas que lo usan.

## PASO 04: Definir botones y campos con sus estados

### ESPECIFICACION
- El botón primario implementa los seis estados del contrato (sección 1):
  `normal`, `pressed`, `loading`, `disabled`, `success`, `error`.
- El botón secundario implementa tres estados: `normal`, `pressed`, `disabled`.
- El campo implementa cinco estados: `empty`, `focused`, `filled`, `invalid`,
  `disabled`.
- Condición de terminado: cada estado es visualmente distinto y se asocia a un
  token de la paleta semántica (loading/éxito/error), y todo botón declara su
  disparo — prohibido `onPress` vacío o control sin consecuencia (invariante 3).

## PASO 05: Definir tarjetas y badges por contexto

### ESPECIFICACION
- El `Badge` implementa cinco estados `info`, `success`, `warning`, `danger`,
  `neutral`, con texto + icono para que el significado nunca dependa solo del
  color (fundamentos, invariante 4).
- La tarjeta de producto cubre sus contextos: disponible, agotado,
  seleccionado, error (sección 2). La tarjeta de comanda cubre: recibida,
  preparación, lista, entregada, pendiente.
- El `Modal` implementa cuatro estados: `abierto`, `cargando`, `error`,
  `cerrado`. El empty state cubre `sin_datos`, `sin_conexion`,
  `filtro_sin_coincidencias`. El banner de conexión cubre `conectado`,
  `reconectando`, `offline`, `pendiente`.
- Condición de terminado: cada estado de cada pieza es reconocible de un vistazo
  y se distingue por significado, no por decoración.

## PASO 06: Verificar el mapa de archivos y las invariantes

### ESPECIFICACION
- Se comprueba que los tres niveles existen en sus rutas reales: primitivos en
  `src/ui/primitivos/`, bloques en `src/ui/bloques/`, componentes compartidos en
  `src/compartido/componentes/ui/` (sección 3).
- Se verifican las invariantes (sección 4): todo botón declara su disparo; todo
  componente conserva identidad funcional; cada nivel hereda la misma semántica
  de color, espaciado y forma.
- Condición de terminado: una pantalla nueva se puede armar combinando solo
  primitivos y bloques ya aprobados, sin introducir piezas fuera del mapa.
