#!/usr/bin/env bash
# Generate a new Android upload keystore for TOLA and print the certificate fingerprint.
# Use this key in EAS builds, then register it in Play Console (upload key reset).
#
# Prerequisites: Java JDK installed (keytool must be in PATH).
#
# Usage:
#   KEYSTORE_PASSWORD=your_secret_password ./scripts/generate-android-keystore.sh
#   (KEY_PASSWORD is optional; if unset, KEYSTORE_PASSWORD is used for the key too.)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYSTORE_DIR="$PROJECT_ROOT/android-credentials"
KEYSTORE_FILE="$KEYSTORE_DIR/tola-upload-key.jks"
ALIAS="tola-upload-key"

if ! command -v keytool &>/dev/null; then
  echo "Error: keytool not found. Install a Java JDK and ensure it is in your PATH."
  exit 1
fi

KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-}"
KEY_PASSWORD="${KEY_PASSWORD:-$KEYSTORE_PASSWORD}"

if [ -z "$KEYSTORE_PASSWORD" ]; then
  echo "Set KEYSTORE_PASSWORD (and optionally KEY_PASSWORD) then re-run:"
  echo "  KEYSTORE_PASSWORD=your_secret_password ./scripts/generate-android-keystore.sh"
  exit 1
fi

mkdir -p "$KEYSTORE_DIR"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Keystore already exists at: $KEYSTORE_FILE"
  echo "To regenerate, remove it first: rm $KEYSTORE_FILE"
  echo ""
  echo "Certificate fingerprint (use this in Play Console upload key reset):"
  keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$ALIAS" -storepass "$KEYSTORE_PASSWORD" 2>/dev/null | grep -E "SHA1:|SHA256:"
  exit 0
fi

echo "Generating new keystore..."
keytool -genkeypair -v \
  -storetype JKS \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=TOLA Tanzania, OU=Mobile, O=Tolatola, L=Dar es Salaam, ST=DS, C=TZ"

echo ""
echo "Keystore created: $KEYSTORE_FILE"
echo ""
echo "--- Certificate fingerprint (register this in Google Play Console) ---"
keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$ALIAS" -storepass "$KEYSTORE_PASSWORD" 2>/dev/null | grep -E "SHA1:|SHA256:"
echo "---"
echo ""
echo "Next steps:"
echo "1. Create credentials.json from credentials.json.example and set keystorePath to: android-credentials/tola-upload-key.jks"
echo "2. In Google Play Console: Setup → App integrity → App signing → Request upload key reset → paste the SHA-1 above"
echo "3. Build: eas build --platform android --profile production-local"
echo "4. Submit: eas submit --platform android --profile production --latest"
echo ""
echo "Keep the keystore and passwords safe. Do not commit android-credentials/ or credentials.json."
