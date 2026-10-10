// What the plans include and cost. Keep in step with the server (server/src/lib/plans.js) and the store listings.
export const PLAN_LIMITS = {
  free: { businesses: 1, invoices: 5, scans: 10 },
  paid: { businesses: 3, invoices: null, scans: 150 },
};

export const PRICES = {
  monthly: { amount: 9.99, months: 1 },
  quarterly: { amount: 24.99, months: 3 },
};
export const currencyAmount = (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(n);
