# Especificación: Rediseño del concepto "Grupo" → "Documento"

_Versión: 1 — Generado: 2026-06-25_
_Estado: BORRADOR_

---

## 1. Resumen

Reemplazar el concepto de "Grupo" por "Documento" en CollaPDF, incluyendo cambios de nomenclatura, UI, y comportamiento. El objetivo es que la función sea obvia y se explique sola: **cada documento genera su propio archivo PDF**.

---

## 2. Problema

El término "Grupo" es ambiguo porque:
- No transmite que cada grupo produce **un archivo PDF distinto**
- No hay relación visual entre un grupo y su salida (el PDF)
- Los presets S/M/L son crípticos
- No se entiende el modelo mental sin leer la documentación

---

## 3. Decisiones de diseño

| Aspecto | Decisión | Justificación |
|---------|----------|---------------|
| **Nombre** | "Documento" (Document) | Refleja que cada uno genera un PDF |
| **Modelo mental** | 1 documento → 1 archivo PDF | Explícito e intuitivo |
| **Presets** | "Compacto / Normal / Amplio" | Descriptivo vs S/M/L |
| **Modos layout** | "Auto" y "Cuadrícula" | Más claros que "Justified" y "Grid" |
| **Icono** | Apilado de páginas/documento | Metáfora visual de PDF |
| **Docs vacíos** | Ocultar automáticamente | Menos ruido visual |
| **Estado inicial** | Un documento vacío | Comportamiento actual |
| **Máx. por fila** | Por preset (como ahora) | Consistente con el control de layout |
| **Nombres default** | "Documento 1", "Documento 2"... | Simple y directo |
| **Selector preset** | Dropdown en vez de pills | Más limpio visualmente |
| **Separación preview** | Línea divisoria + más espacio | Diferencia visual entre documentos |
| **Exportación** | 1 PDF por documento | Sin cambios |
| **Indicador PDF** | No hace falta | Se sobreentiende |
| **Drag handle** | Mantener actual | Suficiente |

---

## 4. Cambios de nomenclatura

### 4.1 En UI visible al usuario

| Actual | Nuevo |
|--------|-------|
| Grupo | Documento |
| Grupos | Documentos |
| Grupo 1, Grupo 2... | Documento 1, Documento 2... |
| S / M / L | Compacto / Normal / Amplio |
| Justified | Auto |
| Grid | Cuadrícula |
| AGREGAR IMÁGENES A LOS GRUPOS | AGREGAR IMÁGENES AL DOCUMENTO |
| "Grupo" (botón de agregar) | "Documento" (botón de agregar) |
| "GRUPOS" (sidebar label) | "DOCUMENTOS" |
| grupos: (stats) | documentos: |

### 4.2 En código interno

`js/state.js`:
- `groups` → `documents`
- `getGroups()` → `getDocuments()`
- `addGroup()` → `addDocument()`
- `removeGroup()` → `removeDocument()`
- `renameGroup()` → `renameDocument()`
- `reorderGroups()` → `reorderDocuments()`
- `addImagesToGroup()` → `addImagesToDocument()`
- `gCounter` → `dCounter`
- `Grupo ` → `Documento ` en name default

`js/app.js`:
- `addGroup`, `removeGroup`, `renameGroup` → `addDocument`, `removeDocument`, `renameDocument`
- Comentarios GROUP MANAGEMENT → DOCUMENT MANAGEMENT

`js/ui.js`:
- `preview-group-title` → `preview-document-title`
- Variables `group` → `doc`
- `group.name` → `doc.name`

`js/layout.js`:
- `buildPagesForGroup()` → `buildPagesForDocument()`
- Parámetro `group` → `doc`

`js/pdf.js`:
- Comentarios y variables: `group` → `document` / `doc`
- `groupsWithImages` → `docsWithImages`

`css/styles.css`:
- `.group-card` → `.document-card`
- `.group-header` → `.document-header`
- `.group-drag-handle` → `.document-drag-handle`
- `.group-name-input` → `.document-name-input`
- `.group-count` → `.document-count`
- `.group-thumbs` → `.document-thumbs`
- `.preview-group-title` → `.preview-document-title`
- `.groups-list` → `.documents-list`

`js/config.js`:
- `GROUP_GAP` → `DOCUMENT_GAP`

`index.html`:
- `groupsList` → `documentsList`
- `getGroups` → `getDocuments`
- Todos los textos visibles

---

## 5. Cambios visuales

### 5.1 Tarjeta de documento (antes group-card)

```
┌──────────────────────────────────────┐
│ [≡] [Documento 1]      [3] [▼] [×]  │ ← header
├──────────────────────────────────────┤
│ [img1] [img2] [img3]                 │ ← thumbs
├──────────────────────────────────────┤
│ [+ AGREGAR IMÁGENES]                 │ ← drop zone
└──────────────────────────────────────┘
```

- La tarjeta incluye un icono de documento/páginas pequeñito (opcional)
- Dropdown ▼ selecciona: Compacto / Normal / Amplio
- Se mantiene el count de imágenes como badge
- Eliminar las 3 pills S/M/L

### 5.2 Dropdown de preset

Un `<select>` o dropdown estilizado con 3 opciones:
- **Compacto** — filas angostas, más imágenes por página
- **Normal** — equilibrio entre tamaño y cantidad
- **Amplio** — imágenes grandes, menos por página

El tooltip de cada opción puede mostrar el valor en pt:
- Compacto: 70pt de altura de fila
- Normal: 130pt
- Amplio: 200pt

### 5.3 Documento vacío

Cuando un documento no tiene imágenes, NO se muestra en la sidebar. Solo se ve:
- El botón "+ Documento" para crear uno nuevo
- Si no hay ningún documento con imágenes, se muestra el estado vacío en el preview

### 5.4 Preview: separación entre documentos

Entre cada documento en el preview:
- Línea divisoria horizontal delgada (color borde)
- Espaciado extra (el doble del actual)
- Título del documento con el icono de documento/páginas

### 5.5 Icono de documento/páginas

Un SVG simple de páginas apiladas, reutilizado en:
- Header de cada tarjeta de documento (antes del nombre)
- Preview (en el título de cada documento)

---

## 6. Comportamiento

### 6.1 Estado inicial
- Se crea "Documento 1" vacío automáticamente
- Como está vacío, NO se muestra en la sidebar
- Se ve solo el botón "+ Documento" y un mensaje de bienvenida en el preview

### 6.2 Documentos vacíos
- Todos los documentos se muestran siempre en la sidebar, incluso si están vacíos
- Los documentos vacíos muestran el thumbs area vacío y el drop zone "+ AGREGAR IMÁGENES" para que el usuario pueda empezar a usarlos
- No se ocultan documentos vacíos para evitar que el usuario quede sin forma de agregar imágenes

### 6.3 Al agregar imágenes
- Si arrastrás imágenes al drop zone de un documento, aparecen las thumbs
- Si creás un nuevo documento, aparece inmediatamente con su drop zone

### 6.4 Exportación
- Se genera un PDF por documento (sin cambios en la lógica actual)
- El nombre del PDF se genera a partir del nombre del documento (sin cambios)

---

## 7. Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `js/state.js` | Renombrar variables, funciones, strings; ocultar documentos vacíos |
| `js/app.js` | Renombrar funciones expuestas, comentarios |
| `js/ui.js` | Renombrar clases CSS, variables, textos; dropdown en lugar de pills; separación preview |
| `js/layout.js` | Renombrar función, parámetros |
| `js/pdf.js` | Renombrar variables |
| `js/config.js` | Renombrar `GROUP_GAP` |
| `css/styles.css` | Renombrar selectores CSS; nuevos estilos para dropdown, separación preview, icono |
| `index.html` | Renombrar IDs, textos visibles; reemplazar pills por dropdown en template |

---

## 8. Archivos a crear

| Archivo | Contenido |
|---------|-----------|
| `docs/rediseno-documentos-spec.md` | Esta especificación |

---

## 9. No incluido en este alcance

- Cambios en el algoritmo de layout
- Cambios en la generación de PDF
- Nuevas funcionalidades (solo renaming y UI)
- Eliminación del concepto de preset (solo se renombra)
- Funcionalidad de combinar documentos en un solo PDF
