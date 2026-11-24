// Number formatting. A missing number is never shown as 0.

const intl = new Intl.NumberFormat('en-US');

export const count = (n) => (n == null ? '–' : intl.format(Math.round(n)));

export function money(n) {
  if (n == null) return '–';
  const units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, unit] of units) {
    if (Math.abs(n) >= size) {
      const v = n / size;
      return `$${v >= 100 ? v.toFixed(0) : v.toFixed(1)}${unit}`;
    }
  }
  return `$${Math.round(n)}`;
}

export function pct(share) {
  if (share == null) return '–';
  const p = share * 100;
  if (p > 0 && p < 0.1) return '<0.1%';
  return `${p < 10 ? p.toFixed(1) : p.toFixed(0)}%`;
}

export const escapeHTML = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// "LITTLETON" -> "Littleton"; leaves mixed-case names alone.
export function titleCase(s) {
  if (!s || s !== s.toUpperCase()) return s || '';
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}
