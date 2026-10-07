import Modal from './Modal';
import Icon from './layout/Icon';
import { useT } from '../lib/i18n';
import { usePlan } from '../lib/plan';
import { PRICES, currencyAmount } from '../lib/plans';

// The upgrade screen. Shown when a free limit is reached, a paid feature is tapped, or from Settings.
export default function Paywall() {
  const { t } = useT();
  const { paywall, closePaywall, info } = usePlan();
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
    t('About 150 receipt scans a month'),
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
        <div className="paywall-plan">
          <div className="paywall-name">{t('Monthly')}</div>
          <div className="paywall-price">{currencyAmount(PRICES.monthly.amount)}<span>{t('/ month')}</span></div>
        </div>
        <div className="paywall-plan best">
          <div className="paywall-tag">{t('Save {percent}%', { percent: saving })}</div>
          <div className="paywall-name">{t('Quarterly')}</div>
          <div className="paywall-price">{currencyAmount(PRICES.quarterly.amount)}<span>{t('/ 3 months')}</span></div>
          <div className="paywall-sub">{t('{price} a month', { price: currencyAmount(quarterlyPerMonth) })}</div>
        </div>
      </div>
      <p className="paywall-note">
        {info?.plan && info.plan !== 'free'
          ? t('You are already on a paid plan.')
          : t('Subscriptions open when HandyCFO is available in the App Store and Google Play. Your free plan keeps working until then.')}
      </p>
    </Modal>
  );
}
