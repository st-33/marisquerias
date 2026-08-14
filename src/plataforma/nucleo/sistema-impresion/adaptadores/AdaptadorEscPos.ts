/**
 * 🖨️ ADAPTADOR ESC/POS
 *
 * Genera comandos ESC/POS para impresoras térmicas.
 * Incluye mapeo de caracteres UTF-8 → CP437 para español.
 *
 * MIGRADO DE: lib/escpos.ts + core/printing/charsetMapper.ts
 *
 * COMPATIBILIDAD:
 * - Impresoras térmicas 58mm (32 caracteres)
 * - Impresoras térmicas 80mm (48 caracteres)
 * - Code Page 437 (estándar) y 850 (europeo)
 */

// ═══════════════════════════════════════════════════════════════════════════
// COMANDOS ESC/POS
// ═══════════════════════════════════════════════════════════════════════════

/** Comandos ESC/POS estándar */
export const COMANDOS_ESCPOS = {
  // Inicialización
  INIT: [0x1b, 0x40], // ESC @ - Reset impresora

  // Alineación
  ALIGN_LEFT: [0x1b, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [0x1b, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [0x1b, 0x61, 0x02], // ESC a 2

  // Estilo de texto
  BOLD_ON: [0x1b, 0x45, 0x01], // ESC E 1
  BOLD_OFF: [0x1b, 0x45, 0x00], // ESC E 0
  DOUBLE_ON: [0x1d, 0x21, 0x11], // GS ! 17 - Doble alto y ancho
  DOUBLE_OFF: [0x1d, 0x21, 0x00], // GS ! 0
  UNDERLINE_ON: [0x1b, 0x2d, 0x01], // ESC - 1
  UNDERLINE_OFF: [0x1b, 0x2d, 0x00], // ESC - 0

  // Tamaño de fuente
  FONT_NORMAL: [0x1b, 0x4d, 0x00], // ESC M 0
  FONT_SMALL: [0x1b, 0x4d, 0x01], // ESC M 1

  // Code Page
  CODEPAGE_437: [0x1b, 0x74, 0x00], // ESC t 0
  CODEPAGE_850: [0x1b, 0x74, 0x02], // ESC t 2

  // Línea y corte
  LF: [0x0a], // Line Feed
  CR: [0x0d], // Carriage Return
  CUT_PARTIAL: [0x1d, 0x56, 0x01], // GS V 1
  CUT_FULL: [0x1d, 0x56, 0x00], // GS V 0

  // Cajón de dinero
  OPEN_DRAWER: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// MAPEO DE CARACTERES ESPAÑOL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tabla de mapeo UTF-8 → CP437 para caracteres españoles
 * Fuente: https://en.wikipedia.org/wiki/Code_page_437
 */
const MAPA_CP437: Record<string, number> = {
  // Vocales con acento
  á: 0xa0,
  é: 0x82,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  Á: 0xb5,
  É: 0x90,
  Í: 0xd6,
  Ó: 0xe0,
  Ú: 0xe9,

  // Ñ
  ñ: 0xa4,
  Ñ: 0xa5,

  // Signos
  '¿': 0xa8,
  '¡': 0xad,

  // Símbolos comunes
  '°': 0xf8,
  ª: 0xa6,
  º: 0xa7,
  '¢': 0x9b,
  '£': 0x9c,
  '¥': 0x9d,
  '₧': 0x9e,
  '÷': 0xf6,
  '±': 0xf1,
  '½': 0xab,
  '¼': 0xac,
};

/**
 * Convierte texto UTF-8 a bytes CP437
 */
export function textoABytes(texto: string): number[] {
  const bytes: number[] = [];

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const code = texto.charCodeAt(i);

    if (MAPA_CP437[char] !== undefined) {
      bytes.push(MAPA_CP437[char]);
    } else if (code < 128) {
      bytes.push(code);
    } else {
      bytes.push(code & 0xff);
    }
  }

  return bytes;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTOR DE COMANDOS (Fluent API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Constructor fluido de comandos ESC/POS
 *
 * @example
 * ```typescript
 * const bytes = new ConstructorEscPos()
 *   .inicializar()
 *   .centrar()
 *   .negrita(true)
 *   .texto('RESTAURANTE')
 *   .negrita(false)
 *   .linea()
 *   .cortar()
 *   .construir();
 * ```
 */
export class ConstructorEscPos {
  private buffer: number[] = [];
  private anchoTicket: number;

  constructor(anchoCaracteres: number = 32) {
    this.anchoTicket = anchoCaracteres;
  }

  /** Resetea la impresora */
  inicializar(): this {
    this.buffer.push(...COMANDOS_ESCPOS.INIT);
    this.buffer.push(...COMANDOS_ESCPOS.CODEPAGE_437);
    return this;
  }

  // --- Alineación ---

  izquierda(): this {
    this.buffer.push(...COMANDOS_ESCPOS.ALIGN_LEFT);
    return this;
  }

  centrar(): this {
    this.buffer.push(...COMANDOS_ESCPOS.ALIGN_CENTER);
    return this;
  }

  derecha(): this {
    this.buffer.push(...COMANDOS_ESCPOS.ALIGN_RIGHT);
    return this;
  }

  // --- Estilos ---

  negrita(activar: boolean): this {
    this.buffer.push(...(activar ? COMANDOS_ESCPOS.BOLD_ON : COMANDOS_ESCPOS.BOLD_OFF));
    return this;
  }

  doble(activar: boolean): this {
    this.buffer.push(...(activar ? COMANDOS_ESCPOS.DOUBLE_ON : COMANDOS_ESCPOS.DOUBLE_OFF));
    return this;
  }

  subrayar(activar: boolean): this {
    this.buffer.push(...(activar ? COMANDOS_ESCPOS.UNDERLINE_ON : COMANDOS_ESCPOS.UNDERLINE_OFF));
    return this;
  }

  fuenteNormal(): this {
    this.buffer.push(...COMANDOS_ESCPOS.FONT_NORMAL);
    return this;
  }

  fuentePequena(): this {
    this.buffer.push(...COMANDOS_ESCPOS.FONT_SMALL);
    return this;
  }

  // --- Texto ---

  texto(contenido: string): this {
    this.buffer.push(...textoABytes(contenido));
    return this;
  }

  linea(): this {
    this.buffer.push(...COMANDOS_ESCPOS.LF);
    return this;
  }

  lineas(cantidad: number): this {
    for (let i = 0; i < cantidad; i++) {
      this.buffer.push(...COMANDOS_ESCPOS.LF);
    }
    return this;
  }

  /** Imprime texto y nueva línea */
  textoLinea(contenido: string): this {
    return this.texto(contenido).linea();
  }

  /** Línea separadora con carácter repetido */
  separador(caracter: string = '-'): this {
    return this.textoLinea(caracter.repeat(this.anchoTicket));
  }

  /** Separador doble */
  separadorDoble(): this {
    return this.separador('=');
  }

  /** Texto con padding para alineación en columna */
  columnas(izquierda: string, derecha: string): this {
    const espacios = this.anchoTicket - izquierda.length - derecha.length;
    const padding = espacios > 0 ? ' '.repeat(espacios) : ' ';
    return this.textoLinea(`${izquierda}${padding}${derecha}`);
  }

  // --- Acciones finales ---

  cortar(parcial: boolean = true): this {
    this.buffer.push(...(parcial ? COMANDOS_ESCPOS.CUT_PARTIAL : COMANDOS_ESCPOS.CUT_FULL));
    return this;
  }

  abrirCajon(): this {
    this.buffer.push(...COMANDOS_ESCPOS.OPEN_DRAWER);
    return this;
  }

  /** Construye el buffer final */
  construir(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /** Construye como string Base64 (para envío por BT) */
  construirBase64(): string {
    const bytes = this.construir();
    // Convertir a string binario
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // btoa puede no existir en RN, usar alternativa
    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    }
    // Fallback para React Native
    return Buffer.from(bytes).toString('base64');
  }

  /** Reinicia el buffer */
  limpiar(): this {
    this.buffer = [];
    return this;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera ticket de prueba para verificar impresora
 */
export function generarTicketPrueba(nombreNegocio: string = 'MI NEGOCIO'): Uint8Array {
  return new ConstructorEscPos()
    .inicializar()
    .centrar()
    .doble(true)
    .textoLinea(nombreNegocio)
    .doble(false)
    .linea()
    .separadorDoble()
    .izquierda()
    .textoLinea('TEST DE IMPRESIÓN')
    .textoLinea('')
    .textoLinea('Caracteres especiales:')
    .textoLinea('áéíóú ÁÉÍÓÚ')
    .textoLinea('ñ Ñ')
    .textoLinea('¿Cómo está? ¡Excelente!')
    .linea()
    .separadorDoble()
    .centrar()
    .textoLinea('✓ Impresora funcionando')
    .textoLinea(new Date().toLocaleString('es-MX'))
    .lineas(3)
    .cortar()
    .construir();
}

/**
 * Formatea precio en formato mexicano
 */
export function formatearPrecio(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

/**
 * Trunca texto si excede el ancho
 */
export function truncarTexto(texto: string, maxAncho: number): string {
  if (texto.length <= maxAncho) return texto;
  return texto.substring(0, maxAncho - 1) + '…';
}
