import { useEffect, useState } from 'react';
import { lastCachedAt } from '../lib/offlineCache';
import { useT } from '../lib/i18n';

export default function OfflineBanner() {
  const { t } = useT();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  if (online) return null;
  const at = lastCachedAt();
  const when = at ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;
  return (
    <div className="offline-banner" role="status">
      {when ? t("You're offline. Showing data last updated {when}. Changes are disabled.", { when }) : t("You're offline. Changes are disabled.")}
    </div>
  );
}
