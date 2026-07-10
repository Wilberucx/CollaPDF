# Especificación: Exportar todos los documentos en un solo PDF

_Versión: 1 — Generado: 2026-07-08_
_Estado: BORRADOR_

---

## 1. Resumen

Agregar la funcionalidad de exportar **todos los documentos con imágenes** de CollaPDF en **un único archivo PDF combinado**, manteniendo como alternativa la exportación actual (un PDF por documento). La selección entre ambos modos se controla mediante un toggle en el panel de configuración.

---

## 2. Problema

Actualmente CollaPDF genera **un archivo PDF por documento**. Cuando un usuario crea múltiples documentos relacionados (ej. "Informe", "Anexos", "Fotos") y quiere compartirlos o guardarlos como una sola unidad, debe descargar varios archivos y combinarlos manualmente, lo cual es tedioso e incompatible con ciertos flujos de trabajo (ej. enviar un único adjunto por email).

---

## 3. Decisiones de diseño

| Aspecto | Decisión | Justificación |
|---------|----------|---------------|
| **Mecanismo** | Toggle en panel de settings | No satura la UI principal; el usuario lo configura una vez y exporta |
| **Default** | Un PDF por documento (comportamiento actual) | No rompe flujos existentes |
| **Orden de documentos** | Mismo orden que en la sidebar | Consistente con la UI; el usuario controla el orden arrastrando |
| **Separación entre docs** | Flujo natural de página (como en preview) + encabezado sutil | Sin saltos de página forzados; el layout existente decide |
| **Encabezado de documento** | Texto pequeño, esquina superior derecha, gris claro | Sutil pero informativo |
| **Frecuencia del encabezado** | En TODAS las páginas de cada documento | El usuario siempre sabe en qué documento está |
| **Docs sin imágenes** | Se omiten del PDF combinado | No tiene sentido incluir páginas vacías |
| **Nombre del PDF** | Nombres de documentos concatenados con " & " | Aprovecha que el usuario nombra sus documentos |
| **Truncamiento del nombre** | Máximo 3 documentos en el nombre | Evita nombres excesivamente largos |
| **Mobile sharing** | Mismo flujo que ahora (diálogo Guardar/Compartir) | Consistente; solo cambia que es un solo archivo |

---

## 4. UX / UI

### 4.1 Toggle en settings

Dentro del panel de settings (engranaje), se agrega una nueva sección:

```
┌──────────────────────────────┐
│  EXPORTACIÓN                 │
│                              │
│  Formato de exportación      │
│                              │
│  ┌────────────────────────┐  │
│  │  ○ 1 PDF por documento │  │
│  │  ● Todo en un solo PDF │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

- **Opciones**: radio buttons o chips toggle
  - "1 PDF por documento" (default)
  - "Todo en un solo PDF"
- Persistencia: se guarda en `localStorage` como parte de la config existente

### 4.2 Botón Exportar (sin cambios)

El botón "Exportar PDF" mantiene su texto, posición y comportamiento. Internamente respeta el toggle:
- **Modo "1 PDF por documento"**: comportamiento actual (un jsPDF por doc, descargas múltiples)
- **Modo "Todo en un solo PDF"**: genera un único jsPDF con todos los documentos ensamblados

### 4.3 Indicación visual (opcional)

Cuando el toggle está en "Todo en un solo PDF", se podría mostrar un texto secundario junto al botón de exportar, ej:
```
[Exportar PDF]  ← modo: PDF combinado
```

Esto es opcional y se puede agregar en una iteración futura.

---

## 5. Comportamiento del PDF combinado

### 5.1 Ensamblado

Para cada documento con imágenes (omitir vacíos), en orden de sidebar:

1. Obtener las páginas generadas por `buildPagesForDocument()` (layout existente)
2. Agregar cada página al mismo jsPDF, respetando el layout individual de cada documento
3. En cada página, agregar el encabezado del documento

### 5.2 Encabezado de documento en PDF

```
┌──────────────────────────────────────┐
│                           Informe    │  ← gris claro, 8pt, alineado derecha
│                                      │
│          [imágenes del layout]       │
│                                      │
└──────────────────────────────────────┘
```

- **Posición**: esquina superior derecha, a 10pt del borde derecho y 8pt del borde superior
- **Contenido**: nombre del documento (ej. "Informe", "Anexos")
- **Estilo**: 
  - Fuente: Helvetica (la de jsPDF)
  - Tamaño: 8pt
  - Color: RGB(160, 160, 160) — gris claro, no intrusivo
  - Alineación: derecha
- **Frecuencia**: en TODAS las páginas de ese documento (no solo la primera)
- **Relación con captions**: el encabezado está fuera del área de contenido (dentro del margen superior), no interfiere con las imágenes

### 5.3 Navegación entre documentos

Cada documento debe respetar la previsualización: **comienza en su propia página nueva**. No se comparten páginas entre documentos.

- Las páginas del Documento A se agregan completas
- Antes de agregar las páginas del Documento B, se fuerza un salto de página (`pdfDoc.addPage()`)
- Esto asegura que ningún documento comparta página con otro, exactamente como se ve en la preview donde cada documento tiene su propio bloque visual separado por un separador

El encabezado con el nombre del documento (esquina superior derecha) aparece en todas las páginas de cada sección.

### 5.4 Configuraciones por documento

Cada documento conserva sus configuraciones individuales:
- **Preset** (Compacto/Normal/Amplio) — define `rowH` y `maxPerRow`
- **Overrides personalizados** (`customRowH`, `customMaxRow`)
- **Layout mode** (Auto/Cuadrícula) — actualmente global, se aplica igual a todos

No hay cambios en cómo se renderiza cada documento; solo se concatenan en un mismo archivo PDF.

---

## 6. Generación del nombre del PDF

### 6.1 Reglas

1. Obtener los nombres de todos los documentos con imágenes
2. Sanitizar cada nombre: reemplazar caracteres no alfanuméricos con `_` (misma lógica actual)
3. Tomar los primeros 3 nombres
4. Si hay más de 3 documentos: concatenar los 3 primeros con ` & ` y agregar ` + N más`
5. Si hay 3 o menos: concatenar todos con ` & `
6. Agregar extensión `.pdf`

### 6.2 Ejemplos

| Documentos | Nombre del PDF |
|------------|----------------|
| "Informe" | `Informe.pdf` |
| "Informe", "Anexos" | `Informe & Anexos.pdf` |
| "Informe", "Anexos", "Fotos" | `Informe & Anexos & Fotos.pdf` |
| "Enero", "Febrero", "Marzo", "Abril", "Mayo" | `Enero & Febrero & Marzo + 2 más.pdf` |

### 6.3 Sanitización

Usar la misma función existente:
```js
const namePart = doc.name.replace(/[^a-zA-Z0-9\-_"]/g, '_');
```

---

## 7. Mobile / Capacitor

### 7.1 Diálogo de compartir (sin cambios estructurales)

El flujo actual para mobile es:
1. Export → genera blobs → `pendingExports[]` → muestra share dialog
2. Share dialog: botón "Guardar" → `downloadPendingPdfs()` | botón "Compartir" → `sharePendingPdfs()`

En modo "Todo en un solo PDF":
- `pendingExports` tendrá **1 solo elemento** (el blob del PDF combinado)
- El diálogo funciona exactamente igual: Guardar descarga 1 archivo, Compartir usa Web Share API con 1 archivo
- El nombre en el success message cambia para reflejar el nombre combinado

### 7.2 Android (FileWriterPlugin)

El plugin existente guarda archivos en `Documents/CollaPDF/`. Con un solo archivo, no hay cambios necesarios.

---

## 8. Config state

Se agrega una nueva clave al config persistente:

```js
// En js/config.js
SINGLE_PDF_EXPORT: false  // false = 1 PDF por doc (default), true = todo en un solo PDF
```

Se guarda en `localStorage` como parte del objeto `collapdf_config` existente.

---

## 9. Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `js/config.js` | Nueva constante `SINGLE_PDF_EXPORT`, función `setSinglePdfExport()` |
| `js/pdf.js` | Modificar `exportPDF()`: si `SINGLE_PDF_EXPORT` es true, ensamblar todos los docs en un jsPDF en lugar de uno por uno. Agregar lógica de encabezados. Modificar nombres de archivo. |
| `js/app.js` | Exponer `setSinglePdfExport`, `getSinglePdfExport` al window.app. |
| `js/ui.js` | Renderizar los nuevos controles de exportación en el panel de settings (sidebar derecha). |
| `index.html` | Template del panel de settings: agregar sección de exportación con radio buttons/chips. |
| `css/styles.css` | Estilos para los nuevos controles de exportación. |

---

## 10. Archivos a crear

| Archivo | Contenido |
|---------|-----------|
| `docs/exportar-todo-en-un-pdf-spec.md` | Esta especificación |

---

## 11. No incluido en este alcance

- Page numbers / numeración de páginas en el PDF combinado
- Tabla de contenidos al inicio del PDF
- Indicador visual en el botón Exportar del modo actual (opcional, ver 4.3)
- Marca de agua o pie de página
- Posibilidad de seleccionar _cuáles_ documentos incluir (es todo o nada)
- Preservar metadata individual por documento dentro del PDF

---

## 12. Edge cases

| Caso | Comportamiento |
|------|----------------|
| 0 documentos con imágenes | Toast "Agregá imágenes antes de exportar" (igual que ahora) |
| 1 documento con imágenes | Se genera un PDF con ese único documento; el nombre es el del documento |
| Documentos sin imágenes | Se omiten del PDF combinado |
| Documentos renombrados con caracteres especiales | Se sanitizan igual que ahora |
| Mobile con modo combinado | 1 blob en pendingExports; diálogo funciona igual |
| Muchos documentos (>20) | Rendimiento: todos se ensamblan en un jsPDF; se puede considerar advertencia si hay muchos |

---

## 13. Consideraciones técnicas

- **jsPDF**: la instancia única se crea con `new jsPDF({ unit: 'pt', format: 'a4', compress: true })`
- **Encabezado**: se agrega con `pdfDoc.text(doc.name, PDF.w - MARGIN, MARGIN - 5, { align: 'right' })` en cada página
- **Presets individuales**: `buildPagesForDocument(doc)` ya respeta los presets de cada documento, no requiere cambios
- **Blob único**: `pdfDoc.output('blob')` se llama una sola vez al final
- **Compatibilidad**: no requiere nuevas dependencias

