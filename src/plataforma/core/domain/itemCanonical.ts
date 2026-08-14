export function stripVoidDeep<T>(input: T): T {
  if (input === undefined || input === null) return undefined as any;
  if (Array.isArray(input)) {
    return input.map((v) => stripVoidDeep(v)).filter((v) => v !== undefined) as any;
  }
  if (typeof input === 'object') {
    const proto = Object.getPrototypeOf(input as any);
    const isPlainObject = proto === Object.prototype || proto === null;
    if (!isPlainObject) return input;

    const out: any = {};
    for (const [k, v] of Object.entries(input as any)) {
      const vv = stripVoidDeep(v);
      if (vv === undefined) continue;
      out[k] = vv;
    }
    return out;
  }
  return input;
}

export function canonicalizeString(input: any): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  const noDiacritics = lowered.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return noDiacritics.replace(/\s+/g, ' ').trim();
}

export function canonicalizeKey(input: any): string {
  const s = canonicalizeString(input);
  if (!s) return '';
  return s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function coerceUnidad(input: any): 'kg' | 'g' | 'l' | 'ml' | 'pza' | 'caja' {
  const s = canonicalizeString(input);
  if (s === 'pz' || s === 'pieza' || s === 'piezas') return 'pza';
  if (s === 'kgs' || s === 'kilo' || s === 'kilos') return 'kg';
  if (s === 'gr' || s === 'gramo' || s === 'gramos') return 'g';
  if (s === 'lt' || s === 'litro' || s === 'litros') return 'l';
  if (s === 'mililitro' || s === 'mililitros') return 'ml';
  if (s === 'cajas') return 'caja';
  if (s === 'kg' || s === 'g' || s === 'l' || s === 'ml' || s === 'pza' || s === 'caja')
    return s as any;
  return 'pza';
}
