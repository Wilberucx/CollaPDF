# CollaPDF

**Creador de collages de imágenes en PDF con captions automáticos.**

CollaPDF te permite organizar imágenes en grupos y exportarlos como PDFs individuales. Cada imagen se coloca automáticamente siguiendo un layout justificado y muestra el nombre del archivo como leyenda.

## Uso

1. **Agregá imágenes** a cada grupo (drag & drop o selector de archivos)
2. **Elegí el preset de tamaño** (S / M / L) para cada grupo
3. **Exportá** → un PDF separado por grupo

## Características

- **Layout justificado** — las imágenes se escalan y distribuyen automáticamente para llenar cada fila sin espacios vacíos
- **3 presets de tamaño** — Pequeño (S), Mediano (M), Grande (L)
- **Leyendas automáticas** — el nombre de cada imagen aparece debajo en el PDF
- **Un PDF por grupo** — cada grupo genera su propio documento
- **Responsive** — funciona en desktop y mobile

## Estructura del proyecto

```
├── index.html      # Punto de entrada
├── css/
│   └── styles.css  # Estilos
└── js/
    ├── app.js      # Entry point y conexión de módulos
    ├── config.js   # Constantes y presets
    ├── state.js    # Estado de grupos e imágenes
    ├── layout.js   # Algoritmo de layout justificado
    ├── ui.js       # Renderizado de preview y sidebar
    └── pdf.js      # Exportación a PDF con jsPDF
```

## Desarrollo

Abrí `index.html` directamente en el navegador (soporta ES modules natively).

## Tech stack

- Vanilla JS (ES Modules)
- [jsPDF](https://github.com/parallax/jsPDF) para generación de PDFs
- Google Fonts (Space Mono, Archivo, Archivo Black)
