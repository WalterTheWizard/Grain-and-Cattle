---
name: Expo Go vs custom dev client on production landing page
description: Why a deployed Expo mobile app can show a stuck "retry" screen when opened via the production landing page's QR/deep-link
---

The scaffolded production landing page for Expo mobile artifacts (`server/serve.js` +
`server/templates/landing-page.html`) is built assuming the app is Expo Go compatible:
it links to Expo Go on the app stores and opens the app via an `exps://` deep link.

If the app has any native module not bundled in the standard Expo Go client (e.g.
`react-native-worklets`/reanimated v4, `expo-secure-store`, `expo-crypto` pulled in by
`@clerk/expo`, or any other custom native code requiring an EAS dev-client build), it
will have no `sdkVersion` in `app.json` (only `runtimeVersion`). Opening it through
Expo Go then fails silently/hangs on a retry-style screen — Expo Go cannot load a
project built for a custom dev client.

**Why:** the landing page template doesn't check for dev-client requirements before
offering the Expo Go path; it's a generic Expo Go-oriented scaffold.

**How to apply:** if the app.json has no `sdkVersion` (custom dev-client / EAS build),
don't rely on the default Expo Go landing page. Point users directly at the built APK
(and iOS build once available) instead — replace the Expo Go store links, `exps://`
deep link, and QR-code target with the actual APK/IPA download URL in both
`server/serve.js` and `server/templates/landing-page.html`.
