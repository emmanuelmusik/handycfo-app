// Mirrors the server's idea of a duplicate: same day, same amount and a
// merchant name that is the same or clearly similar. Used when adding an
// expense by hand, where the server is not involved.

const COMPANY_WORDS = /\b(gmbh|ges m b h|mbh|ag|kg|og|eu|ltd|limited|llc|inc|corp|co|sa|srl|bv|nv|plc|und|the|der|die|das)\b/g;

function norm(s) {
  return String(s || '').toLowerCase().replace(/[.,]/g, '').replace(COMPANY_WORDS, ' ')
    .replace(/[^a-z0-9äöüß]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function sameMerchant(a, b) {
  const x = norm(a); const y = norm(b);
  if (!x || !y || x === y) return true;
  const sx = x.replace(/ /g, ''); const sy = y.replace(/ /g, '');
  if (Math.min(sx.length, sy.length) >= 4 && (sx.includes(sy) || sy.includes(sx))) return true;
  const fx = x.split(' ')[0]; const fy = y.split(' ')[0];
  return fx.length >= 4 && fx === fy;
}

export function findDuplicateExpense(expenses, { merchant, expense_date, amount }) {
  if (!expense_date || amount == null) return null;
  return expenses.find((e) =>
    e.expense_date === expense_date
    && Math.abs(Number(e.amount) - Number(amount)) < 0.005
    && sameMerchant(e.merchant, merchant)) || null;
}
