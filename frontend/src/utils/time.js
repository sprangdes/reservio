export function formatTimeHM(value) {
  if (!value) return '';
  const str = String(value);
  if (str.length >= 5) {
    return str.slice(0, 5);
  }
  return str;
}
