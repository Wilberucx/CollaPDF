#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

VERSION="1.5"
DIST="dist"
TAG="v${VERSION}"

# Build APK Android si no existe
APK_SRC="android/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$APK_SRC" ]; then
  echo "→ Building Android APK..."
  (cd android && ./gradlew assembleDebug -q) || { echo "⚠ No se pudo buildear el APK (continuando sin él)"; APK_SRC=""; }
fi

# Validaciones
[ -d "$DIST" ] || { echo "Error: dist/ no existe. Corré build.sh primero."; exit 1; }

BIN_COUNT=$(find "$DIST" -name "collapdf-v${VERSION}-*" -type f | wc -l)
ASSET_COUNT=$((BIN_COUNT + (${#APK_SRC} > 0 ? 1 : 0)))
[ "$ASSET_COUNT" -gt 0 ] || { echo "Error: no hay assets para publicar. Corré build.sh primero."; exit 1; }

gh auth status >/dev/null 2>&1 || { echo "Error: gh no está autenticado. Corré gh auth login."; exit 1; }

# Crear tag si no existe
if ! git tag -l "$TAG" | grep -q "$TAG"; then
  git tag "$TAG"
  echo "→ Tag $TAG creado"
else
  echo "→ Tag $TAG ya existe"
fi

# Release notes
NOTES="## CollaPDF v1.5

Image collage creator for PDF with automatic captions.

### Novedades v1.5
- **Selección multi-imagen** — tocá las miniaturas para seleccionar y eliminar varias imágenes a la vez
- **Deshacer (Undo)** — después de eliminar, aparecer un botón para restaurar las imágenes eliminadas
- **Drag & drop táctil** — reordená imágenes arrastrando desde el grip en dispositivos móviles
- **APK Android** — app nativa para Android disponible como APK
- **Wrapping responsive** — botones adaptables a fuentes grandes del sistema
- **Bridge fix** — corrección de compatibilidad para la app Android empaquetada

### Plataformas
- **Android** — APK nativo (app/src/main/) 
- **Linux** x86_64 y ARM64
- **macOS** Intel y Apple Silicon (M1/M2/M3)
- **Windows** x86_64

### APK Android

Descargá el archivo `app-debug.apk` e instalalo en tu dispositivo:

\`\`\`bash
adb install app-debug.apk
\`\`\`

O transferilo al dispositivo e instalalo manualmente.

### CLI / Servidor Web

\`\`\`bash
# Linux / macOS
chmod +x collapdf-v${VERSION}-*
./collapdf-v${VERSION}-<tu-plataforma>

# Windows
collapdf-v${VERSION}-windows-x86_64.exe
\`\`\`

El servidor se levanta en \`http://localhost:8080\`. Abrí esa URL en tu navegador.

### Termux

\`\`\`bash
chmod +x collapdf-v${VERSION}-linux-arm64
./collapdf-v${VERSION}-linux-arm64
# Abrí http://localhost:8080 en Chrome/Firefox de Android
\`\`\`

### Verificar checksums

\`\`\`bash
sha256sum -c SHA256SUMS
\`\`\`
"

# Copiar APK a dist/ si existe
if [ -n "${APK_SRC:-}" ] && [ -f "$APK_SRC" ]; then
  cp "$APK_SRC" "$DIST/app-debug.apk"
  echo "→ APK copiado a $DIST/app-debug.apk"
fi

# Crear release como draft
echo "→ Creando release draft..."
gh release create "$TAG" "$DIST"/* \
  --title "CollaPDF v1.5" \
  --notes "$NOTES" \
  --draft

echo "✓ Release draft creado: https://github.com/Wilberucx/CollaPDF/releases/tag/$TAG"
echo "Revisá y publicá desde GitHub o con: gh release edit $TAG --draft=false"
