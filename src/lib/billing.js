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
export async function initBilling(userId) {
  if (!isNativeApp() || !userId) return false;
  const apiKey = KEYS[platform()];
  if (!apiKey) return false;
  const Purchases = await load();
  if (!configuredFor) {
    await Purchases.configure({ apiKey, appUserID: userId });
  } else if (configuredFor !== userId) {
    await Purchases.logIn({ appUserID: userId });
  }
  configuredFor = userId;
  return true;
}

const planOf = (pkg) => {
  const id = String(pkg?.product?.identifier || pkg?.identifier || '').toLowerCase();
  if (id.includes('quarter') || pkg?.packageType === 'THREE_MONTH') return 'quarterly';
  if (id.includes('month') || pkg?.packageType === 'MONTHLY') return 'monthly';
  return null;
};

// The two packages with the real prices from the store (already in the person's currency).
export async function loadPackages() {
  const Purchases = await load();
  const { current } = await Purchases.getOfferings();
  const out = {};
  for (const pkg of current?.availablePackages || []) {
    const plan = planOf(pkg);
    if (plan) out[plan] = { pkg, price: pkg.product.priceString };
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
