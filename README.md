# CollaPDF

**Image collage creator for PDF with automatic captions.**

CollaPDF lets you organize images into **documents** and export each one as an individual PDF. Every image is automatically arranged using Auto layout (justified) or Grid layout, and displays the filename as a caption below.

## Features

- **Auto layout** — images scale and distribute automatically to fill each row without gaps
- **Grid layout** — fixed columns for uniform spacing
- **3 size presets** — Compact, Normal, Wide (per document)
- **Automatic captions** — filename appears below each image in the PDF
- **Multi-image selection** — select multiple images to delete at once
- **Undo (Deshacer)** — restore deleted images with one tap
- **Touch drag & drop** — reorder images by dragging on mobile
- **APK Android** — native app for Android devices
- **One PDF per document or combined** — choose per-document or single PDF export
- **Font scale** — adjust interface size (S/M/L)
- **Responsive** — works on desktop and mobile

## Quick Start

### Browser (no build required)

Open `index.html` directly in any browser.

### Android APK

Download `app-debug.apk` from the [GitHub Releases](https://github.com/Wilberucx/CollaPDF/releases) page and install it on your device:

```bash
# Via ADB
adb install app-debug.apk

# Or transfer the APK to your device and open it
```

### CLI / Server

```bash
# Linux / macOS
chmod +x collapdf-v1.5-<your-platform>
./collapdf-v1.5-<your-platform>

# Windows
collapdf-v1.5-windows-x86_64.exe
```

The server starts on `http://localhost:8080`. Open that URL in your browser.

## Quick Install (CLI)

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.ps1 | iex
```

## Download Options

| Asset | Platform |
|-------|----------|
| `app-debug.apk` | Android |
| `collapdf-v1.5-linux-amd64` | Linux x86_64 |
| `collapdf-v1.5-linux-arm64` | Linux ARM64 (Termux, Raspberry Pi) |
| `collapdf-v1.5-darwin-amd64` | macOS Intel |
| `collapdf-v1.5-darwin-arm64` | macOS Apple Silicon (M1/M2/M3) |
| `collapdf-v1.5-windows-x86_64.exe` | Windows x86_64 |

### Termux

```bash
chmod +x collapdf-v1.5-linux-arm64
./collapdf-v1.5-linux-arm64
# Open http://localhost:8080 in Chrome/Firefox on Android
```

### Verify Checksums

```bash
sha256sum -c SHA256SUMS
```

## Build from Source

```bash
# 1. Generate inline HTML (+ Capacitor dist/)
./build-inline.sh

# 2. Build Android APK (requires Android SDK)
cd android && ./gradlew assembleDebug && cd ..

# 3. Compile CLI binaries for all platforms
./build.sh

# 4. Create GitHub release draft
./release.sh
```

### Dev workflow

```bash
# Build + install APK in one command
./dev.sh
```

## Documentation

- 🇪🇸 **[Español](docs/README.md)** — Documentación completa en español

## Tech Stack

- Vanilla JS (ES Modules)
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- Google Fonts (Space Mono, Archivo, Archivo Black)
- [Capacitor](https://capacitorjs.com) — Android APK wrapper
