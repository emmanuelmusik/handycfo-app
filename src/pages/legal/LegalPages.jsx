import { useT } from '../../lib/i18n';
import { PRIVACY, SUPPORT, CONTACT_EMAIL } from './content';
import LanguageButton from '../../components/LanguageButton';
import logoIcon from '../../assets/logo-icon.png';

// Public pages (no sign-in needed) so the App Store / Google Play can link to them.
function Shell({ children }) {
  const { t } = useT();
  return (
    <div className="legal-page">
      <LanguageButton />
      <header className="legal-head">
        <a href="/" className="legal-brand"><img src={logoIcon} alt="" /><span>HandyCFO</span></a>
        <nav>
          <a href="/privacy">{t('Privacy Policy')}</a>
          <a href="/support">{t('Support')}</a>
        </nav>
      </header>
      <main className="legal-body">{children}</main>
    </div>
  );
}

export function PrivacyPage() {
  const { lang } = useT();
  const c = PRIVACY[lang] || PRIVACY.en;
  return (
    <Shell>
      <h1>{c.title}</h1>
      <p className="legal-updated">{c.updated}</p>
      {c.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p.map((x, i) => <p key={i}>{x}</p>)}
        </section>
      ))}
    </Shell>
  );
}

export function SupportPage() {
  const { lang } = useT();
  const c = SUPPORT[lang] || SUPPORT.en;
  return (
    <Shell>
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
      <section>
        <h2>{c.contactH}</h2>
        <p>{c.contactP}: <a href={`mailto:${CONTACT_EMAIL}?subject=HandyCFO%20support`}>{CONTACT_EMAIL}</a></p>
      </section>
      <section>
        <h2>{c.faqH}</h2>
        {c.faq.map(([q, a]) => (
          <div key={q} className="legal-faq"><h3>{q}</h3><p>{a}</p></div>
        ))}
      </section>
      <p><a href="/privacy">{c.privacy}</a></p>
    </Shell>
  );
}
