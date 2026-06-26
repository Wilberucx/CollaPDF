# CollaPDF

**Image collage creator for PDF with automatic captions.**

CollaPDF lets you organize images into **documents** and export each one as an individual PDF. Every image is automatically arranged using Auto layout (justified) or Grid layout, and displays the filename as a caption below.

## Features

- **Auto layout** — images scale and distribute automatically to fill each row without gaps
- **Grid layout** — fixed columns for uniform spacing
- **3 size presets** — Compact, Normal, Wide (per document)
- **Automatic captions** — filename appears below each image in the PDF
- **One PDF per document** — each document generates its own PDF file
- **Responsive** — works on desktop and mobile

## Quick Start

Open `index.html` directly in your browser. No build step required.

## CLI / Binarios

### Quick Install

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.ps1 | iex
```

Install a specific version:

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.sh | sh -s -- --version v1.1.0

# Windows
irm https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.ps1 | iex -Args @{ Version = "v1.1.0" }
```

### Manual Download

Download pre-compiled binaries from the [GitHub Releases](https://github.com/Wilberucx/CollaPDF/releases) page.

### Usage

```bash
# Linux / macOS
chmod +x collapdf-v1.4-<your-platform>
./collapdf-v1.4-<your-platform>

# Windows
collapdf-v1.4-windows-x86_64.exe
```

The server starts on `http://localhost:8080`. Open that URL in your browser.

### Supported Platforms

| Binary | Platform |
|--------|----------|
| `collapdf-v1.4-linux-amd64` | Linux x86_64 |
| `collapdf-v1.4-linux-arm64` | Linux ARM64 (Termux, Raspberry Pi) |
| `collapdf-v1.4-darwin-amd64` | macOS Intel |
| `collapdf-v1.4-darwin-arm64` | macOS Apple Silicon (M1/M2/M3) |
| `collapdf-v1.4-windows-x86_64.exe` | Windows x86_64 |

### Termux

```bash
chmod +x collapdf-v1.4-linux-arm64
./collapdf-v1.4-linux-arm64
# Open http://localhost:8080 in Chrome/Firefox on Android
```

### Verify Checksums

```bash
sha256sum -c SHA256SUMS
```

### Build from Source

```bash
# Generate inline HTML
./build-inline.sh

# Compile all 5 platforms
./build.sh

# Create GitHub release draft
./release.sh
```

## Documentation

- 🇪🇸 **[Español](docs/README.md)** — Documentación completa en español

## Tech Stack

- Vanilla JS (ES Modules)
- [jsPDF](https://github.com/parallax/jsPDF) for PDF generation
- Google Fonts (Space Mono, Archivo, Archivo Black)
