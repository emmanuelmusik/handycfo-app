#!/bin/sh
# Rebuild the web app, copy it into the iOS project, and keep the Capacitor plugins vendored
# (copied into ios/vendor) so Xcode can open the project without running npm install.
# Needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL (and the RevenueCat keys) in the environment.
set -e
cd "$(dirname "$0")/.."
for v in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_API_URL; do
  eval "val=\${$v:-}"
  case "$val" in
    http*|eyJ*|sb_*) ;;
    *) echo "Stopping: $v is missing or not a real value. The app would show a blank screen." >&2; exit 1 ;;
  esac
done
case "${VITE_REVENUECAT_IOS_KEY:-}" in
  appl_*) ;;
  *) echo "Stopping: VITE_REVENUECAT_IOS_KEY is missing. The app could not load the subscription plans." >&2; exit 1 ;;
esac
npm run build
if ! grep -rq "supabase.co" dist/assets; then echo "Stopping: the built app has no Supabase address in it." >&2; exit 1; fi
rm -rf dist/ota   # update bundles are served from the website, not packed into the app
npx cap sync ios
PKG=ios/App/CapApp-SPM/Package.swift
rm -rf ios/vendor && mkdir -p ios/vendor
for dir in $(grep -o 'node_modules/@[^"]*' "$PKG" | sed 's#node_modules/##' | sort -u); do
  name=$(basename "$dir")
  mkdir -p "ios/vendor/$name"
  cp -R "node_modules/$dir/Package.swift" "node_modules/$dir/ios" "ios/vendor/$name/"
  [ -f "node_modules/$dir/LICENSE" ] && cp "node_modules/$dir/LICENSE" "ios/vendor/$name/"
done
sed -i.bak -E 's#\.\./\.\./\.\./node_modules/@[^/]+/#../../vendor/#' "$PKG" && rm -f "$PKG.bak"
if ! grep -rq "appl_" dist/assets; then echo "Stopping: the built app has no RevenueCat key in it." >&2; exit 1; fi
echo "iOS project synced."
