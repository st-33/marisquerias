/**
 * 🔤 MAPEADOR DE CARACTERES PARA IMPRESORAS TÉRMICAS
 *
 * Convierte caracteres UTF-8 (español) a códigos de CP437/CP850.
 *
 * PROBLEMA:
 * - JavaScript usa UTF-8 internamente
 * - Impresoras térmicas usan CP437 o CP850
 * - Enviar UTF-8 directo causa símbolos raros: Â¿, Ã±, etc.
 *
 * SOLUCIÓN:
 * - Mapear cada carácter especial del español a su byte correcto en CP437/CP850
 *
 * USO:
 * ```typescript
 * const texto = "¿Gracias por su preferencia!";
 * const bytes = mapearTextoACP437(texto);
 * // bytes = [168, 71, 114, 97, 99, 105, 97, 115, ...]
 * ```
 */

/**
 * Tabla de mapeo de caracteres españoles a CP437
 *
 * Fuente: https://en.wikipedia.org/wiki/Code_page_437
 */
const CP437_MAP: Record<string, number> = {
  // Vocales con acento
  á: 0xa0, // 160
  é: 0x82, // 130
  í: 0xa1, // 161
  ó: 0xa2, // 162
  ú: 0xa3, // 163

  // Vocales con acento mayúsculas
  Á: 0xb5, // 181
  É: 0x90, // 144
  Í: 0xd6, // 214
  Ó: 0xe0, // 224
  Ú: 0xe9, // 233

  // Ñ
  ñ: 0xa4, // 164
  Ñ: 0xa5, // 165

  // Signos de interrogación y exclamación
  '¿': 0xa8, // 168
  '¡': 0xad, // 173

  // Otros caracteres comunes
  '°': 0xf8, // 248 (grado)
  ª: 0xa6, // 166 (ordinal femenino)
  º: 0xa7, // 167 (ordinal masculino)
  '¢': 0x9b, // 155 (centavo)
  '£': 0x9c, // 156 (libra)
  '¥': 0x9d, // 157 (yen)
  '₧': 0x9e, // 158 (peseta)

  // Símbolos de moneda y matemáticos
  '÷': 0xf6, // 246
  '±': 0xf1, // 241
  '½': 0xab, // 171
  '¼': 0xac, // 172
};

/**
 * Tabla de mapeo alternativa para CP850 (Latin-1)
 * Más compatible con caracteres europeos
 */
const CP850_MAP: Record<string, number> = {
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
  ñ: 0xa4,
  Ñ: 0xa5,
  '¿': 0xa8,
  '¡': 0xad,
  ü: 0x81,
  Ü: 0x9a,
};

/**
 * Convierte un string UTF-8 a array de bytes CP437
 *
 * @param texto - Texto en español con acentos
 * @returns Array de bytes listos para enviar a impresora
 */
export function mapearTextoACP437(texto: string): number[] {
  const bytes: number[] = [];

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const code = texto.charCodeAt(i);

    // Si es carácter especial, usar mapeo
    if (CP437_MAP[char] !== undefined) {
      bytes.push(CP437_MAP[char]);
    }
    // Si es ASCII básico (0-127), enviar directo
    else if (code < 128) {
      bytes.push(code);
    }
    // Si no está mapeado, intentar enviar como está (puede fallar)
    else {
      bytes.push(code & 0xff);
    }
  }

  return bytes;
}

/**
 * Convierte un string UTF-8 a array de bytes CP850
 *
 * @param texto - Texto en español con acentos
 * @returns Array de bytes listos para enviar a impresora
 */
export function mapearTextoACP850(texto: string): number[] {
  const bytes: number[] = [];

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const code = texto.charCodeAt(i);

    if (CP850_MAP[char] !== undefined) {
      bytes.push(CP850_MAP[char]);
    } else if (code < 128) {
      bytes.push(code);
    } else {
      bytes.push(code & 0xff);
    }
  }

  return bytes;
}

/**
 * Detectar automáticamente el mejor encoding
 *
 * Por defecto, CP437 es más común en impresoras chinas.
 * CP850 es mejor para Europa.
 */
export function mapearTextoAuto(texto: string, preferCP850 = false): number[] {
  return preferCP850 ? mapearTextoACP850(texto) : mapearTextoACP437(texto);
}

/**
 * Test de caracteres especiales
 * Útil para verificar que la impresora soporte el encoding
 */
export function generarTestDeCaracteres(): string {
  const texto = [
    '=== TEST DE CARACTERES ===',
    '',
    'Vocales con acento:',
    'áéíóú ÁÉÍÓÚ',
    '',
    'Eñe:',
    'ñ Ñ',
    '',
    'Signos:',
    '¿? ¡!',
    '',
    'Símbolos:',
    '° ª º $ ¢',
    '',
    'Frase completa:',
    '¿Cómo está? ¡Excelente!',
    'Año: 2025',
    'Señor García',
    '',
    '======================',
  ].join('\n');

  return texto;
}
