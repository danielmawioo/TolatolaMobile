# Build and Deploy TOLA to Apple App Store

This guide details the complete, step-by-step process to deploy **TOLA** (`TolatolaMobile`) from scratch to the Apple App Store using **Expo Application Services (EAS)**.

---

## Prerequisites Checklist

1. **Apple Developer Account** ($99/year)
   - Register at [developer.apple.com](https://developer.apple.com/programs/).
   - Enrollment takes 24–48 hours for approval.
2. **Expo Account & EAS CLI**
   - Ensure `eas-cli` is installed and logged in:
     ```bash
     npm install -g eas-cli
     eas login
     ```
3. **Verified iOS Configuration in [app.json](file:///home/januaries/Desktop/Tolatola/multivendor-marketplace-build/TolatolaMobile/app.json)**
   - Bundle Identifier: `co.tolatola.tola`
   - Required `infoPlist` permission strings (`NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`).

---

## Step 1: Create App Record in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) and sign in.
2. Navigate to **Apps** → Click **`+`** → **New App**.
3. Fill in the App details:
   - **Platforms**: iOS
   - **Name**: TOLA
   - **Primary Language**: English (or your preferred primary language)
   - **Bundle ID**: Select `co.tolatola.tola` (if not present, create it at [developer.apple.com -> Identifiers](https://developer.apple.com/account/resources/identifiers/add/bundleId))
   - **SKU**: `tolatola-mobile-ios`
   - **User Access**: Full Access
4. Click **Create**.

---

## Step 2: Generate App Store Connect API Key (for Automated Builds/Uploads)

Using an App Store Connect API Key lets EAS automate certificate creation, provisioning profiles, and build submissions without asking for your 2FA password repeatedly.

1. In **App Store Connect**, go to **Users and Access** → **Keys** (under *App Store Connect API*).
2. Click **Generate API Key** (or **`+`**):
   - **Name**: `EAS Deployment Key`
   - **Access**: `App Manager` or `Admin`
3. Click **Generate**.
4. Save the following:
   - **Key ID** (e.g. `2X857ABCDE`)
   - **Issuer ID** (UUID at top of page, e.g. `69a6de82-xxx-xxx`)
   - Download the `.p8` key file (**Note:** Apple only lets you download this file **once**!). Store it securely (e.g. in `credentials/` folder, ignored by git).

---

## Step 3: Configure `eas.json` for iOS

Ensure your `eas.json` inside `TolatolaMobile` has remote iOS credentials enabled and optional auto-submit setup:

```json
{
  "cli": {
    "version": ">= 18.0.4",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "credentialsSource": "remote"
      },
      "ios": {
        "credentialsSource": "remote"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascApiKeyId": "YOUR_KEY_ID",
        "ascApiKeyIssuerId": "YOUR_ISSUER_ID",
        "ascApiKeyPath": "./credentials/AuthKey_XXXXX.p8"
      }
    }
  }
}
```

---

## Step 4: Build the iOS Release Binary (`.ipa`)

Run the build command from the `TolatolaMobile` directory:

```bash
cd TolatolaMobile
eas build --platform ios --profile production
```

### What happens on first build:
1. EAS will prompt you to log into your Apple Developer account or provide your ASC API Key / credentials.
2. EAS automatically creates:
   - **Apple Distribution Certificate**
   - **App ID** (`co.tolatola.tola`)
   - **Provisioning Profile**
3. EAS compiles the app on cloud servers and outputs a `.ipa` file link when finished.

---

## Step 5: Upload Build to App Store Connect / TestFlight

Once the build succeeds, submit it directly to App Store Connect:

```bash
eas submit --platform ios --profile production --latest
```

*(Alternatively, you can build and submit in a single command using `eas build --platform ios --profile production --auto-submit`).*

After submission:
- Processing takes 5–15 minutes on Apple's servers.
- The build will appear in **App Store Connect** → **TestFlight**.

---

## Step 6: Test via TestFlight (Recommended)

Before requesting public store review:
1. Go to **App Store Connect** → **TestFlight**.
2. Add internal testers (your team) under **Internal Testing**.
3. Install the **TestFlight** app on your iPhone from the App Store.
4. Accept the email invite, install **TOLA**, and verify:
   - Login & registration flows
   - Google Maps rendering & location features
   - Camera & document upload permissions
   - Checkout & payment flows

---

## Step 7: Prepare App Store Listing & Metadata

In **App Store Connect** → **Apps** → **TOLA** → **iOS App - 1.0.2 Prepare for Submission**:

1. **Screenshots Required**:
   - **6.7" Display** (iPhone 15/14 Pro Max): 1290 x 2796 px (Minimum 3, recommended 5).
   - **6.5" Display** (iPhone 11 Pro Max/XS Max): 1242 x 2688 px.
   - **12.9" iPad Display** (Required because `supportsTablet: true` in `app.json`): 2048 x 2732 px.
2. **App Details**:
   - **Promotional Text** & **Description**
   - **Keywords** (comma-separated, max 100 chars)
   - **Support URL** & **Marketing URL**
3. **General Information**:
   - **Category**: Shopping / Business / Food & Drink
   - **Price**: Free
   - **App Privacy**: Complete privacy policy survey based on data collected (Location, Camera, User details).
4. **App Review Information** (CRITICAL):
   - **Sign-in Required**: Check **Yes**.
   - Provide a valid demo account (e.g. `demo_buyer@tolatola.co` / password) so Apple reviewers can test the app without getting stuck on sign-in.
   - **Contact Information**: Phone number and email for Apple reviewer questions.

---

## Step 8: Submit for Review

1. Scroll down to **Build** section → Click **`+`** → Select your uploaded build (`1.0.2 (1)`).
2. Click **Save** (top right).
3. Click **Submit for Review**.

Apple review typically takes **24 to 48 hours**. You will receive an email once approved or if Apple requests changes.

---

## Summary Command Reference

| Task | Command |
| --- | --- |
| **Check EAS Status** | `eas status` |
| **Build iOS App** | `eas build --platform ios --profile production` |
| **Submit Latest Build** | `eas submit --platform ios --profile production --latest` |
| **Build & Auto-Submit** | `eas build --platform ios --profile production --auto-submit` |
| **Manage iOS Credentials** | `eas credentials` |
