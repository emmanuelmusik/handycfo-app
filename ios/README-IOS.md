# HandyCFO iOS project

Open `ios/App/App.xcodeproj` in Xcode and press Run. Team (86AXRR67W9), bundle id
(biz.thejohmacos.handycfo), Sign in with Apple, camera/photo texts and the app icon are already set.

The RevenueCat plugin is vendored in `ios/vendor/purchases-capacitor` so no `npm install` is needed
to open the project. If you run `npx cap sync`, Capacitor points the package back at node_modules;
that works too once `npm install` has been run.

The web app inside is pre-built into `ios/App/App/public`. After changing the web app, rebuild with
`./scripts/ios-sync.sh` (needs the env vars in the script header).
