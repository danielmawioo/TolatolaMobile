#!/usr/bin/env bash
# List all key aliases in your Android keystore so you can set the correct keyAlias in credentials.json.
#
# Usage:
#   KEYSTORE_PASSWORD=your_password ./scripts/list-keystore-aliases.sh
# Or with a custom keystore path:
#   KEYSTORE_PASSWORD=your_password KEYSTORE_PATH=path/to/your.jks ./scripts/list-keystore-aliases.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYSTORE_PATH="${KEYSTORE_PATH:-$PROJECT_ROOT/android-credentials/tola-upload-key.jks}"

if [ -z "${KEYSTORE_PASSWORD:-}" ]; then
  echo "Usage: KEYSTORE_PASSWORD=your_password ./scripts/list-keystore-aliases.sh"
  exit 1
fi

if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "Keystore not found: $KEYSTORE_PATH"
  exit 1
fi

echo "Aliases in $KEYSTORE_PATH:"
echo "---"
keytool -list -keystore "$KEYSTORE_PATH" -storepass "$KEYSTORE_PASSWORD" 2>/dev/null
echo "---"
echo "Set keyAlias in credentials.json to one of the aliases above (e.g. the first name before the comma)."
