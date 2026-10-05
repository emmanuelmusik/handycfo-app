import Modal from './Modal';
import { useT } from '../lib/i18n';

// Replaces window.confirm so destructive actions look like the rest
// of the product and work inside the Capacitor wrapper too.
export default function ConfirmModal({ title, message, confirmLabel, busy = false, onConfirm, onCancel }) {
  const { t } = useT();
  return (
    <Modal
      title={title}
      onClose={onCancel}
      maxWidth={380}
      footer={
        <>
          <button className="btn" onClick={onCancel} disabled={busy}>{t('Cancel')}</button>
          <button
            className="btn"
            style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t('Working…') : t(confirmLabel || 'Delete')}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}
