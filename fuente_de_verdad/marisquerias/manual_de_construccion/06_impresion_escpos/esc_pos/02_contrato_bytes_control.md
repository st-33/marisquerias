# CONTRATO ESC/POS — BYTES DE CONTROL Y CONSTRUCTOR

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 06_impresion_escpos/esc_pos

## 1. TABLA DE COMANDOS (FIRMAS REALES)

```typescript
const COMANDOS_ESCPOS = {
  INIT:          [0x1b, 0x40],        // ESC @   — reset impresora
  LF:            [/* avance de linea */],
  ALIGN_LEFT:    [0x1b, 0x61, 0x00],  // ESC a 0
  ALIGN_CENTER:  [0x1b, 0x61, 0x01],  // ESC a 1
  ALIGN_RIGHT:   [0x1b, 0x61, 0x02],  // ESC a 2
  BOLD_ON:       [0x1b, 0x45, 0x01],  // ESC E 1
  BOLD_OFF:      [0x1b, 0x45, 0x00],  // ESC E 0
  DOUBLE_ON:     [0x1d, 0x21, 0x11],  // GS ! 17 — doble alto y ancho
  DOUBLE_OFF:    [0x1d, 0x21, 0x00],  // GS ! 0
  UNDERLINE_ON:  [0x1b, 0x2d, 0x01],  // ESC - 1
  UNDERLINE_OFF: [0x1b, 0x2d, 0x00],  // ESC - 0
  FONT_NORMAL:   [0x1b, 0x4d, 0x00],  // ESC M 0
  FONT_SMALL:    [0x1b, 0x4d, 0x01],  // ESC M 1
  CODEPAGE_437:  [0x1b, 0x74, 0x00],  // ESC t 0
  CODEPAGE_850:  [0x1b, 0x74, 0x02],  // ESC t 2
  CUT_PARTIAL:   [0x1d, 0x56, 0x01],  // GS V 1 — corte parcial
  CUT_FULL:      [0x1d, 0x56, 0x00],  // GS V 0 — corte guillotina
  OPEN_DRAWER:   [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 — apertura cajon
};
```

## 2. CONSTRUCTOR DE TRAMA

```typescript
class ConstructorEscPos {
  private buffer: number[];
  // Cada metodo empuja bytes al buffer:
  inicializar(): void;      // INIT + CODEPAGE_437
  alinearIzquierda(): void;
  alinearCentro(): void;
  alinearDerecha(): void;
  negrita(activar: boolean): void;
  dobleTamano(activar: boolean): void;
  subrayado(activar: boolean): void;
  fuenteNormal(): void;
  fuentePequena(): void;
  texto(texto: string): void;
  avanceLinea(n?: number): void;
  corte(parcial: boolean): void;  // CUT_FULL o CUT_PARTIAL
  abrirCajon(): void;              // OPEN_DRAWER
}

function textoABytes(texto: string): number[];
function formatearPrecio(valor: number): string;
function truncarTexto(texto: string, maxAncho: number): string;
function generarTicketPrueba(nombreNegocio?: string): Uint8Array;
```

## 3. INVARIANTES DE EMISION

- Todo ticket se inicia con `INIT` (reset) y `CODEPAGE_437` antes de cualquier texto.
- El corte de guillotina usa `CUT_FULL` (`GS V 0`); el corte parcial `CUT_PARTIAL` (`GS V 1`).
- La apertura de cajon usa `OPEN_DRAWER` (`ESC p 0 25 250`).

## 4. MANEJO DE ERRORES Y REINTENTOS

- `PrintResult = { success: boolean; message: string; jobId?: string }`.
- Ante atasco de papel o fallo de impresion, el trabajo vuelve a la cola (`print_queue`) con incremento de `attempts`.
- El reintento nunca lanza excepcion a la capa de negocio; comunica `success: false` con `message` accionable.
