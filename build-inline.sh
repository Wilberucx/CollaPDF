#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "→ CollaPDF: Building inline HTML..."

mkdir -p build/cli

JS_BUNDLE=$(mktemp)
CAP_TXT=$(mktemp)
trap 'rm -f "$JS_BUNDLE" "$CAP_TXT"' EXIT

# Process non-app modules: remove imports and export keywords
for mod in config utils state layout ui pdf; do
  sed -e '/^import /d' -e 's/^export //' "js/${mod}.js" >> "$JS_BUNDLE"
  echo "" >> "$JS_BUNDLE"
done

# Bridge: save originals before app.js overrides them
# These save the state.js versions so app.js wrappers can call them
cat >> "$JS_BUNDLE" << 'BRIDGE'
// ── Bridge: save originals before app.js overrides ──
var _s_addDocument=addDocument;
var _s_removeDocument=removeDocument;
var _s_setPreset=setPreset;
var _s_renameDocument=renameDocument;
var _s_removeImage=removeImage;
var _s_renameImage=renameImage;
var _s_reorderImages=reorderImages;
var _s_toggleImageSelection=toggleImageSelection;
var _s_deleteSelectedImages=deleteSelectedImages;
var _s_clearSelection=clearSelection;
var _c_updatePreset=updatePreset;
var _c_updateMaxRow=updateMaxRow;
var _c_setLayoutMode=setLayoutMode;
var _c_setFontScale=setFontScale;
var _c_setShowCaptions=setShowCaptions;
var _c_setSinglePdfExport=setSinglePdfExport;
BRIDGE

# Process app.js: remove imports/exports, replace namespace refs to point to bridges or fallback to global scope
# NOTE: app.js is wrapped in an IIFE to prevent its function declarations from
# hoisting and shadowing the module-level functions captured by the bridge.
# Without this IIFE, the bridge variables would capture app.js wrapper functions
# instead of the original module functions, causing infinite recursion.
echo "(function() {" >> "$JS_BUNDLE"
sed \
  -e '/^import /d' \
  -e 's/^export //' \
  -e 's/state\.addDocument/_s_addDocument/g' \
  -e 's/state\.removeDocument/_s_removeDocument/g' \
  -e 's/state\.setPreset/_s_setPreset/g' \
  -e 's/state\.renameDocument/_s_renameDocument/g' \
  -e 's/state\.removeImage/_s_removeImage/g' \
  -e 's/state\.renameImage/_s_renameImage/g' \
  -e 's/state\.reorderImages/_s_reorderImages/g' \
  -e 's/state\.toggleImageSelection/_s_toggleImageSelection/g' \
  -e 's/state\.deleteSelectedImages/_s_deleteSelectedImages/g' \
  -e 's/state\.clearSelection/_s_clearSelection/g' \
  -e 's/config\.updatePreset/_c_updatePreset/g' \
  -e 's/config\.updateMaxRow/_c_updateMaxRow/g' \
  -e 's/config\.setLayoutMode/_c_setLayoutMode/g' \
  -e 's/config\.setFontScale/_c_setFontScale/g' \
  -e 's/config\.setShowCaptions/_c_setShowCaptions/g' \
  -e 's/config\.setSinglePdfExport/_c_setSinglePdfExport/g' \
  -e 's/state\.//g' \
  -e 's/ui\.//g' \
  -e 's/config\.//g' \
  js/app.js >> "$JS_BUNDLE"
echo "
// ── End app.js IIFE ──
})();" >> "$JS_BUNDLE"

# Build HTML: inject CSS and JS bundle into index.html
{
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      *'<link rel="stylesheet" href="css/styles.css">'*)
        echo "<style>"
        cat css/styles.css
        echo "</style>"
        ;;
      *'<script type="module" src="js/app.js'*)
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

# Build dist/ for Capacitor — inject native bridge before </body>
mkdir -p dist

{
  echo "<script>"
  cat js/capacitor.js
  echo "</script>"
} > "$CAP_TXT"
# Inject capacitor.js before the LAST </body> using Python (handles single occurrence correctly)
python3 -c "
import re
with open('build/cli/inline.html','r') as f:
    content = f.read()
with open('$CAP_TXT','r') as f:
    cap = f.read()
# Replace only the LAST </body> tag
idx = content.rfind('</body>')
if idx >= 0:
    content = content[:idx] + cap + '\n' + content[idx:]
with open('dist/index.html','w') as f:
    f.write(content)
" 2>&1

echo "✓ dist/index.html generated for Capacitor ($(wc -c < dist/index.html) bytes)"

# Auto-sync to Android project if the android directory exists
if [ -d "android" ]; then
  echo "→ Syncing to Android project..."
  npx cap copy 2>/dev/null && echo "✓ Android assets updated" || echo "  ℹ Run 'npx cap copy' manually if needed"
fi
