export function normalizePathname(rawPathname?: string | null): string {
  const normalized = String(rawPathname ?? '')
    .trim()
    .replace(/\/+$/, '');
  return normalized || '/';
}
