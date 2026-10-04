# HandyCFO — React app

The real frontend, replacing the HTML prototype. Verified to build clean
(`npm run build`) and boot (`npm run dev`) as of this handoff — I don't have
a browser here to click through it, so treat the first real run as the
actual test.

## Setup

1. Copy `.env.example` to `.env.local`, fill in your Supabase project URL,
   anon key, and the Railway server URL from the other package.
2. `npm install`
3. `npm run dev` — opens on http://localhost:5173

## What's real vs. what's next

**Wired to live Supabase data:**
- Auth (sign up / sign in / sign out), with email confirmation
- Businesses: create, switch, delete (cascades to everything under it)
- First-run onboarding when a new account has zero businesses
- Dashboard: revenue/expenses/outstanding computed live from real
  `invoices`/`expenses` rows — no mock numbers anywhere

**Still mock-free but not yet built** (shows a "coming soon" placeholder
when you navigate to them): Financial Inbox, Invoices table, Expenses
table, Reports, Messages, Network, Settings. Each one is a matter of
porting the matching screen from the HTML prototype the same way
Dashboard was done — same CSS classes already exist in `global.css`,
just needs the React markup + a Supabase-backed hook per screen (follow
`useInvoices.js` / `useExpenses.js` as the pattern).

**Known simplification worth knowing about:** the prototype's Dashboard
had a "Bills coming due" stat — that mapped to nothing real in the
schema (there's no due-date concept on expenses, only on invoices), so
I left it out rather than fake it. Worth deciding what that should
actually mean before adding it back.

## Capacitor (mobile wrap) — not added yet

Add it once the core screens are ported:
```
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios      # needs Xcode, so this step only works on a Mac
npx cap add android
```
