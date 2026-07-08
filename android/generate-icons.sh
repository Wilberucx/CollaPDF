#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

SVG="icon-foreground.svg"
BASE="../android/app/src/main/res"

echo "→ Generating Android launcher icons..."
echo ""

generate() {
  local name="$1" size="$2" dir="$3"
  mkdir -p "$dir"
  rsvg-convert "$SVG" -w "$size" -h "$size" -o "$dir/$name"
  echo "  ✓ $dir/$name (${size}x${size})"
}

# Foreground icons (used by adaptive icon as fallback for pre-v26)
# These should show the full icon content with transparent bg
for size in 48 72 96 144 192; do
  case $size in
    48)  density="mdpi" ;;
    72)  density="hdpi" ;;
    96)  density="xhdpi" ;;
    144) density="xxhdpi" ;;
    192) density="xxxhdpi" ;;
  esac
  dir="${BASE}/mipmap-${density}"
  generate "ic_launcher_foreground.png" "$size" "$dir"
done

# Legacy launcher icons (full icon with background)
# These are the actual app icon that shows on older Android versions
for size in 48 72 96 144 192; do
  case $size in
    48)  density="mdpi" ;;
    72)  density="hdpi" ;;
    96)  density="xhdpi" ;;
    144) density="xxhdpi" ;;
    192) density="xxxhdpi" ;;
  esac
  dir="${BASE}/mipmap-${density}"
  # For legacy icons, draw on rounded dark background
  convert -size "${size}x${size}" xc:'#0c0c0c' \
    -fill '#0c0c0c' -draw "roundrectangle 0,0,$((size-1)),$((size-1)),$((size/8)),$((size/8))" \
    "$dir/ic_launcher_tmp.png"
  # Composite foreground on top
  composite -gravity center "$dir/ic_launcher_foreground.png" "$dir/ic_launcher_tmp.png" "$dir/ic_launcher.png"
  rm -f "$dir/ic_launcher_tmp.png"
  echo "  ✓ $dir/ic_launcher.png (${size}x${size})"

  # Round icon (same for now)
  cp "$dir/ic_launcher.png" "$dir/ic_launcher_round.png"
  echo "  ✓ $dir/ic_launcher_round.png (${size}x${size})"
done

echo ""
echo "✓ All icons generated successfully!"
