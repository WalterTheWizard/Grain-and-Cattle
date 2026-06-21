# Distributing FarmerPro to Farm Workers

This guide explains how to build and share the FarmerPro mobile app with your farm workers using [EAS Build](https://docs.expo.dev/build/introduction/) (Expo's cloud build service).

- **Android workers** get a direct APK download link — no App Store needed.
- **iOS workers** use internal (ad hoc) distribution: workers install via a link after their device UDID is registered with your Apple Developer account. For wider iOS distribution, use TestFlight via the `production` profile.

---

## One-Time Setup (do this once on your machine)

### 1. Install the EAS CLI and log in

```bash
npm install -g eas-cli
eas login
```

You'll need a free [Expo account](https://expo.dev/signup).

### 2. Link the project to your Expo account

From the `artifacts/farmerpro-mobile` folder in a terminal on your machine:

```bash
cd artifacts/farmerpro-mobile
eas init
```

This creates a project in your Expo dashboard and fills in your `projectId`. After it runs, open `app.json` and confirm the `extra.eas.projectId` field is populated (it will no longer be an empty string).

---

## Building for Workers

### Android (easiest — workers get a direct download link)

```bash
pnpm run eas:build:android
```

When the build finishes (usually 10–20 minutes), Expo gives you a URL like:
`https://expo.dev/artifacts/eas/...`

Share that URL with your Android workers. They tap the link, download the APK, and install it. They may need to enable **"Install from unknown sources"** in their Android settings the first time.

### iOS (requires Apple Developer account — $99/year)

The `preview` profile uses **internal (ad hoc) distribution** for iOS. You must register each worker's device UDID before building:

```bash
eas device:create
```

Then run the build:

```bash
pnpm run eas:build:ios
```

EAS will generate a signed `.ipa` and a QR code / install link. Workers tap the link on their registered iPhone to install.

> **Tip:** For broader iOS distribution without per-device registration, use TestFlight by building with the `production` profile instead:
> ```bash
> eas build --platform ios --profile production
> ```
> Production iOS builds route to App Store Connect → TestFlight, where you can invite unlimited testers.

---

## Building Both Platforms at Once

```bash
eas build --platform all --profile preview
```

---

## Updating the App

Each time you make changes to the app code, run the build command again. Workers re-download the new APK link (Android) or re-install via the new ad hoc link (iOS).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Project not found" | Run `eas init` again in `artifacts/farmerpro-mobile` to re-link |
| Android install blocked | Enable "Install unknown apps" in the worker's Android settings |
| iOS device not registered | Run `eas device:create` and add the worker's UDID before building |
| iOS build fails on credentials | Confirm your Apple Developer account is active and the bundle ID is registered |
| App can't reach the API | Ensure `EXPO_PUBLIC_DOMAIN` points to your deployed API server before building |
