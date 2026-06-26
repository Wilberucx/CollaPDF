# CollaPDF

**Creador de collages de imágenes en PDF con captions automáticos.**

CollaPDF te permite organizar imágenes en **documentos** y exportar cada uno como un PDF individual. Cada imagen se coloca automáticamente con layout **Auto** (justificado) o **Cuadrícula**, y muestra el nombre del archivo como leyenda.

## Uso

1. **Agregá imágenes** a cada documento (drag & drop o selector de archivos)
2. **Elegí el preset de tamaño** (Compacto / Normal / Amplio) para cada documento
3. **Exportá** → un PDF separado por documento

## Características

- **Layout Auto** — las imágenes se escalan y distribuyen automáticamente para llenar cada fila sin espacios vacíos
- **Layout Cuadrícula** — columnas fijas para espaciado uniforme
- **3 presets de tamaño** — Compacto, Normal, Amplio (por documento)
- **Leyendas automáticas** — el nombre de cada imagen aparece debajo en el PDF
- **Un PDF por documento** — cada documento genera su propio archivo PDF
- **Responsive** — funciona en desktop y mobile

## Estructura del proyecto

```
├── index.html      # Punto de entrada
├── css/
│   └── styles.css  # Estilos
└── js/
    ├── app.js      # Entry point y conexión de módulos
    ├── config.js   # Constantes y presets
    ├── state.js    # Estado de documentos e imágenes
    ├── layout.js   # Algoritmos de layout (Auto y Cuadrícula)
    ├── ui.js       # Renderizado de preview y sidebar
    └── pdf.js      # Exportación a PDF con jsPDF
```

## CLI / Binarios

### Instalación rápida

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/Wilberucx/CollaPDF/main/scripts/install.ps1 | iex
```

El servidor se levanta en `http://localhost:8080`. Abrí esa URL en tu navegador.

### Descarga manual

Descargá binarios pre-compilados desde [GitHub Releases](https://github.com/Wilberucx/CollaPDF/releases).

### Plataformas soportadas

| Binario | Plataforma |
|---------|------------|
| `collapdf-v1.4-linux-amd64` | Linux x86_64 |
| `collapdf-v1.4-linux-arm64` | Linux ARM64 (Termux, Raspberry Pi) |
| `collapdf-v1.4-darwin-amd64` | macOS Intel |
| `collapdf-v1.4-darwin-arm64` | macOS Apple Silicon (M1/M2/M3) |
| `collapdf-v1.4-windows-x86_64.exe` | Windows x86_64 |

## Desarrollo

Abrí `index.html` directamente en el navegador (soporta ES modules natively).

## Tech stack

- Vanilla JS (ES Modules)
- [jsPDF](https://github.com/parallax/jsPDF) para generación de PDFs
- Google Fonts (Space Mono, Archivo, Archivo Black)
