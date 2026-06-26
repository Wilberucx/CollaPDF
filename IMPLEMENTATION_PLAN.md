# 📋 Plan de Implementación: Fix inconsistencias módulo vs inline build

_Versión: 1 — Generado: 2026-06-26_
_Estado: PENDIENTE DE APROBACIÓN_

## 1. Resumen Ejecutivo

Corregir las dos inconsistencias funcionales encontradas entre los módulos (`js/` + `index.html`) y el inline build (`build/cli/inline.html`):

1. **renderSidebar**: en el inline build los documentos vacíos se ocultan (no se pueden agregar imágenes), mientras que en el módulo se muestran con su drop-zone.
2. **Font Scale**: el inline build no tiene el toggle de tamaño de fuente que sí existe en los módulos.

Ambos fixes se aplican exclusivamente sobre `build/cli/inline.html`, alineándolo al comportamiento de los módulos. Tiempo estimado: ~30 min.

## 2. Contexto y Estado Actual

- **Situación actual**: `build/cli/inline.html` es un archivo autónomo (todo-en-uno) que duplica la lógica de los módulos. No hay un build script que lo genere automáticamente, por lo que las modificaciones deben hacerse a mano en ambos lugares.
- **Problema o gap**: El inline build se desvió del comportamiento de los módulos en dos puntos: filtra documentos vacíos (en vez de mostrarlos) y no incluye el Font Scale.
- **Suposiciones**:
  - El inline build se considera un "snapshot" del app que debe tener el mismo comportamiento que los módulos.
  - No hay tests automatizados; la validación es manual abriendo el HTML en el navegador.
  - `build/cli/inline.html` usa `px` duros para font-size, mientras que el módulo usa `rem`. No se planea cambiar esto ahora (solo se documenta la diferencia).
- **Dependencias externas**: Ninguna.

## 3. Arquitectura / Diseño de la Solución

### 3.1 Fix renderSidebar: docs vacíos visibles

**Cambio**: Reemplazar la lógica de filtrado (`visibleDocs`) por la misma del módulo: iterar sobre todos los documentos y mostrar el drop-zone en los vacíos.

**Archivo afectado**: `build/cli/inline.html`

**Líneas afectadas en el inline build**:

- `const visibleDocs = docs.filter(d => d.images.length > 0);` (dentro de `renderSidebar`)
- El bloque `if (visibleDocs.length === 0) { ... sidebar-empty ... }`
- El `list.innerHTML = visibleDocs.map(...)` debe cambiarse a `list.innerHTML = docs.map(...)`

**Efecto**: Los documentos sin imágenes se mostrarán como cards con drop-zone, idéntico al módulo.

### 3.2 Font Scale

**Cambio**: Agregar al inline build las piezas faltantes:

1. **Config**: `FONT_SCALE: 'M'` en DEFAULTS, `loadConfig()` debe parsearlo, `saveConfig()` debe guardarlo.
2. **Variables/funciones**: `FONT_SCALE`, `FONT_SCALE_MAP`, `setFontScale()`, `getFontScaleValue()`.
3. **UI**: Sección "Tamaño de fuente" en el panel de settings (HTML) + `updateFontScaleUI()` en JS.
4. **Bridge**: `setFontScale`, `applyFontScale`, `updateFontScaleUI` en la sección app + `window.app.setFontScale`.
5. **Init**: Llamar `applyFontScale()` y `updateFontScaleUI()` al inicio.

**Archivo afectado**: `build/cli/inline.html` (tanto HTML como JS y CSS)

## 4. Fases e Hitos

### Fase 1: Fix renderSidebar — docs vacíos en el inline build

**DURACIÓN ESTIMADA**: 10 min
**OBJETIVO**: El inline build muestra todos los documentos (incluso vacíos) igual que el módulo.
**ENTREGABLE**: `build/cli/inline.html` modificado, revisado y commiteado.

#### Tareas

- [ ] Tarea 1.1 — Reemplazar filtro `visibleDocs` en `renderSidebar`
  - Archivos afectados: `build/cli/inline.html`
  - Instrucciones: Cambiar `const visibleDocs = docs.filter(d => d.images.length > 0);` por la iteración directa sobre `docs`. Cambiar `visibleDocs.map(...)` por `docs.map(...)`. Reemplazar el bloque `if (visibleDocs.length === 0) { ... sidebar-empty ... }` con la lógica que renderiza todos los docs + el drop-zone condicional cuando `d.images.length === 0`.
  - Referencia: La implementación exacta está en `js/ui.js` en `renderSidebar()`, desde `list.innerHTML = docs.map(...)` hasta el cierre del `.join('')`.
  - Criterio de completado: Al abrir el inline build se ven todos los documentos en la sidebar, incluso los vacíos con su drop-zone "+ AGREGAR IMÁGENES".

#### Criterio de Aceptación de la Fase

- [ ] Documentos vacíos se muestran con drop-zone en el inline (vs ocultos antes)
- [ ] Documentos con imágenes se siguen mostrando correctamente
- [ ] El botón "Agregar Documento" mobile sigue funcionando

#### Riesgos de la fase

- El bloque `sidebar-empty` CSS y HTML ya no se usa → podría eliminarse si se desea, pero es optativo. → Se deja como código muerto documentado.

---

### Fase 2: Agregar Font Scale al inline build

**DURACIÓN ESTIMADA**: 20 min
**OBJETIVO**: El inline build tiene el toggle de tamaño de fuente funcionando, igual que el módulo.
**ENTREGABLE**: `build/cli/inline.html` modificado, revisado y commiteado.

#### Tareas

- [ ] Tarea 2.1 — Agregar `FONT_SCALE` a DEFAULTS y config
  - Archivos afectados: `build/cli/inline.html`
  - Instrucciones: En la sección de CONSTANTS/DEFAULTS, agregar `FONT_SCALE: 'M'`. En `loadConfig()`, agregar `FONT_SCALE: parsed.FONT_SCALE || DEFAULTS.FONT_SCALE`. En `saveConfig()`, agregar `FONT_SCALE`. Declarar `let FONT_SCALE = loaded.FONT_SCALE;`. Agregar `const FONT_SCALE_MAP = { S: 0.85, M: 1.0, L: 1.15 };`. Agregar funciones `setFontScale(scale)` y `getFontScaleValue()`.
  - Referencia: `js/config.js` líneas 9, 17, 29, 35, 46, 79-89.
  - Criterio de completado: Las variables existen y se persisten en localStorage.

- [ ] Tarea 2.2 — Agregar UI del Font Scale (HTML)
  - Archivos afectados: `build/cli/inline.html`
  - Instrucciones: En la sección de settings (`#presetSettings`), después del layout-toggle, agregar los `<div class="settings-section">` con el toggle S/M/L. Es idéntico a `index.html` líneas 155-164.
  - Criterio de completado: Se ven los 3 botones S/M/L en el panel de settings.

- [ ] Tarea 2.3 — Agregar lógica de app (Bridge, apply, UI)
  - Archivos afectados: `build/cli/inline.html`
  - Instrucciones: Agregar `setFontScale`, `applyFontScale`, `updateFontScaleUI` en la sección de APP, antes del init. Agregar `setFontScale: setFontScale` (o `setFontScale: _setFontScale`) al objeto `window.app`. Llamar `applyFontScale()` y `updateFontScaleUI()` al inicio.
  - Referencia: `js/app.js` líneas 30, 191-207, y las llamadas en init (líneas 506-507).
  - Criterio de completado: Al hacer clic en S/M/L cambia el font-size de la UI y se persiste.

- [ ] Tarea 2.4 — Agregar CSS para el Font Scale (si es necesario)
  - Archivos afectados: `build/cli/inline.html` (CSS embebido)
  - Instrucciones: Revisar si se necesita CSS adicional. El módulo reutiliza `.layout-toggle` y `.layout-toggle-btn` que ya existen en el inline build. No debería necesitar CSS nuevo.
  - Criterio de completado: Los botones S/M/L se ven correctamente estilizados.

#### Criterio de Aceptación de la Fase

- [ ] Aparece la sección "Tamaño de fuente" en settings con botones S/M/L
- [ ] Hacer clic en S cambia a fuente pequeña, M a normal, L a grande
- [ ] El cambio persiste al recargar la página
- [ ] El botón activo tiene el estilo visual correcto (clase `active`)

#### Riesgos de la fase

- `applyFontScale()` modifica `document.documentElement.style.fontSize`. Como el inline build usa `px` duros, el Font Scale solo afectará a elementos con `rem` (que no existen en el inline) y a los que heredan de `html`. → El fix sería agregar `html { font-size: 14px; }` al CSS del inline para que la escala funcione correctamente.
- **Mitigación**: Agregar `html { font-size: 14px; }` al CSS del inline build si no existe. Esto permite que `applyFontScale()` funcione correctamente (multiplica la base 14px por el factor de escala).

---

### Fase 3: Revisión y validación

**DURACIÓN ESTIMADA**: 5 min
**OBJETIVO**: Verificar que ambos fixes son correctos y no rompen nada.
**ENTREGABLE**: Code review + commit.

#### Tareas

- [ ] Tarea 3.1 — Code review con code-reviewer-deepseek-flash
  - Archivos afectados: `build/cli/inline.html`
  - Instrucciones: Revisar ambos cambios. Confirmar que la lógica de renderSidebar es idéntica al módulo y que el Font Scale funciona correctamente sin efectos secundarios.
  - Criterio de completado: Reviewer no encuentra issues críticos.

- [ ] Tarea 3.2 — Validación manual en navegador
  - Archivos afectados: `build/cli/inline.html`
  - Instrucciones: Abrir el archivo en Chrome. Verificar: (1) docs vacíos se ven con drop-zone, (2) Font Scale cambia el tamaño, (3) no hay errores en consola.
  - Criterio de completado: Todo funciona.

- [ ] Tarea 3.3 — Commit atómico
  - Instrucciones: `git add -A && git commit -m "fix(inline): align renderSidebar (show empty docs) + add font scale toggle"`
  - Criterio de completado: Commit creado.

---

## 5. Especificaciones Técnicas Detalladas

### 5.1 Estructura de archivos

No se crean archivos nuevos. Solo se modifica `build/cli/inline.html`.

### 5.2 Snippets de código críticos

#### Font Scale — Config (en CONSTANTS/DEFAULTS):

```js
const DEFAULTS = {
  PRESETS: { S: 70, M: 130, L: 200 },
  MAX_PER_ROW: { S: 8, M: 5, L: 3 },
  LAYOUT_MODE: "justified",
  FONT_SCALE: "M",
};
```

#### Font Scale — loadConfig:

```js
FONT_SCALE: parsed.FONT_SCALE || DEFAULTS.FONT_SCALE;
```

#### Font Scale — saveConfig:

```js
localStorage.setItem(
  STORAGE_KEY,
  JSON.stringify({
    PRESETS,
    MAX_PER_ROW,
    LAYOUT_MODE,
    FONT_SCALE,
  }),
);
```

#### Font Scale — Variables y funciones:

```js
let FONT_SCALE = loaded.FONT_SCALE;
const FONT_SCALE_MAP = { S: 0.85, M: 1.0, L: 1.15 };

function setFontScale(scale) {
  if (scale === "S" || scale === "M" || scale === "L") {
    FONT_SCALE = scale;
    saveConfig();
  }
}
function getFontScaleValue() {
  return FONT_SCALE_MAP[FONT_SCALE] || 1.0;
}
```

#### Font Scale — App bridge + apply + UI update:

```js
function _setFontScale(scale) {
  setFontScale(scale);
  applyFontScale();
  updateFontScaleUI();
}

function applyFontScale() {
  const scale = getFontScaleValue();
  const baseSize = Math.round(14 * scale * 10) / 10;
  document.documentElement.style.fontSize = baseSize + "px";
}

function updateFontScaleUI() {
  for (const s of ["S", "M", "L"]) {
    const btn = document.getElementById("font" + s);
    if (btn) {
      btn.classList.toggle("active", FONT_SCALE === s);
    }
  }
}
```

#### renderSidebar — Cambio de visibleDocs a docs.map():

Reemplazar:

```js
const visibleDocs = docs.filter(d => d.images.length > 0);
if (visibleDocs.length === 0) {
  list.innerHTML = `...sidebar-empty...`;
} else {
  list.innerHTML = visibleDocs.map(d => { ... }).join('');
}
```

Por:

```js
list.innerHTML = docs.map(d => { ... }).join('');
```

Donde el template incluye el drop-zone condicional para docs sin imágenes, igual que en `js/ui.js`.

### 5.3 HTML del Font Scale

```html
<div class="settings-section">
  <div class="settings-section-title">Tamaño de fuente</div>
  <div class="settings-section-desc">
    Controla el tamaño de la interfaz. Se adapta automáticamente en dispositivos
    móviles.
  </div>
  <div class="layout-toggle" id="fontScaleToggle">
    <button
      class="layout-toggle-btn"
      id="fontS"
      onclick="app.setFontScale('S')"
      title="Fuente pequeña"
    >
      <span>S</span>
    </button>
    <button
      class="layout-toggle-btn"
      id="fontM"
      onclick="app.setFontScale('M')"
      title="Fuente normal"
    >
      <span>M</span>
    </button>
    <button
      class="layout-toggle-btn"
      id="fontL"
      onclick="app.setFontScale('L')"
      title="Fuente grande"
    >
      <span>L</span>
    </button>
  </div>
</div>
```

## 6. Testing y Validación

| Tipo              | Cobertura                 | Herramienta                  | Criterio                                 |
| ----------------- | ------------------------- | ---------------------------- | ---------------------------------------- |
| Code review       | Ambas fases               | code-reviewer-deepseek-flash | Sin issues críticos                      |
| Validación visual | renderSidebar docs vacíos | Abrir inline.html en Chrome  | Docs vacíos visibles con drop-zone       |
| Validación visual | Font Scale                | Abrir inline.html en Chrome  | Botones S/M/L funcionales y persistentes |
| Consola           | Sin errores               | DevTools                     | 0 errores JS                             |

## 7. Plan de Despliegue

No aplica (no hay servidor). Los cambios están listos al commitearearlos.

## 8. Plan de Rollback

`git checkout HEAD~1 build/cli/inline.html` para revertir.

## 9. Riesgos y Mitigaciones

| Riesgo                                                               | Prob. | Impacto | Mitigación                                                         |
| -------------------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------ |
| Font Scale no funciona porque el CSS usa px duros                    | Alta  | Bajo    | Agregar `html { font-size: 14px }` al CSS del inline               |
| El template de renderSidebar tiene diferencias sutiles con el módulo | Media | Medio   | Copiar exactamente el template de `js/ui.js` adaptando referencias |
| Se rompe el drag & drop de documentos (usa IDs)                      | Baja  | Alto    | Revisar que la estructura HTML generada sea idéntica               |

## 10. Criterios de Éxito Globales

- [ ] El inline build muestra documentos vacíos igual que el módulo
- [ ] El inline build tiene Font Scale funcional (S/M/L con persistencia)
- [ ] Todos los demás comportamientos del inline build siguen igual
- [ ] Sin errores de consola

## 11. Recursos y Referencias

- **Módulo de referencia renderSidebar**: `js/ui.js` → función `renderSidebar()`
- **Módulo de referencia Font Scale config**: `js/config.js` → `FONT_SCALE`, `setFontScale()`, `getFontScaleValue()`
- **Módulo de referencia Font Scale app**: `js/app.js` → `setFontScale()`, `applyFontScale()`, `updateFontScaleUI()`
- **Módulo de referencia HTML**: `index.html` → sección "Tamaño de fuente"
- **Inline build actual**: `build/cli/inline.html`

## 12. Primeros pasos al aprobar

1. Abrir `build/cli/inline.html` en el editor
2. Localizar la función `renderSidebar()` y reemplazar el bloque `visibleDocs` por el template de `js/ui.js`
3. Localizar la sección de CONSTANTS/DEFAULTS y agregar `FONT_SCALE: 'M'`, luego seguir con config, HTML, app bridge e init
