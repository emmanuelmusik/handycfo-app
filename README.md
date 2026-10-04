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

**Also live now:** Invoices (create, filter, mark paid, automatic-reminder
toggle, delete) and Expenses (add, filter by category, delete), both on
real Supabase rows. A Sent invoice past its due date shows as Overdue
immediately; the server's daily job makes that permanent.

**Not built yet** (shows a "coming soon" placeholder): Financial Inbox
(receipt scanning needs the AI-parsing endpoint on the server first),
Reports, Messages, Network, Settings (including account deletion, which
needs a server endpoint and is required before App Store submission).

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
