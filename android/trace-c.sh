#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "→ Tracing 'C' in Archivo Black..."
magick -size 300x300 xc:white -font "Archivo-Black" -pointsize 180 -fill black -gravity center -annotate +0+15 "C" -negate -threshold 50% /tmp/c-trace.pbm
potrace /tmp/c-trace.pbm -s -o /tmp/c-traced.svg
grep 'd=' /tmp/c-traced.svg | sed 's/.*d="//;s/".*//' > /tmp/c-path.txt
echo ""
echo "=== C PATH DATA ==="
cat /tmp/c-path.txt
echo ""
echo "=== DONE ==="
rm -f /tmp/c-trace.pbm /tmp/c-traced.svg
