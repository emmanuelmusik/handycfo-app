// Store subscriptions (Apple / Google) through RevenueCat. This only runs inside the
// iPhone/Android app; on the web every function reports "not available" and the app
// keeps working on the Free plan.
import { Capacitor } from '@capacitor/core';

const KEYS = {
  ios: import.meta.env.VITE_REVENUECAT_IOS_KEY,
  android: import.meta.env.VITE_REVENUECAT_ANDROID_KEY,
};

export const isNativeApp = () => Capacitor.isNativePlatform();
const platform = () => Capacitor.getPlatform();

let sdk = null;
let configuredFor = null;

async function load() {
  if (!sdk) sdk = (await import('@revenuecat/purchases-capacitor')).Purchases;
  return sdk;
}

// Call once the person is signed in. The RevenueCat user id is the HandyCFO user id, which is
// how the server webhook knows whose plan to change.
let lastUserId = null;
let initError = '';
let initRun = null;

async function startStore(userId) {
  const apiKey = KEYS[platform()];
  if (!apiKey) { initError = 'This build has no store key.'; return false; }
  try {
    const Purchases = await load();
    if (!configuredFor) {
      await Purchases.configure({ apiKey, appUserID: userId });
    } else if (configuredFor !== userId) {
      await Purchases.logIn({ appUserID: userId });
    }
    configuredFor = userId;
    initError = '';
    return true;
  } catch (err) {
    initError = String(err?.message || err);
    throw err;
  }
}

export async function initBilling(userId) {
  if (!isNativeApp() || !userId) return false;
  lastUserId = userId;
  // One start at a time, so a second call can never configure the store twice.
  const run = (initRun || Promise.resolve()).catch(() => {}).then(() => startStore(userId));
  initRun = run;
  return run;
}

const planOf = (pkg) => {
  const id = String(pkg?.product?.identifier || pkg?.identifier || '').toLowerCase();
  if (id.includes('quarter') || pkg?.packageType === 'THREE_MONTH') return 'quarterly';
  if (id.includes('month') || pkg?.packageType === 'MONTHLY') return 'monthly';
  return null;
};

// The two packages with the real prices from the store (already in the person's currency).
export let billingDiag = '';

export async function loadPackages() {
  billingDiag = '';
  if (!configuredFor && lastUserId) {
    try { await initBilling(lastUserId); } catch { /* reason is kept in initError */ }
  }
  if (!configuredFor) {
    billingDiag = !lastUserId
      ? 'The store could not start because you are not signed in yet.'
      : `The store could not start: ${initError || 'unknown reason'}`;
    return {};
  }
  const Purchases = await load();
  let offerings;
  try {
    offerings = await Purchases.getOfferings();
  } catch (err) {
    billingDiag = `Could not reach the store: ${err?.message || err}`;
    return {};
  }
  const { current } = offerings;
  const out = {};
  for (const pkg of current?.availablePackages || []) {
    const plan = planOf(pkg);
    if (plan) out[plan] = { pkg, price: pkg.product.priceString };
  }
  if (!Object.keys(out).length) {
    const ids = Object.keys(offerings.all || {}).join(', ') || 'none';
    billingDiag = current
      ? `Offering "${current.identifier}" has ${current.availablePackages?.length || 0} usable products.`
      : `No current offering in RevenueCat (offerings found: ${ids}).`;
  }
  return out;
}

// Returns true when bought, false when the person backed out.
export async function purchase(pkg) {
  const Purchases = await load();
  try {
    await Purchases.purchasePackage({ aPackage: pkg });
    return true;
  } catch (err) {
    if (err?.userCancelled || err?.code === '1' || err?.code === 1) return false;
    throw err;
  }
}

export async function restore() {
  const Purchases = await load();
  await Purchases.restorePurchases();
}

export async function logOutBilling() {
  if (!configuredFor) return;
  try { (await load()).logOut(); } catch { /* already anonymous */ }
  configuredFor = null;
}
