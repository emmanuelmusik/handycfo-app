import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { I18nProvider } from './lib/i18n';
import LanguageButton from './components/LanguageButton';
import { PrivacyPage, SupportPage } from './pages/legal/LegalPages';
import './styles/global.css';

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
