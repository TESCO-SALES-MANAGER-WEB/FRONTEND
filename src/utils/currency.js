// Shared Indian currency formatting for the Sales Manager web app.
// formatINR      -> Indian digit grouping, e.g. ₹15,000 / ₹15,00,000
// formatINRShort -> compact words, e.g. ₹1 Lakh, ₹1.5 Lakhs, ₹1 Crore, ₹1.5 Crores
// Trailing ".0" is trimmed. Accepts numbers or strings (₹, commas, spaces tolerated).

export const parseAmount = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val == null) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

export const formatINR = (val) => {
  const n = Math.round(parseAmount(val));
  return '₹' + n.toLocaleString('en-IN');
};

const trimZero = (n) => {
  const s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};

export const formatINRShort = (val) => {
  const n = parseAmount(val);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) {
    const c = abs / 1e7;
    return `${sign}₹${trimZero(c)} ${c === 1 ? 'Crore' : 'Crores'}`;
  }
  if (abs >= 1e5) {
    const l = abs / 1e5;
    return `${sign}₹${trimZero(l)} ${l === 1 ? 'Lakh' : 'Lakhs'}`;
  }
  return formatINR(n);
};
