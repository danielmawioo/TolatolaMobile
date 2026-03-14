# Use a new signing key and deploy to Google Play

If Play Console shows **"App Bundle is signed with the wrong key"**, the uploaded AAB was signed with a different certificate than the one Play has on file. Fix it by generating a **new** upload key, using it for all builds, and registering it in Play Console (upload key reset).

---

## 1. Generate the new keystore

From the project root, run (replace with a strong password):

```bash
KEYSTORE_PASSWORD=your_secure_password ./scripts/generate-android-keystore.sh
```

- **Requires:** Java JDK installed (`keytool` in PATH).
- This creates `android-credentials/tola-upload-key.jks` and prints the **SHA-1** and **SHA-256** fingerprints.
- **Copy the SHA-1 fingerprint** (e.g. `AA:BB:78:...`) — you’ll need it in Play Console.
- If the script says the keystore already exists, it only prints the fingerprint; delete the file first if you want to regenerate.

---

## 2. Point EAS at the new key (local credentials)

1. Copy the example credentials file and set your keystore password and key password (can be the same as `KEYSTORE_PASSWORD`):

   ```bash
   cp credentials.json.example credentials.json
   ```

2. Edit `credentials.json` and set:
   - `keystorePassword`: the password you used in step 1
   - `keyPassword`: same as `keystorePassword` unless you set `KEY_PASSWORD` when generating
   - `keyAlias`: must match the alias inside your keystore. If you used `scripts/generate-android-keystore.sh`, the alias is `tola-upload-key`. If you used another tool, list aliases with:
     ```bash
     KEYSTORE_PASSWORD=your_password ./scripts/list-keystore-aliases.sh
     ```
     Then set `keyAlias` in `credentials.json` to the alias name shown (e.g. `tola-upload-key`, `upload`, or `mykey`).

3. **Do not commit** `credentials.json` or the `android-credentials/` folder (they are in `.gitignore`).

---

## 3. Register the new key in Google Play Console

1. Open [Google Play Console](https://play.google.com/console) → your app **TOLA**.
2. Go to **Setup** → **App integrity** (or **Release** → **Setup** → **App signing**).
3. Under **App signing**, find **Upload key** (or **Request upload key reset** if you’ve never set one or need to replace the current one).
4. Start **Request upload key reset** (or add the new upload certificate, depending on the screen).
5. When asked for the new certificate, paste the **SHA-1 fingerprint** from step 1 (the line that looks like `SHA1: AA:BB:78:FC:...`). Some flows may ask for a PEM certificate; you can export it with:
   ```bash
   keytool -exportcert -alias tola-upload-key -keystore android-credentials/tola-upload-key.jks -storepass YOUR_KEYSTORE_PASSWORD | openssl enc -base64
   ```
   Or use the fingerprint if the form accepts it.
6. Complete the flow (e.g. confirm reset). After that, **only** app bundles signed with this new key will be accepted.

---

## 4. Build and submit using the new key

Build with the **production-local** profile so EAS uses your local `credentials.json` and the new keystore:

```bash
eas build --platform android --profile production-local
```

When the build finishes:

```bash
eas submit --platform android --profile production --latest
```

Or submit a specific build ID from the [Expo dashboard](https://expo.dev).

The uploaded AAB will be signed with the new key; Play Console will accept it once the upload key reset is done.

---

## Summary

| Step | What to do |
|------|------------|
| 1 | `KEYSTORE_PASSWORD=xxx ./scripts/generate-android-keystore.sh` → copy SHA-1 |
| 2 | `cp credentials.json.example credentials.json` and set passwords |
| 3 | Play Console → App integrity → Request upload key reset → paste new SHA-1 |
| 4 | `eas build -p android --profile production-local` then `eas submit -p android --profile production --latest` |

For future releases, keep using the same keystore and `production-local` (or upload this keystore to EAS and use `production` after switching credentials to this key in EAS).
