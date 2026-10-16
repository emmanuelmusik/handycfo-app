import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { I18nProvider } from './lib/i18n';
import LanguageButton from './components/LanguageButton';
import { PrivacyPage, SupportPage } from './pages/legal/LegalPages';
import './styles/global.css';
import { Capacitor } from '@capacitor/core';

// In the phone app, links like /privacy and /support (and any web link that opens a new tab) would try to
// open inside the app, where those pages don't exist. Open them in the phone's in-app browser instead.
if (Capacitor.isNativePlatform()) {
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const isPage = href === '/privacy' || href === '/support';
    const isWeb = /^https?:\/\//i.test(href);
    if (!isPage && !isWeb) return;
    e.preventDefault();
    const url = isPage ? `https://handycfo-app.vercel.app${href}` : href;
    import('@capacitor/browser').then(({ Browser }) => Browser.open({ url })).catch(() => window.open(url, '_blank'));
  }, true);
}

// Tell the live-update plugin this web bundle started fine. If it never hears this within 10 seconds,
// it throws the new bundle away and goes back to the last working one.
if (Capacitor.isNativePlatform()) {
  import('@capgo/capacitor-updater')
    .then(({ CapacitorUpdater }) => CapacitorUpdater.notifyAppReady())
    .catch(() => {});
}

// Public pages the app stores ask for. They work without signing in.
const path = window.location.pathname.replace(/\/+$/, '');
const PublicPage = path === '/privacy' ? PrivacyPage : path === '/support' ? SupportPage : null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      {PublicPage ? <PublicPage /> : (
        <>
          <LanguageButton />
          <AuthProvider>
            <App />
          </AuthProvider>
        </>
      )}
    </I18nProvider>
  </React.StrictMode>
);
