#!/usr/bin/env bash
# Creates the Play upload keystore on this machine. Do not commit the keystore or keystore.properties.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
keystore="$root/android/shaadi-wala-upload.keystore"
props="$root/android/keystore.properties"

if [[ -f "$keystore" || -f "$props" ]]; then
  echo "A keystore or keystore.properties already exists. Refusing to overwrite it." >&2
  exit 1
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "Install a JDK so keytool is on PATH, then run this again." >&2
  exit 1
fi

read -r -p "Key alias [shaadiwala]: " alias
alias="${alias:-shaadiwala}"
read -r -s -p "Store password: " store_password
echo
read -r -s -p "Key password: " key_password
echo

keytool -genkeypair -v \
  -keystore "$keystore" \
  -alias "$alias" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$store_password" \
  -keypass "$key_password" \
  -dname "CN=Shaadi Wala, OU=Mobile, O=Shaadi Wala, L=Mumbai, ST=Maharashtra, C=IN"

umask 077
cat > "$props" <<EOF
storeFile=shaadi-wala-upload.keystore
storePassword=$store_password
keyAlias=$alias
keyPassword=$key_password
EOF

echo "Wrote $keystore and $props. Both are gitignored. Back them up outside the repo."
