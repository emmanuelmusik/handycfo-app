# Android (Google Play)

Project: `android/` (Capacitor). Package name `biz.thejohmacos.handycfo`. Version code in `android/app/build.gradle` (raise it by 1 for every upload).

## One-time: signing key (keep it forever, Google needs the same key for every update)
    keytool -genkeypair -v -keystore handycfo-release.jks -alias handycfo -keyalg RSA -keysize 2048 -validity 10000
Save `handycfo-release.jks` somewhere safe (not in git). Create `android/keystore.properties`:
    storeFile=/full/path/to/handycfo-release.jks
    storePassword=...
    keyAlias=handycfo
    keyPassword=...

## Build
    VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... VITE_API_URL=... VITE_REVENUECAT_ANDROID_KEY=goog_... sh scripts/android-build.sh
Output: `android/app/build/outputs/bundle/release/app-release.aab` (upload this to Play Console).
Needs Java 17+ and the Android SDK (Android Studio installs both).
