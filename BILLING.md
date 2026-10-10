# Store subscriptions (RevenueCat)

Plans: Monthly (product id contains "monthly") and Quarterly (contains "quarterly").
Use these product ids in both stores:

- `handycfo_monthly`   - EUR 8.99 / month
- `handycfo_quarterly` - EUR 22.99 / 3 months

How it fits together
1. The app (Capacitor build) asks RevenueCat for the two packages and shows the store prices.
2. The person buys in the App Store / Google Play. RevenueCat records it.
3. RevenueCat calls `POST /webhooks/revenuecat` on the server (Authorization: `Bearer <REVENUECAT_WEBHOOK_SECRET>`).
4. The server updates `subscriptions`, and the app reads the new plan from `GET /plan`.

The RevenueCat app user id is the Supabase user id (set in `src/lib/billing.js`).

Build-time environment variables (set where the native app is built):
- `VITE_REVENUECAT_IOS_KEY`     RevenueCat public SDK key for iOS (starts with `appl_`)
- `VITE_REVENUECAT_ANDROID_KEY` RevenueCat public SDK key for Android (starts with `goog_`)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` as for the web app

Build the native projects on a Mac (iOS needs Xcode):
    npm install
    npm run build
    npx cap add ios        # once
    npx cap add android    # once
    npx cap sync
    npx cap open ios       # then in Xcode: add the "In-App Purchase" capability and "Sign in with Apple"
