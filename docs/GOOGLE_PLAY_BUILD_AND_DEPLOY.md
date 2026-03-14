# Build and Deploy TOLA to Google Play Store

This project uses **Expo Application Services (EAS)** to build and submit the Android app.

## Prerequisites

1. **Expo account** – [expo.dev](https://expo.dev) (sign up if needed).
2. **EAS CLI** – Install and log in:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. **Google Play Developer account** – One-time $25 registration at [play.google.com/console](https://play.google.com/console).
4. **App in Play Console** – Create an app (e.g. "TOLA Tanzania") and complete store listing, content rating, and privacy policy as required.

---

## 1. Build the Android app

From the project root:

```bash
cd /Users/danielmawioo/TolaTola/TolatolaMobile
eas build --platform android --profile production
```

- **First time:** EAS will prompt to generate and store Android credentials (keystore) in the cloud. Choose **Yes** so future builds can sign the app.
- Build runs on Expo’s servers. When it finishes, you get a **download link** for the `.aab` (Android App Bundle).

**Other useful build commands:**

```bash
# Preview build (internal testing, no store upload)
eas build --platform android --profile preview

# Build with local keystore (if you use production-local)
eas build --platform android --profile production-local
```

---

## 2. Submit to Google Play Store

After a production build has completed:

```bash
# Submit the latest production build
eas submit --platform android --profile production --latest

# Or submit a specific build (use build ID from dashboard)
eas submit --platform android --profile production --id <BUILD_ID>
```

- **First time:** You’ll be asked to set up **Google Service Account** credentials (JSON key) for Play Console API access. EAS can open the Play Console to create the service account; then you upload the JSON when prompted.
- The submitted `.aab` goes to the **Internal testing** track by default (or the track you configure in `eas.json`).

---

## 3. Release on Play Store

1. Open [Google Play Console](https://play.google.com/console) → your app **TOLA**.
2. Go to **Release** → **Testing** (Internal testing) or **Production**.
3. Find the new upload, add release notes, and **Review release** → **Start rollout**.

---

## Version and build number

- **Version name** (e.g. `1.0.1`): set in `app.json` under `expo.version`.
- **Android versionCode**: in `app.json` under `expo.android.versionCode`. With `"autoIncrement": true` in `eas.json` (production), EAS can bump it automatically on each build.

Before a new store release, update `version` (and optionally `versionCode`) in `app.json`, then run the build again.

---

## Quick reference

| Step              | Command |
|-------------------|--------|
| Build for Play     | `eas build --platform android --profile production` |
| Submit latest build| `eas submit --platform android --profile production --latest` |
| Check build status | [expo.dev](https://expo.dev) → your project → Builds |

Your EAS project ID is already set in `app.config.js` (`e2e4ea34-64fc-4698-9baf-329e34255023`).
