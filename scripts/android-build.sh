#!/bin/sh
# Builds the Play Store file (an .aab) for the Android app.
# Needs the same VITE_ variables as the iPhone build, plus VITE_REVENUECAT_ANDROID_KEY (starts with goog_),
# and android/keystore.properties (see ANDROID.md).
set -e
cd "$(dirname "$0")/.."
for v in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_API_URL; do
  eval "val=\${$v:-}"
  case "$val" in
    http*|eyJ*|sb_*) ;;
    *) echo "Stopping: $v is missing or not a real value." >&2; exit 1 ;;
  esac
done
case "${VITE_REVENUECAT_ANDROID_KEY:-}" in
  goog_*) ;;
  *) echo "Stopping: VITE_REVENUECAT_ANDROID_KEY is missing (it starts with goog_)." >&2; exit 1 ;;
esac
[ -f android/keystore.properties ] || { echo "Stopping: android/keystore.properties is missing (see ANDROID.md)." >&2; exit 1; }
npm run build
rm -rf dist/ota
npx cap sync android
cd android && ./gradlew bundleRelease
echo "Done. Upload this file to Play Console: android/app/build/outputs/bundle/release/app-release.aab"
