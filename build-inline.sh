#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "→ CollaPDF: Building inline HTML..."

mkdir -p build/cli

JS_BUNDLE=$(mktemp)
trap 'rm -f "$JS_BUNDLE"' EXIT

# Process non-app modules: remove imports and export keywords
for mod in config utils state layout ui pdf; do
  sed -e '/^import /d' -e 's/^export //' "js/${mod}.js" >> "$JS_BUNDLE"
  echo "" >> "$JS_BUNDLE"
done

# Bridge: save originals before app.js overrides them
cat >> "$JS_BUNDLE" << 'BRIDGE'
// ── Bridge: save originals before app.js overrides ──
var _s_addGroup=addGroup;
var _s_removeGroup=removeGroup;
var _s_setPreset=setPreset;
var _s_renameGroup=renameGroup;
var _s_removeImage=removeImage;
var _c_updatePreset=updatePreset;
var _c_updateMaxRow=updateMaxRow;
BRIDGE

# Process app.js: remove imports/exports, replace namespace refs
sed \
  -e '/^import /d' \
  -e 's/^export //' \
  -e 's/state\.addGroup/_s_addGroup/g' \
  -e 's/state\.removeGroup/_s_removeGroup/g' \
  -e 's/state\.setPreset/_s_setPreset/g' \
  -e 's/state\.renameGroup/_s_renameGroup/g' \
  -e 's/state\.removeImage/_s_removeImage/g' \
  -e 's/config\.updatePreset/_c_updatePreset/g' \
  -e 's/config\.updateMaxRow/_c_updateMaxRow/g' \
  -e 's/state\.//g' \
  -e 's/ui\.//g' \
  -e 's/config\.//g' \
  js/app.js >> "$JS_BUNDLE"

# Build HTML: inject CSS and JS bundle into index.html
{
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      *'<link rel="stylesheet" href="css/styles.css">'*)
        echo "<style>"
        cat css/styles.css
        echo "</style>"
        ;;
      *'<script type="module" src="js/app.js"></script>'*)
        echo "<script>"
        cat "$JS_BUNDLE"
        echo "</script>"
        ;;
      *)
        echo "$line"
        ;;
    esac
  done < index.html
} > build/cli/inline.html

echo "✓ build/cli/inline.html generated ($(wc -c < build/cli/inline.html) bytes)"
