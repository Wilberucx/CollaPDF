# CollaPDF

**Image collage creator for PDF with automatic captions.**

CollaPDF lets you organize images into groups and export them as individual PDFs. Each image is automatically arranged using a justified layout algorithm and displays the filename as a caption below.

## Features

- **Justified layout** — images scale and distribute automatically to fill each row without gaps
- **3 size presets** — Small (S), Medium (M), Large (L)
- **Automatic captions** — filename appears below each image in the PDF
- **One PDF per group** — each group generates its own document
- **Responsive** — works on desktop and mobile

## Quick Start

Open `index.html` directly in your browser. No build step required.

## CLI / Binarios

Download pre-compiled binaries from the [GitHub Releases](https://github.com/Wilberucx/CollaPDF/releases) page.

### Usage

```bash
# Linux / macOS
chmod +x collapdf-v1.0-<your-platform>
./collapdf-v1.0-<your-platform>

# Windows
collapdf-v1.0-windows-x86_64.exe
```

The server starts on `http://localhost:8080`. Open that URL in your browser.

### Supported Platforms

| Binary | Platform |
|--------|----------|
| `collapdf-v1.0-linux-amd64` | Linux x86_64 |
| `collapdf-v1.0-linux-arm64` | Linux ARM64 (Termux, Raspberry Pi) |
| `collapdf-v1.0-darwin-amd64` | macOS Intel |
| `collapdf-v1.0-darwin-arm64` | macOS Apple Silicon (M1/M2/M3) |
| `collapdf-v1.0-windows-x86_64.exe` | Windows x86_64 |

### Termux

```bash
chmod +x collapdf-v1.0-linux-arm64
./collapdf-v1.0-linux-arm64
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
