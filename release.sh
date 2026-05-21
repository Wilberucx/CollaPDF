#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

VERSION="1.4"
DIST="dist"
TAG="v${VERSION}"

# Validaciones
[ -d "$DIST" ] || { echo "Error: dist/ no existe. Corré build.sh primero."; exit 1; }

BIN_COUNT=$(find "$DIST" -name "collapdf-v${VERSION}-*" -type f | wc -l)
[ "$BIN_COUNT" -gt 0 ] || { echo "Error: no hay binarios en dist/. Corré build.sh primero."; exit 1; }

gh auth status >/dev/null 2>&1 || { echo "Error: gh no está autenticado. Corré gh auth login."; exit 1; }

# Crear tag si no existe
if ! git tag -l "$TAG" | grep -q "$TAG"; then
  git tag "$TAG"
  echo "→ Tag $TAG creado"
else
  echo "→ Tag $TAG ya existe"
fi

# Release notes
NOTES="## CollaPDF v1.4

Image collage creator for PDF with automatic captions.

### Plataformas
- Linux x86_64 (Ubuntu, Arch, Fedora, etc.)
- Linux ARM64 (Termux, Raspberry Pi)
- macOS Intel
- macOS Apple Silicon (M1/M2/M3)
- Windows x86_64

### Uso

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

# Crear release como draft
echo "→ Creando release draft..."
gh release create "$TAG" "$DIST"/* \
  --title "CollaPDF v1.4" \
  --notes "$NOTES" \
  --draft

echo "✓ Release draft creado: https://github.com/Wilberucx/CollaPDF/releases/tag/$TAG"
echo "Revisá y publicá desde GitHub o con: gh release edit $TAG --draft=false"
