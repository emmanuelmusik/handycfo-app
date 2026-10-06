import { useState } from 'react';
import Modal from './Modal';
import { useT } from '../lib/i18n';
import { hasMediaConsent, grantMediaConsent } from '../lib/consent';

// Usage: const { guard, consentModal } = useMediaConsent();
//   <button onClick={() => guard(() => input.current?.click())}>…</button>  and render {consentModal}.
// The picker only opens after the person has said yes (asked once per device).
export function useMediaConsent() {
  const [pending, setPending] = useState(null);

  const guard = (openPicker) => {
    if (hasMediaConsent()) openPicker();
    else setPending(() => openPicker);
  };

  const consentModal = pending ? (
    <MediaConsentModal
      onAllow={() => { grantMediaConsent(); const go = pending; setPending(null); go(); }}
      onDecline={() => setPending(null)}
    />
  ) : null;

  return { guard, consentModal };
}

function MediaConsentModal({ onAllow, onDecline }) {
  const { t } = useT();
  return (
    <Modal
      title={t('Allow access to your camera and photos?')}
      onClose={onDecline}
      maxWidth={440}
      footer={
        <>
          <button className="btn" onClick={onDecline}>{t('Not now')}</button>
          <button className="btn btn-primary" onClick={onAllow}>{t('Allow')}</button>
        </>
      }
    >
      <p className="consent-text">{t('To add a receipt, HandyCFO needs to open your camera, your photo gallery or your files. It only looks at the photos or files you choose, and only when you tap a button to add one.')}</p>
      <ul className="consent-list">
        <li>{t('The files you choose are sent securely to our server and to an AI service that reads the amounts, dates and suppliers.')}</li>
        <li>{t('They are stored privately for you, or in your own Dropbox if you connected it. We never use them for advertising.')}</li>
        <li>{t('You can withdraw this permission any time in Settings, and delete a receipt whenever you like.')}</li>
      </ul>
      <p className="consent-text"><a href="/privacy" target="_blank" rel="noopener noreferrer">{t('Read the Privacy Policy')}</a></p>
    </Modal>
  );
}
