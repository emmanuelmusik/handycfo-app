#!/bin/sh
# Publish a web-only update to everyone who already has the app installed (no Xcode, no App Store).
# 1. builds the web app, 2. zips it, 3. records its version + checksum in api/_manifest.js.
# Then commit and push to main: Vercel publishes it and the apps pick it up on their next start.
# Only for web changes. Anything that touches native code (plugins, permissions, icons) needs a new build.
set -e
cd "$(dirname "$0")/.."
for v in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_API_URL; do
  eval "val=\${$v:-}"
  case "$val" in
    http*|eyJ*|sb_*) ;;
    *) echo "Stopping: $v is missing or not a real value." >&2; exit 1 ;;
  esac
done
case "${VITE_REVENUECAT_IOS_KEY:-}" in appl_*) ;; *) echo "Stopping: VITE_REVENUECAT_IOS_KEY is missing." >&2; exit 1 ;; esac

MIN_BUILD="${MIN_BUILD:-6}"   # oldest installed build that may receive this update
VERSION="${OTA_VERSION:-1.0.$(date -u +%Y%m%d%H%M%S)}"

npm run build
rm -rf dist/ota
mkdir -p public/ota
ZIP="public/ota/$VERSION.zip"
rm -f "$ZIP"
( cd dist && zip -qr "../$ZIP" . -x ".*" )
SUM=$( (shasum -a 256 "$ZIP" 2>/dev/null || sha256sum "$ZIP") | cut -d' ' -f1 )

cat > api/_manifest.js <<JS
// Written by scripts/ota-release.sh. The newest web bundle that installed apps should download.
export default { version: '$VERSION', url: 'https://handycfo-app.vercel.app/ota/$VERSION.zip', checksum: '$SUM', minBuild: $MIN_BUILD };
JS

# keep only the three newest bundles
ls -1t public/ota/*.zip | tail -n +4 | xargs -r rm -f
echo "Published bundle $VERSION ($SUM). Now commit and push to main."
