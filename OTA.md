# Live updates (no App Store build needed)

Web-only changes (screens, text, colours, bug fixes in `src/`) reach installed apps without Xcode:

1. Run `scripts/ota-release.sh` (needs the same VITE_* values as `scripts/ios-sync.sh`).
2. Commit `api/_manifest.js` and the new zip in `public/ota/`, then push to `main`.
3. Vercel publishes it. Apps download it in the background and use it the next time they are reopened.

If the new bundle fails to start, the app throws it away within 10 seconds and returns to the last working one.

A new App Store build is still needed when something native changes: plugins, permissions, icon, app name.
When you do that, raise `MIN_BUILD` in `scripts/ota-release.sh` so older installs don't receive bundles they can't run.
