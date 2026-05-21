# 📋 Plan de Implementación: CollaPDF v1.0 — CLI Binario + Release

_Versión: 1 — Generado: 2026-05-20_
_Estado: PENDIENTE DE APROBACIÓN_

---

## 1. Resumen Ejecutivo

Transformar CollaPDF (app web estática HTML/CSS/JS) en un **binario auto-contenido** distribuible para Linux (amd64 + arm64/Termux), macOS (amd64 + arm64) y Windows. El binario embebe toda la app web inline y levanta un servidor HTTP local en `localhost:8080`. Se automatiza el build cross-platform y el release a GitHub con `gh`.

**Resultado**: Un solo archivo ejecutable por plataforma. El usuario descarga, ejecuta, y abre `http://localhost:8080` en su navegador.

**Tiempo estimado**: 2-3 horas.

---

## 2. Contexto y Estado Actual

- **Situación actual**: CollaPDF es una app web estática (HTML + CSS + 7 módulos JS) que se abre directamente en el navegador con `index.html`. Usa jsPDF desde CDN y Google Fonts desde CDN.
- **Problema**: No hay forma de distribuirlo como aplicación. El usuario necesita tener los archivos y abrirlos manualmente.
- **Objetivo**: Generar binarios nativos por plataforma + release automatizado en GitHub como v1.0.

### Suposiciones

- jsPDF y Google Fonts se cargan desde CDN → el usuario necesita internet para la primera carga (aceptable, ya es así en la versión actual)
- Las imágenes del usuario nunca salen del dispositivo (todo corre en localhost)
- Deno 2.x está disponible en el sistema de build (ya confirmado: Deno 2.7.14)
- `gh` CLI está configurado con permisos de write al repo (ya confirmado: `Wilberucx/CollaPDF`)

### Dependencias externas

- Deno CLI (para compilación cruzada)
- `gh` CLI (para release en GitHub)
- Internet para CDN de jsPDF y Google Fonts (runtime del usuario)

---

## 3. Arquitectura / Diseño de la Solución

### Flujo de build

```
Source files (index.html + css/ + js/)
        │
        ▼
  build-inline.sh          ← Inyecta CSS + JS inline en un solo HTML
        │
        ▼
  build/cli/inline.html    ← HTML auto-contenido (un solo archivo)
        │
        ▼
  cli/server.ts            ← Deno server que sirve el inline.html embebido
        │
        ▼
  build.sh                 ← deno compile --target × 5 plataformas
        │
        ▼
  dist/
  ├── collapdf-v1.0-linux-amd64
  ├── collapdf-v1.0-linux-arm64    ← Termux / Raspberry Pi
  ├── collapdf-v1.0-darwin-amd64
  ├── collapdf-v1.0-darwin-arm64   ← Mac M1/M2/M3
  └── collapdf-v1.0-windows-x86_64.exe
        │
        ▼
  release.sh               ← gh release create + upload de binarios + SHA256SUMS
```

### Decisiones de arquitectura

```
DECISIÓN: Inline HTML vs archivos separados
OPCIONES CONSIDERADAS:
  A) Binario + carpeta de archivos estáticos
  B) HTML inline embebido en el binario (single file)
  C) Self-extracting archive
ELECCIÓN: B
RAZÓN: El usuario pidió "un solo archivo". Con Deno.compile y --embed, el HTML inline queda dentro del binario.
TRADE-OFFS: Se pierde la capacidad de editar los assets sin recompilar. Se mantiene el source separado para desarrollo.

DECISIÓN: Deno vs Bun para compilación
OPCIONES CONSIDERADAS: A) Deno compile, B) Bun build --compile
ELECCIÓN: A (Deno)
RAZÓN: Deno soporta cross-compilation nativa con --target para 5 plataformas desde una sola máquina. Bun no soporta cross-compile.
TRADE-OFFS: Los binarios de Deno son ligeramente más grandes (~30-40MB) vs Bun (~15-20MB).

DECISIÓN: Puerto del servidor
OPCIONES CONSIDERADAS: 8080 (default), puerto configurable con flag
ELECCIÓN: 8080 fijo por ahora
RAZÓN: KISS. Se puede agregar --port en v1.1 si hay conflictos.
TRADE-OFFS: Si 8080 está ocupado, el servidor falla. Se puede mejorar con fallback automático.
```

### Componente: Deno Server

El servidor es mínimo: sirve un solo archivo HTML embebido en el binario via `--embed`.

```
cli/
├── server.ts          ← Entry point: Deno.serve + embed de inline.html
build/
├── cli/
│   └── inline.html    ← Generado por build-inline.sh
```

---

## 4. Fases e Hitos

### Fase 1: Build de HTML inline

DURACIÓN ESTIMADA: 30 min
OBJETIVO: Script que combina index.html + css/styles.css + todos los módulos JS en un solo archivo HTML auto-contenido.
ENTREGABLE: `build-inline.sh` funcional + `build/cli/inline.html` generado.

#### Tareas

- [ ] Tarea 1.1 — Crear `build-inline.sh` — 15 min
  - Lee `index.html`, inyecta el contenido de `css/styles.css` dentro de `<style>`
  - Lee todos los archivos `.js` del directorio `js/`, los concatena en orden correcto (resolviendo imports), e inyecta dentro de `<script>`
  - Reemplaza `<link rel="stylesheet" href="css/styles.css">` por `<style>/* contenido */</style>`
  - Reemplaza `<script type="module" src="js/app.js"></script>` por `<script>/* JS inline */</script>`
  - Elimina `type="module"` del script inline (ya no es módulo, es código plano)
  - Output: `build/cli/inline.html`
  - **Criterio de completado**: `build/cli/inline.html` abre en el navegador y funciona idéntico al `index.html` original

- [ ] Tarea 1.2 — Resolver orden de imports JS — 15 min
  - El orden correcto de concatenación es: `config.js` → `utils.js` → `state.js` → `layout.js` → `ui.js` → `pdf.js` → `app.js`
  - Eliminar las líneas `import ... from './xxx.js'` ya que todo está inline
  - Eliminar `export` statements innecesarios (convertir a funciones globales o IIFE)
  - **Criterio de completado**: El JS inline no tiene errores de consola al cargar

### Fase 2: Deno Server

DURACIÓN ESTIMADA: 20 min
OBJETIVO: Servidor Deno mínimo que sirve el HTML embebido.
ENTREGABLE: `cli/server.ts` funcional.

#### Tareas

- [ ] Tarea 2.1 — Crear `cli/server.ts` — 20 min
  - Usa `Deno.serve()` para levantar HTTP en `:8080`
  - Sirve el `inline.html` embebido en `GET /` con `Content-Type: text/html`
  - Retorna 404 para cualquier otra ruta
  - Imprime en consola: mensaje con la URL `http://localhost:8080`
  - En sistemas desktop (no Termux), intenta abrir el navegador automáticamente (`xdg-open`, `open`, `start`)
  - **Criterio de completado**: `deno run --allow-net cli/server.ts` levanta el servidor y se puede acceder desde el navegador

### Fase 3: Script de compilación cross-platform

DURACIÓN ESTIMADA: 30 min
OBJETIVO: Compilar para las 5 plataformas target con un solo comando.
ENTREGABLE: `build.sh` funcional + 5 binarios en `dist/`.

#### Tareas

- [ ] Tarea 3.1 — Crear `build.sh` — 30 min
  - Define targets: `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`, `x86_64-pc-windows-msvc`, `x86_64-apple-darwin`, `aarch64-apple-darwin`
  - Para cada target: ejecuta `deno compile --target <target> --output dist/collapdf-v1.0-<short-name> --embed build/cli/inline.html cli/server.ts`
  - Crea `dist/` si no existe
  - Muestra progreso de compilación
  - Genera `dist/SHA256SUMS` con checksums de todos los binarios
  - **Criterio de completado**: `dist/` contiene los 5 binarios ejecutables + SHA256SUMS

### Fase 4: Script de release con `gh`

DURACIÓN ESTIMADA: 20 min
OBJETIVO: Crear release en GitHub v1.0 con todos los binarios adjuntos.
ENTREGABLE: `release.sh` funcional.

#### Tareas

- [ ] Tarea 4.1 — Crear `release.sh` — 20 min
  - Valida que `dist/` existe y tiene binarios
  - Valida que `gh` está autenticado (`gh auth status`)
  - Crea tag git `v1.0` si no existe
  - Ejecuta: `gh release create v1.0 dist/* --title "CollaPDF v1.0" --notes "<release notes>" --draft`
  - Release notes: features, plataformas soportadas, instrucciones de uso
  - Crea como draft para revisión antes de publicar
  - **Criterio de completado**: Release draft creado en GitHub con todos los binarios adjuntos

### Fase 5: Documentación y limpieza

DURACIÓN ESTIMADA: 20 min
OBJETIVO: README actualizado con instrucciones CLI + .gitignore.
ENTREGABLE: README.md actualizado + .gitignore.

#### Tareas

- [ ] Tarea 5.1 — Actualizar README.md — 10 min
  - Agregar sección "CLI / Binarios" con instrucciones de descarga y uso por plataforma
  - Incluir instrucciones específicas para Termux
  - Mantener la sección "Quick Start" original (abrir index.html)
  - **Criterio de completado**: README tiene instrucciones claras para ambos modos (web + CLI)

- [ ] Tarea 5.2 — Crear/actualizar .gitignore — 5 min
  - Ignorar `dist/`, `build/cli/inline.html`, binarios compilados
  - No ignorar los scripts de build (`build-inline.sh`, `build.sh`, `release.sh`, `cli/server.ts`)
  - **Criterio de completado**: `git status` no muestra archivos de build como unstaged

- [ ] Tarea 5.3 — Commit inicial del sistema de build — 5 min
  - Commit: `feat: add CLI build system and cross-platform compilation`
  - **Criterio de completado**: Changes commiteados sin errores

---

## 5. Especificaciones Técnicas Detalladas

### 5.1 Estructura de archivos resultante

```
CollaPDF/
├── index.html              ← Original (desarrollo web)
├── css/styles.css          ← Original
├── js/                     ← Original (7 módulos)
├── cli/
│   └── server.ts           ← NUEVO: Deno server entry point
├── build/
│   ├── inline.sh           ← NUEVO: genera HTML inline
│   ├── build.sh            ← NUEVO: compila cross-platform
│   ├── release.sh          ← NUEVO: crea GitHub release
│   └── cli/
│       └── inline.html     ← GENERADO: no commitear
├── dist/                   ← GENERADO: no commitear
│   ├── collapdf-v1.0-linux-amd64
│   ├── collapdf-v1.0-linux-arm64
│   ├── collapdf-v1.0-darwin-amd64
│   ├── collapdf-v1.0-darwin-arm64
│   ├── collapdf-v1.0-windows-x86_64.exe
│   └── SHA256SUMS
├── .gitignore              ← NUEVO/actualizado
└── README.md               ← Actualizado
```

### 5.2 .gitignore

```
# Build artifacts
dist/
build/cli/inline.html
*.exe
```

### 5.3 Snippet crítico: build-inline.sh (lógica de inyección)

```bash
#!/usr/bin/env bash
# Orden de imports: config → utils → state → layout → ui → pdf → app
JS_ORDER="config utils state layout ui pdf app"

# 1. Leer HTML base
HTML=$(cat index.html)

# 2. Inyectar CSS inline
CSS=$(cat css/styles.css)
HTML=$(echo "$HTML" | sed 's|<link rel="stylesheet" href="css/styles.css">|<style>'"$CSS"'</style>|')

# 3. Concatenar JS en orden, removiendo imports/exports
JS_BUNDLE=""
for mod in $JS_ORDER; do
  FILE="js/${mod}.js"
  CONTENT=$(cat "$FILE")
  # Remover líneas de import
  CONTENT=$(echo "$CONTENT" | grep -v "^import ")
  # Remover líneas de export
  CONTENT=$(echo "$CONTENT" | grep -v "^export ")
  JS_BUNDLE="${JS_BUNDLE}${CONTENT}"$'\n'
done

# 4. Reemplazar script module tag
HTML=$(echo "$HTML" | sed 's|<script type="module" src="js/app.js"></script>|<script>'"$JS_BUNDLE"'</script>|')

# 5. Output
mkdir -p build/cli
echo "$HTML" > build/cli/inline.html
```

### 5.4 Snippet crítico: cli/server.ts

```typescript
// Inline HTML se carga via --embed flag de deno compile
// En desarrollo: se lee del filesystem
const HTML_PATH = "build/cli/inline.html";

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const html = await Deno.readTextFile(HTML_PATH);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return new Response("Not Found", { status: 404 });
}

const port = 8080;
console.log(`CollaPDF v1.0`);
console.log(`Servidor activo → http://localhost:${port}`);
console.log(`Abrí esa URL en tu navegador (Chrome, Firefox, etc.)`);

// Intentar abrir navegador automáticamente
const openCmd =
  Deno.build.os === "darwin"
    ? "open"
    : Deno.build.os === "windows"
      ? "cmd.exe"
      : "xdg-open";

try {
  if (Deno.build.os === "windows") {
    new Deno.Command("cmd.exe", {
      args: ["/c", "start", `http://localhost:${port}`],
    }).spawn();
  } else {
    new Deno.Command(openCmd, { args: [`http://localhost:${port}`] }).spawn();
  }
} catch {
  // Silenciar error (ej: servidor sin display)
}

await Deno.serve({ port }, handler);
```

### 5.5 Snippet crítico: build.sh

```bash
#!/usr/bin/env bash
set -e

VERSION="1.0"
DIST="dist"
TARGETS=(
  "x86_64-unknown-linux-gnu:linux-amd64"
  "aarch64-unknown-linux-gnu:linux-arm64"
  "x86_64-pc-windows-msvc:windows-x86_64"
  "x86_64-apple-darwin:darwin-amd64"
  "aarch64-apple-darwin:darwin-arm64"
)

mkdir -p "$DIST"

for target_pair in "${TARGETS[@]}"; do
  TARGET="${target_pair%%:*}"
  NAME="${target_pair##*:}"
  OUTPUT="${DIST}/collapdf-v${VERSION}-${NAME}"

  echo "→ Compilando ${TARGET}..."
  deno compile \
    --target "$TARGET" \
    --allow-net \
    --allow-read \
    --output "$OUTPUT" \
    --embed build/cli/inline.html \
    cli/server.ts
done

# SHA256SUMS
cd "$DIST"
sha256sum collapdf-v${VERSION}-* > SHA256SUMS
echo "✓ Build completo en ${DIST}/"
```

### 5.6 Snippet crítico: release.sh

```bash
#!/usr/bin/env bash
set -e

VERSION="1.0"
DIST="dist"
TAG="v${VERSION}"

# Validaciones
[ -d "$DIST" ] || { echo "Error: dist/ no existe. Corré build.sh primero."; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Error: gh no está autenticado. Corré gh auth login."; exit 1; }

# Crear tag si no existe
git tag -l "$TAG" | grep -q "$TAG" || git tag "$TAG"

# Release notes
NOTES="## CollaPDF v1.0

Image collage creator for PDF with automatic captions.

### Plataformas
- Linux x86_64 (Ubuntu, Arch, Fedora, etc.)
- Linux ARM64 (Termux, Raspberry Pi)
- macOS Intel
- macOS Apple Silicon (M1/M2/M3)
- Windows x86_64

### Uso
\`\`\`bash
# Linux / macOS
chmod +x collapdf-v${VERSION}-*
./collapdf-v${VERSION}-<tu-plataforma>

# Windows
collapdf-v${VERSION}-windows-x86_64.exe
\`\`\`

El servidor se levanta en \`http://localhost:8080\$. Abrí esa URL en tu navegador.

### Termux
\`\`\`bash
chmod +x collapdf-v${VERSION}-linux-arm64
./collapdf-v${VERSION}-linux-arm64
# Abrí http://localhost:8080 en Chrome/Firefox de Android
\`\`\`

### Verificar checksums
\`\`\`bash
sha256sum -c SHA256SUMS
\`\`\`
"

# Crear release como draft
gh release create "$TAG" "$DIST"/* \
  --title "CollaPDF v1.0" \
  --notes "$NOTES" \
  --draft

echo "✓ Release draft creado: https://github.com/Wilberucx/CollaPDF/releases/tag/$TAG"
echo "Revisá y publicá desde GitHub o con: gh release edit $TAG --draft=false"
```

---

## 6. Testing y Validación

| Tipo de test | Cobertura esperada        | Herramienta                 | Criterio de paso                                     |
| ------------ | ------------------------- | --------------------------- | ---------------------------------------------------- |
| Manual       | HTML inline funcional     | Navegador                   | Inline.html funciona idéntico al index.html original |
| Manual       | Servidor Deno             | `deno run`                  | Server responde en localhost:8080                    |
| Manual       | Binario compilado (local) | `deno compile` sin --target | Binario local ejecuta y sirve correctamente          |
| Manual       | Release draft             | `gh release view`           | Release draft existe con todos los binarios          |

### Checklist de validación manual

- [ ] `build/cli/inline.html` abre en navegador → UI funciona, grupos, imágenes, export PDF
- [ ] `deno run --allow-net --allow-read cli/server.ts` → servidor responde en :8080
- [ ] Binario local (`deno compile` sin --target) → ejecuta y sirve correctamente
- [ ] `build.sh` completa sin errores
- [ ] `dist/SHA256SUMS` verifica correctamente con `sha256sum -c`
- [ ] `release.sh` crea draft en GitHub visible en la web

---

## 7. Plan de Despliegue

```
PRE-DEPLOY:
- [ ] Verificar que el working tree está limpio (git status)
- [ ] Verificar gh auth status
- [ ] Verificar deno --version

DEPLOY:
- [ ] Paso 1: build-inline.sh → genera inline.html
- [ ] Paso 2: Validar inline.html en navegador
- [ ] Paso 3: build.sh → compila 5 plataformas
- [ ] Paso 4: release.sh → crea draft release
- [ ] Validar que todos los binarios están en el draft

POST-DEPLOY:
- [ ] Revisar draft release en GitHub
- [ ] Publicar release (quitar draft)
- [ ] Verificar que los downloads funcionan
```

---

## 8. Plan de Rollback

1. **Detección**: Binario no arranca, inline.html roto, o release con archivos corruptos
2. **Decisión**: Si el inline.html no funciona → rollback inmediato. Si un target específico falla → re-compilar solo ese target.
3. **Pasos de rollback**:
   - Si release ya publicado: `gh release delete v1.0 --yes` + `git tag -d v1.0`
   - Corregir el problema
   - Re-ejecutar build + release
4. **Tiempo estimado**: 5 minutos

---

## 9. Riesgos y Mitigaciones

| Riesgo                                         | Probabilidad | Impacto | Mitigación                                                                                                                  |
| ---------------------------------------------- | ------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| jsPDF desde CDN no carga offline               | Media        | Bajo    | Ya es el comportamiento actual. Documentar que requiere internet.                                                           |
| Deno compile --embed no funciona como esperado | Baja         | Alto    | Fallback: usar Deno.readTextFile desde el filesystem del binario (el binario puede leer archivos relativos a su ubicación). |
| Cross-compile genera binarios que no corren    | Baja         | Alto    | Testear el binario local primero. Si falla un target, re-compilar con debug.                                                |
| Puerto 8080 ocupado                            | Media        | Bajo    | Agregar fallback a puerto 8081 si 8080 falla (v1.1). Por ahora, el usuario puede matar el proceso que usa 8080.             |
| Release draft sin archivos                     | Baja         | Medio   | El script valida que dist/ existe antes de crear el release.                                                                |

---

## 10. Criterios de Éxito Globales

El proyecto se considera **exitoso** cuando:

- [ ] `build-inline.sh` genera un HTML inline que funciona idéntico al original
- [ ] `build.sh` produce 5 binarios en `dist/` sin errores
- [ ] Al menos el binario local (sin --target) ejecuta y sirve la app correctamente
- [ ] `release.sh` crea un draft release en GitHub con todos los binarios + SHA256SUMS
- [ ] El README tiene instrucciones de uso para CLI y Termux
- [ ] Los scripts de build están commiteados en el repo

---

## 11. Recursos y Referencias

- **Deno compile docs**: <https://docs.deno.com/runtime/manual/tools/compile/>
- **Deno embed flag**: <https://docs.deno.com/runtime/manual/tools/compile/#embedding-assets>
- **gh release docs**: <https://cli.github.com/manual/gh_release_create>
- **Repo**: <git@github.com>:Wilberucx/CollaPDF.git

---

## 12. Primeros pasos al aprobar

1. Crear `cli/server.ts` con el servidor Deno mínimo
2. Crear `build-inline.sh` y validar que genera un inline.html funcional
3. Ejecutar `deno run --allow-net --allow-read cli/server.ts` para verificar que el servidor funciona

---

El plan ha sido guardado en `IMPLEMENTATION_PLAN.md` en la raíz del proyecto.

Revísalo con calma. Cuando estés listo para comenzar la implementación, responde **procede** (o **proceed**).
Si necesitas algún ajuste antes de comenzar, descríbelo y actualizaré el plan.
