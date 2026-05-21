#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

VERSION="1.4"
DIST="dist"

TARGETS=(
  "x86_64-unknown-linux-gnu:linux-amd64"
  "aarch64-unknown-linux-gnu:linux-arm64"
  "x86_64-pc-windows-msvc:windows-x86_64"
  "x86_64-apple-darwin:darwin-amd64"
  "aarch64-apple-darwin:darwin-arm64"
)

mkdir -p "$DIST"

for target_pair in "${TARGETS[@]}"; do
  TARGET="${target_pair%%:*}"
  NAME="${target_pair##*:}"
  OUTPUT="${DIST}/collapdf-v${VERSION}-${NAME}"

  echo "→ Compilando ${TARGET}..."
  if deno compile \
    --target "$TARGET" \
    --allow-net \
    --allow-read \
    --output "$OUTPUT" \
    cli/server.ts; then
    echo "  ✓ ${OUTPUT}"
  else
    echo "  ✗ Falló ${TARGET} (puede faltar el target cacheado)"
  fi
done

# Copy inline.html alongside binaries (server reads from cwd)
cp build/cli/inline.html "${DIST}/inline.html"

# SHA256SUMS
echo "→ Generando SHA256SUMS..."
cd "$DIST"
sha256sum collapdf-v${VERSION}-* 2>/dev/null > SHA256SUMS || true
echo "✓ Build completo en ${DIST}/"
