import { useEffect, useState } from 'react';
import Modal from './Modal';
import Icon from './layout/Icon';
import { useT } from '../lib/i18n';
import { usePlan } from '../lib/plan';
import { PRICES, currencyAmount } from '../lib/plans';
import { isNativeApp, loadPackages, purchase, restore } from '../lib/billing';

// The upgrade screen. Shown when a free limit is reached, a paid feature is tapped, or from Settings.
export default function Paywall() {
  const { t } = useT();
  const { paywall, closePaywall, info, refresh } = usePlan();
  const native = isNativeApp();
  const [packages, setPackages] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!paywall || !native) return;
    setMessage('');
    loadPackages().then(setPackages).catch(() => setPackages({}));
  }, [paywall, native]);

  // The store tells RevenueCat, RevenueCat tells our server, so the new plan can take a few seconds to arrive.
  async function waitForPlan() {
    for (let i = 0; i < 10; i++) {
      await refresh();
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  async function subscribe(plan) {
    const pkg = packages?.[plan]?.pkg;
    if (!pkg) return;
    setBusy(plan);
    setMessage('');
    try {
      if (await purchase(pkg)) { await waitForPlan(); closePaywall(); }
    } catch {
      setMessage(t('The purchase did not go through. You were not charged.'));
    } finally {
      setBusy('');
    }
  }

  async function restorePurchases() {
    setBusy('restore');
    setMessage('');
    try {
      await restore();
      await waitForPlan();
      setMessage(t('Purchases restored.'));
    } catch {
      setMessage(t('Nothing could be restored right now.'));
    } finally {
      setBusy('');
    }
  }

  if (!paywall) return null;

  const reasons = {
    plan_limit: {
      scans: t('You have used all your free receipt scans this month.'),
      invoices: t('You have sent all your free invoices this month.'),
      businesses: t('The Free plan includes one business.'),
    },
    plan_feature: {
      dropbox: t('Saving receipts to Dropbox is part of the paid plans.'),
      reminders: t('Automatic payment reminders are part of the paid plans.'),
      export: t('Exporting reports as PDF is part of the paid plans.'),
    },
  };
  const reason = (paywall.code && (reasons[paywall.code] || {})[paywall.kind || paywall.feature]) || '';

  const features = [
    t('Unlimited invoices'),
    t('Up to 3 businesses'),
    t('100 receipt scans a month'),
    t('Automatic payment reminders'),
    t('Dropbox storage for receipts'),
    t('PDF export of reports'),
    t('Email support'),
  ];

  const quarterlyPerMonth = PRICES.quarterly.amount / PRICES.quarterly.months;
  const saving = Math.round((1 - quarterlyPerMonth / PRICES.monthly.amount) * 100);

  return (
    <Modal title={t('Upgrade HandyCFO')} onClose={closePaywall} maxWidth={460}
      footer={<button className="btn" onClick={closePaywall}>{t('Maybe later')}</button>}>
      {reason && <p className="paywall-reason">{reason}</p>}
      <ul className="paywall-features">
        {features.map((f) => <li key={f}><Icon name="check" size={14} strokeWidth={2.4} />{f}</li>)}
      </ul>
      <div className="paywall-plans">
        {['monthly', 'quarterly'].map((plan) => {
          const best = plan === 'quarterly';
          const price = packages?.[plan]?.price;
          const body = (
            <>
              {best && <div className="paywall-tag">{t('Save {percent}%', { percent: saving })}</div>}
              <div className="paywall-name">{best ? t('Quarterly') : t('Monthly')}</div>
              <div className="paywall-price">
                {price || currencyAmount(PRICES[plan].amount)}<span>{best ? t('/ 3 months') : t('/ month')}</span>
              </div>
              {best && <div className="paywall-sub">{t('{price} a month', { price: currencyAmount(quarterlyPerMonth) })}</div>}
              {native && packages?.[plan] && <div className="paywall-cta">{busy === plan ? t('Please wait…') : t('Subscribe')}</div>}
            </>
          );
          return native && packages?.[plan]
            ? <button key={plan} type="button" className={`paywall-plan paywall-plan-btn ${best ? 'best' : ''}`} disabled={!!busy} onClick={() => subscribe(plan)}>{body}</button>
            : <div key={plan} className={`paywall-plan ${best ? 'best' : ''}`}>{body}</div>;
        })}
      </div>
      {message && <p className="paywall-note" role="status">{message}</p>}
      {native ? (
        <>
          <p className="paywall-note">
            {t('Your subscription renews automatically unless you cancel it at least 24 hours before the period ends. Manage or cancel it any time in your App Store or Google Play account settings.')}
          </p>
          <p className="paywall-note">
            <button type="button" className="link-btn" onClick={restorePurchases} disabled={!!busy}>{t('Restore purchases')}</button>
            {' · '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">{t('Privacy Policy')}</a>
          </p>
        </>
      ) : (
        <p className="paywall-note">
          {info?.plan && info.plan !== 'free'
            ? t('You are already on a paid plan.')
            : t('Subscriptions open when HandyCFO is available in the App Store and Google Play. Your free plan keeps working until then.')}
        </p>
      )}
    </Modal>
  );
}
