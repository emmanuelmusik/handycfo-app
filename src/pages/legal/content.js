// Text of the public Privacy Policy and Support pages. English and German in full;
// other languages show the English text.
export const CONTACT_EMAIL = 'Info@thejohmacos.com';
export const UPDATED = '2026-10-06';

export const PRIVACY = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 6 October 2026',
    sections: [
      { h: 'Who we are', p: [
        'HandyCFO ("the app") is operated by Ndubuisi Emmanuel Ukwuani, trading as The Johmacos, Vienna, Austria. For privacy questions, write to ' + CONTACT_EMAIL + '. We are the controller of your personal data under the GDPR.',
      ] },
      { h: 'What we collect', p: [
        'Account data: your email address and password (stored only as a secure hash by our login provider).',
        'Business data you enter: business profile (name, address, tax numbers, bank details), customers and suppliers (names, emails, addresses, tax IDs), invoices and their lines, expenses, and messages you send to contacts in the app.',
        'Receipts and documents: photos and PDFs you choose to add, and the text and amounts our AI reads from them.',
        'Technical data: basic logs (for example errors and request times) needed to run and secure the service, and your language choice, saved on your device.',
      ] },
      { h: 'Camera, photos and files', p: [
        'The app only opens your camera, photo gallery or file picker after you agree in the app and tap a button to add a receipt. It never accesses them in the background and only receives the photos or files you select. You can withdraw this permission any time in Settings, and you can also turn it off in your phone settings.',
      ] },
      { h: 'Why we use it, and our legal basis', p: [
        'To provide the app: create your account, store your records, create and send invoices, and read receipts (Art. 6(1)(b) GDPR, contract).',
        'To process the photos and files you select (Art. 6(1)(a) GDPR, your consent, which you give before the first upload).',
        'To keep the service secure and prevent abuse (Art. 6(1)(f), legitimate interest) and to meet legal obligations (Art. 6(1)(c)).',
        'We do not sell your data, we do not show advertising, and we do not use advertising or tracking cookies.',
      ] },
      { h: 'Who receives your data', p: [
        'We use service providers who process data on our behalf: Supabase (database, login and private file storage), Railway (server hosting), Vercel (website hosting), xAI (AI that reads receipt images and text), Resend (sending invoice and reminder emails), and Dropbox (only if you connect it, to keep receipt files in your own Dropbox).',
        'When you send an invoice, its content goes to the email address or HandyCFO user you choose. Some providers are located outside the EU/EEA, for example in the United States. Where that happens we rely on the EU Standard Contractual Clauses or an adequacy decision.',
      ] },
      { h: 'How long we keep it', p: [
        'We keep your data while your account exists. You can delete a receipt, an invoice, a business or your whole account at any time (Settings). Deleting your account erases your businesses, invoices, expenses, contacts, messages and stored files; copies in backups disappear within a short period.',
        'Business records such as sent invoices may have to be kept for years under tax law. That duty is yours as the business owner, so export or keep what you need before you delete.',
      ] },
      { h: 'Your rights', p: [
        'You have the right to access, correct, delete, restrict and receive a copy of your data, to object to processing, and to withdraw consent at any time without affecting what happened before. Write to ' + CONTACT_EMAIL + ' and we will answer within one month.',
        'You can complain to the Austrian data protection authority (Datenschutzbehörde, www.dsb.gv.at) or to the authority in your country.',
      ] },
      { h: 'Security', p: [
        'Data is sent over encrypted connections, each account can only see its own data, and files are kept in private storage. No system is perfectly secure, so please use a strong password.',
      ] },
      { h: 'Children', p: ['HandyCFO is meant for business use by adults and is not directed at children.'] },
      { h: 'Changes', p: ['If we change this policy in a meaningful way, we will tell you in the app. The date at the top shows the latest version.'] },
    ],
  },
  de: {
    title: 'Datenschutzerklärung',
    updated: 'Stand: 6. Oktober 2026',
    sections: [
      { h: 'Wer wir sind', p: [
        'HandyCFO („die App“) wird betrieben von Ndubuisi Emmanuel Ukwuani, tätig als The Johmacos, Wien, Österreich. Bei Datenschutzfragen schreiben Sie an ' + CONTACT_EMAIL + '. Wir sind Verantwortlicher im Sinne der DSGVO.',
      ] },
      { h: 'Welche Daten wir erheben', p: [
        'Kontodaten: Ihre E-Mail-Adresse und Ihr Passwort (nur als sicherer Hash bei unserem Anmeldedienst gespeichert).',
        'Geschäftsdaten, die Sie eingeben: Unternehmensprofil (Name, Adresse, Steuernummern, Bankdaten), Kunden und Lieferanten (Namen, E-Mails, Adressen, Steuer-IDs), Rechnungen mit Positionen, Ausgaben und Nachrichten an Kontakte in der App.',
        'Belege und Dokumente: Fotos und PDFs, die Sie hinzufügen, sowie die Texte und Beträge, die unsere KI daraus liest.',
        'Technische Daten: einfache Protokolle (z. B. Fehler und Anfragezeiten) für Betrieb und Sicherheit sowie Ihre Spracheinstellung, die auf Ihrem Gerät gespeichert wird.',
      ] },
      { h: 'Kamera, Fotos und Dateien', p: [
        'Die App öffnet Kamera, Fotogalerie oder Dateiauswahl erst, nachdem Sie in der App zugestimmt und eine Schaltfläche zum Hinzufügen eines Belegs angetippt haben. Sie greift nie im Hintergrund darauf zu und erhält nur die von Ihnen ausgewählten Fotos oder Dateien. Sie können diese Zustimmung jederzeit in den Einstellungen widerrufen oder in den Telefoneinstellungen deaktivieren.',
      ] },
      { h: 'Wofür wir die Daten nutzen und Rechtsgrundlagen', p: [
        'Zur Bereitstellung der App: Konto anlegen, Daten speichern, Rechnungen erstellen und versenden, Belege lesen (Art. 6 Abs. 1 lit. b DSGVO, Vertrag).',
        'Zur Verarbeitung der von Ihnen ausgewählten Fotos und Dateien (Art. 6 Abs. 1 lit. a DSGVO, Ihre Einwilligung, die Sie vor dem ersten Hochladen erteilen).',
        'Zur Sicherheit des Dienstes und Missbrauchsabwehr (lit. f, berechtigtes Interesse) sowie zur Erfüllung rechtlicher Pflichten (lit. c).',
        'Wir verkaufen Ihre Daten nicht, zeigen keine Werbung und verwenden keine Werbe- oder Tracking-Cookies.',
      ] },
      { h: 'Wer Ihre Daten erhält', p: [
        'Wir setzen Dienstleister ein, die in unserem Auftrag Daten verarbeiten: Supabase (Datenbank, Anmeldung und private Dateispeicherung), Railway (Server-Hosting), Vercel (Website-Hosting), xAI (KI, die Belegbilder und Texte liest), Resend (Versand von Rechnungs- und Erinnerungs-E-Mails) und Dropbox (nur wenn Sie es verbinden, um Belegdateien in Ihrer eigenen Dropbox abzulegen).',
        'Wenn Sie eine Rechnung senden, geht ihr Inhalt an die E-Mail-Adresse oder den HandyCFO-Nutzer, den Sie wählen. Einige Anbieter sitzen außerhalb der EU/des EWR, etwa in den USA. Dann stützen wir uns auf die EU-Standardvertragsklauseln oder einen Angemessenheitsbeschluss.',
      ] },
      { h: 'Wie lange wir Daten speichern', p: [
        'Wir speichern Ihre Daten, solange Ihr Konto besteht. Sie können jederzeit einen Beleg, eine Rechnung, ein Unternehmen oder Ihr ganzes Konto löschen (Einstellungen). Beim Löschen des Kontos werden Unternehmen, Rechnungen, Ausgaben, Kontakte, Nachrichten und gespeicherte Dateien gelöscht; Kopien in Sicherungen verschwinden nach kurzer Zeit.',
        'Geschäftsunterlagen wie versendete Rechnungen müssen nach Steuerrecht oft mehrere Jahre aufbewahrt werden. Diese Pflicht liegt bei Ihnen als Unternehmer; sichern Sie daher vor dem Löschen, was Sie benötigen.',
      ] },
      { h: 'Ihre Rechte', p: [
        'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit, das Recht auf Widerspruch und das Recht, eine Einwilligung jederzeit zu widerrufen, ohne dass die bisherige Verarbeitung rechtswidrig wird. Schreiben Sie an ' + CONTACT_EMAIL + '; wir antworten innerhalb eines Monats.',
        'Sie können sich bei der österreichischen Datenschutzbehörde (www.dsb.gv.at) oder bei der Behörde Ihres Landes beschweren.',
      ] },
      { h: 'Sicherheit', p: [
        'Daten werden verschlüsselt übertragen, jedes Konto sieht nur seine eigenen Daten, und Dateien liegen in privatem Speicher. Kein System ist vollkommen sicher; bitte verwenden Sie ein starkes Passwort.',
      ] },
      { h: 'Kinder', p: ['HandyCFO ist für die geschäftliche Nutzung durch Erwachsene gedacht und richtet sich nicht an Kinder.'] },
      { h: 'Änderungen', p: ['Wenn wir diese Erklärung wesentlich ändern, informieren wir Sie in der App. Das Datum oben zeigt die aktuelle Fassung.'] },
    ],
  },
};

export const SUPPORT = {
  en: {
    title: 'Support',
    intro: 'Need help with HandyCFO? Write to us and we will get back to you, usually within 3 working days.',
    contactH: 'Contact',
    contactP: 'Email',
    faqH: 'Common questions',
    faq: [
      ['How do I scan a receipt?', 'Open Financial Inbox, tap "Add a receipt", take a photo or choose files, then check what we read and confirm it. It becomes an expense.'],
      ['Why does the app ask about my camera and photos?', 'We only open them after you agree, and only for the receipts you choose. You can withdraw the permission in Settings.'],
      ['Why can\'t I send my invoice?', 'Sending needs your business address and, depending on your country, a tax number. The app lists exactly what is missing. Add it in Settings or in the invoice.'],
      ['Can I edit an invoice I already sent?', 'No. Sent invoices are legal documents and are locked. Create a corrected one instead.'],
      ['How do I delete my account and data?', 'Go to Settings, scroll to Danger zone and choose Delete my account. Everything is erased.'],
      ['How do I change the app language?', 'Tap the globe icon at the top right.'],
    ],
    privacy: 'Privacy Policy',
  },
  de: {
    title: 'Support',
    intro: 'Brauchen Sie Hilfe mit HandyCFO? Schreiben Sie uns, wir antworten in der Regel innerhalb von 3 Werktagen.',
    contactH: 'Kontakt',
    contactP: 'E-Mail',
    faqH: 'Häufige Fragen',
    faq: [
      ['Wie scanne ich einen Beleg?', 'Öffnen Sie den Finanz-Posteingang, tippen Sie auf „Beleg hinzufügen“, machen Sie ein Foto oder wählen Sie Dateien, prüfen Sie das Gelesene und bestätigen Sie es. Daraus wird eine Ausgabe.'],
      ['Warum fragt die App nach Kamera und Fotos?', 'Wir öffnen sie erst nach Ihrer Zustimmung und nur für die Belege, die Sie auswählen. Die Zustimmung können Sie in den Einstellungen widerrufen.'],
      ['Warum kann ich meine Rechnung nicht senden?', 'Zum Senden brauchen wir Ihre Geschäftsadresse und je nach Land eine Steuernummer. Die App zeigt genau, was fehlt. Ergänzen Sie es in den Einstellungen oder in der Rechnung.'],
      ['Kann ich eine bereits gesendete Rechnung ändern?', 'Nein. Gesendete Rechnungen sind rechtliche Dokumente und gesperrt. Erstellen Sie stattdessen eine korrigierte Rechnung.'],
      ['Wie lösche ich mein Konto und meine Daten?', 'Öffnen Sie die Einstellungen, gehen Sie zum Gefahrenbereich und wählen Sie „Konto löschen“. Alles wird gelöscht.'],
      ['Wie ändere ich die Sprache der App?', 'Tippen Sie oben rechts auf das Globus-Symbol.'],
    ],
    privacy: 'Datenschutzerklärung',
  },
};
