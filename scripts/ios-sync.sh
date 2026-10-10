#!/bin/sh
# Rebuild the web app, copy it into the iOS project, and keep the Capacitor plugins vendored
# (copied into ios/vendor) so Xcode can open the project without running npm install.
# Needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL (and the RevenueCat keys) in the environment.
set -e
cd "$(dirname "$0")/.."
npm run build
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
echo "iOS project synced."
