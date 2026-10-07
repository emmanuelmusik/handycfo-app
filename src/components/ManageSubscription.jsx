import Modal from './Modal';
import { useT } from '../lib/i18n';
import { usePlan } from '../lib/plan';

const STORE_LINKS = {
  apple: 'https://apps.apple.com/account/subscriptions',
  google: 'https://play.google.com/store/account/subscriptions',
};

// Subscriptions are billed by Apple or Google, so ending one happens in their subscription settings.
export default function ManageSubscription() {
  const { t } = useT();
  const { manage, closeManage, info } = usePlan();
  if (!manage) return null;
  const names = { monthly: t('Monthly'), quarterly: t('Quarterly') };
  return (
    <Modal title={t('Manage subscription')} onClose={closeManage} maxWidth={440}
      footer={<button className="btn" onClick={closeManage}>{t('Close')}</button>}>
      <p className="consent-text">
        {info?.paid
          ? t('You are on the {plan} plan.', { plan: names[info.plan] || info.plan })
          : t('You are on the Free plan, so there is nothing to end.')}
      </p>
      {info?.paid && (
        <>
          <p className="consent-text">{t('Your subscription is billed by the App Store or Google Play, so you end it there. You keep all paid features until the end of the period you already paid for.')}</p>
          <div className="manage-links">
            <a className="btn" href={STORE_LINKS.apple} target="_blank" rel="noopener noreferrer">{t('End in the App Store')}</a>
            <a className="btn" href={STORE_LINKS.google} target="_blank" rel="noopener noreferrer">{t('End in Google Play')}</a>
          </div>
          <p className="consent-text" style={{ marginTop: 12 }}>{t('Ending a subscription never deletes your data. Your account moves to the Free plan.')}</p>
        </>
      )}
    </Modal>
  );
}
