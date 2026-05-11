export function formatTimeHM(value: unknown): string {
  if (value == null) return '';
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }
  const str = String(value);
  return str.length >= 5
      ? str.slice(0, 5)
      : str;
}
