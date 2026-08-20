import { normalizePathname } from '../normalizePathname';

describe('normalizePathname', () => {
  it('usa la misma clave para rutas con una o varias barras finales', () => {
    expect(normalizePathname('/_role/mesero')).toBe('/_role/mesero');
    expect(normalizePathname('/_role/mesero/')).toBe('/_role/mesero');
    expect(normalizePathname('/_role/mesero///')).toBe('/_role/mesero');
  });

  it('normaliza rutas vacías a la raíz', () => {
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname(null)).toBe('/');
    expect(normalizePathname(undefined)).toBe('/');
  });
});
