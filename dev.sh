#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "═══ CollaPDF Dev Build ═══"

echo ""
echo "→ 1/3 Building inline HTML..."
./build-inline.sh

echo ""
echo "→ 2/3 Building APK..."
(cd android && ./gradlew assembleDebug -q)

APK="android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "→ 3/3 Installing APK..."
adb install -r "$APK"

echo ""
echo "✓ Done! APK installed on device."
