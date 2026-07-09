// ═══════════════════════════════════════════
//  APP — Punto de entrada y conexión de módulos
// ═══════════════════════════════════════════
import * as config from './config.js';
import * as state from './state.js';
import * as ui from './ui.js';
import { exportPDF, downloadPendingPdfs, sharePendingPdfs, clearPendingExports } from './pdf.js';
import { renderPreview } from './ui.js';
import { buildPagesForDocument } from './layout.js';
import { esc, showToast, deleteButtonInnerHtml } from './utils.js';

// ── Exponer API pública globalmente para los onclick del HTML ──
window.app = {
  addDocument,
  removeDocument,
  setPreset,
  docRowHStep,
  docMaxRowStep,
  docSizeChange,
  docMaxRowChange,
  docReset,
  renameDocument,
  removeImage,
  renameImage,
  reorderImages,
  openFilePicker,
  onDragOver,
  onDragLeave,
  onDrop,
  exportPDF,
  toggleSettings,
  setLayoutMode,
  presetStep,
  maxRowStep,
  setPresetDirect,
  setMaxRowDirect,
  setFontScale,
  setShowCaptions,
  showToast,
  getDocuments: state.getDocuments,
  toggleImageSelection,
  deleteSelectedImages,
  clearSelection,
  toggleDocPanel,
  closeDocPanel,
  refreshDocPanel,
  refreshOpenDocPanel,
  toggleDocEditPanel,
  closeDocEditPanel,
  refreshDocEditPanel,
  toggleSidebar,
  showShareDialog,
  closeShareDialog,
  showShareSaving,
  showShareSuccess,
  showShareError,
  shareDialogSave,
  shareDialogShare
};

// ── FILE PICKER ──
function openFilePicker(docId) {
  state.setActiveDocumentId(docId);
  const el = document.getElementById('fileInput');
  el.value = '';
  el.click();
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  const docId = state.getActiveDocumentId();
  if (!files.length || !docId) return;
  await loadImages(files, docId);
});

async function loadImages(files, docId) {
  const promises = files.filter(f => f.type.startsWith('image/')).map(file =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => resolve({
          id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          dataUrl,
          w: img.naturalWidth,
          h: img.naturalHeight,
          name: file.name
        });
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.onabort = () => resolve(null);
      reader.readAsDataURL(file);
    })
  );

  const loaded = (await Promise.all(promises)).filter(Boolean);
  state.addImagesToDocument(docId, loaded);
  ui.renderSidebar();
  renderPreview();
  updateStats();
  refreshOpenDocPanel(docId);
}

// ── DRAG & DROP ──
function onDragOver(e, docId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function onDrop(e, docId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) {
    state.setActiveDocumentId(docId);
    await loadImages(files, docId);
  }
}

// ── DOCUMENT MANAGEMENT ──
function addDocument() {
  state.addDocument();
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

function removeDocument(id) {
  state.removeDocument(id);
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

function setPreset(docId, preset) {
  state.setPreset(docId, preset);
  ui.renderSidebar();
  renderPreview();
}

// ── PER-DOCUMENT STEPPERS ──
function docRowHStep(docId, delta) {
  const docs = state.getDocuments();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;
  const current = doc.customRowH ?? config.PRESETS[doc.preset];
  const next = Math.max(30, Math.min(300, current + delta));
  state.setDocumentRowH(docId, next);
  document.getElementById('docRowH_' + docId).textContent = next;
  renderPreview();
}

function docMaxRowStep(docId, delta) {
  const docs = state.getDocuments();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;
  const current = doc.customMaxRow ?? config.MAX_PER_ROW[doc.preset];
  const next = Math.max(1, Math.min(20, current + delta));
  state.setDocumentMaxRow(docId, next);
  document.getElementById('docMaxRow_' + docId).textContent = next;
  renderPreview();
}

function docSizeChange(docId, val) {
  const v = parseInt(val, 10);
  if (!isNaN(v) && v >= 30 && v <= 300) {
    state.setDocumentRowH(docId, v);
    renderPreview();
  }
}

function docMaxRowChange(docId, val) {
  if (val === 'custom') {
    const input = prompt('Ingresá un valor personalizado (1-20):');
    if (input === null) {
      // User cancelled — re-render to reset select to previous value
      renderPreview();
      return;
    }
    const v = parseInt(input, 10);
    if (isNaN(v) || v < 1 || v > 20) {
      alert('Valor inválido. Debe ser entre 1 y 20.');
      renderPreview();
      return;
    }
    state.setDocumentMaxRow(docId, v);
    renderPreview();
    return;
  }
  const v = parseInt(val, 10);
  if (!isNaN(v) && v >= 1 && v <= 20) {
    state.setDocumentMaxRow(docId, v);
    renderPreview();
  }
}

function docReset(docId, field) {
  if (field === 'rowH') {
    state.setDocumentRowH(docId, null);
  } else if (field === 'maxRow') {
    state.setDocumentMaxRow(docId, null);
  }
  ui.renderSidebar();
  renderPreview();
}

function renameDocument(id, name) {
  state.renameDocument(id, name);
  updateStats();
  ui.renderSidebar();
  // Update doc panel title if open for this doc
  const panel = document.getElementById('docPanel');
  if (panel && panel.classList.contains('open') && panel.dataset.docId === id) {
    const title = document.getElementById('docPanelTitle');
    const docs = state.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (doc) title.textContent = doc.name + ' (' + doc.images.length + ')'; 
  }
}

function removeImage(docId, imgId) {
  state.removeImage(docId, imgId);
  ui.renderSidebar();
  renderPreview();
  updateStats();
  refreshOpenDocPanel(docId);
}

function renameImage(docId, imgId, name) {
  state.renameImage(docId, imgId, name);
}

function reorderImages(docId, fromIndex, toIndex) {
  state.reorderImages(docId, fromIndex, toIndex);
  ui.renderSidebar();
  renderPreview();
  updateStats();
  refreshOpenDocPanel(docId);
}

// ── SETTINGS ──
function toggleSettings() {
  const el = document.getElementById('sidebarRight');
  const backdrop = document.getElementById('settingsBackdrop');
  const btn = document.getElementById('settingsBtn');
  const open = el.classList.toggle('open');
  el.classList.toggle('active', open);
  if (backdrop) backdrop.classList.toggle('open', open);
  btn.classList.toggle('active', open);
}

function presetStep(key, delta) {
  const el = document.getElementById('preset' + key);
  if (!el) return;
  const current = parseInt(el.textContent, 10);
  if (isNaN(current)) return;
  const next = Math.max(30, Math.min(300, current + delta));
  config.updatePreset(key, next);
  el.textContent = next;
  renderPreview();
}

function maxRowStep(key, delta) {
  const el = document.getElementById('max' + key);
  if (!el) return;
  const current = parseInt(el.textContent, 10);
  if (isNaN(current)) return;
  const next = Math.max(1, Math.min(20, current + delta));
  config.updateMaxRow(key, next);
  el.textContent = next;
  renderPreview();
}

function setPresetDirect(key, val) {
  const v = parseInt(val, 10);
  if (isNaN(v) || v < 30 || v > 300) return;
  config.updatePreset(key, v);
  renderPreview();
}

function setMaxRowDirect(key, val) {
  const v = parseInt(val, 10);
  if (isNaN(v) || v < 1 || v > 20) return;
  config.updateMaxRow(key, v);
  renderPreview();
}

function setLayoutMode(mode) {
  config.setLayoutMode(mode);
  renderPreview();
  updateLayoutToggleUI();
}

function updateLayoutToggleUI() {
  const autoBtn = document.getElementById('layoutAuto');
  const gridBtn = document.getElementById('layoutGrid');
  if (autoBtn && gridBtn) {
    autoBtn.classList.toggle('active', config.LAYOUT_MODE === 'justified');
    gridBtn.classList.toggle('active', config.LAYOUT_MODE === 'grid');
  }
}

// ── FONT SCALE ──
function setFontScale(scale) {
  config.setFontScale(scale);
  applyFontScale();
  updateFontScaleUI();
}

function applyFontScale() {
  const scale = config.getFontScaleValue();
  const baseSize = Math.round(14 * scale * 10) / 10;
  document.documentElement.style.fontSize = baseSize + 'px';
}

function updateFontScaleUI() {
  for (const s of ['S', 'M', 'L']) {
    const btn = document.getElementById('font' + s);
    if (btn) {
      btn.classList.toggle('active', config.FONT_SCALE === s);
    }
  }
}

// ── NAMES TOGGLE (captions) ──
function setShowCaptions(val) {
  config.setShowCaptions(val);
  renderPreview();
  updateCaptionsToggleUI();
}

function updateCaptionsToggleUI() {
  const onBtn = document.getElementById('captionsOn');
  const offBtn = document.getElementById('captionsOff');
  if (onBtn && offBtn) {
    onBtn.classList.toggle('active', config.SHOW_CAPTIONS === true);
    offBtn.classList.toggle('active', config.SHOW_CAPTIONS === false);
  }
}

// ── SIDEBAR TOGGLE (desktop) ──
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar-left');
  const btn = document.getElementById('sidebarToggle');
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  btn.title = isCollapsed ? 'Mostrar panel de documentos' : 'Ocultar panel de documentos';
  // Adjust the SVG to indicate state
  btn.classList.toggle('active', isCollapsed);
}

// ── DOC PANEL (mobile) ──
function toggleDocPanel(docId) {
  const panel = document.getElementById('docPanel');
  const backdrop = document.getElementById('docPanelBackdrop');
  const body = document.getElementById('docPanelBody');
  const title = document.getElementById('docPanelTitle');

  // If already open for this doc, close it
  if (panel.classList.contains('open') && panel.dataset.docId === docId) {
    closeDocPanel();
    return;
  }

  const docs = state.getDocuments();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;

  title.textContent = doc.name + ' (' + doc.images.length + ')';
  panel.dataset.docId = docId;

  // Render doc panel content (mobile list view)
  body.innerHTML = renderDocPanelContent(doc);

  panel.classList.add('open');
  backdrop.classList.add('open');
}

function closeDocPanel() {
  const panel = document.getElementById('docPanel');
  const backdrop = document.getElementById('docPanelBackdrop');
  panel.classList.remove('open');
  backdrop.classList.remove('open');
}

function renderDocPanelContent(doc) {
  const hasImages = doc.images.length > 0;
  const sel = state.getSelectedImages();

  let html = '';

  // Thumbs list (mobile list view)
  if (hasImages) {
    html += '<div class="doc-panel-images" id="docPanelImages_' + doc.id + '">';
    doc.images.forEach((img, i) => {
      const isSelected = sel.some(s => s.docId === doc.id && s.imgId === img.id);
      html += `
        <div class="thumb-row${isSelected ? ' selected' : ''}" draggable="true" data-doc-id="${doc.id}" data-img-index="${i}">
          <div class="thumb-row-img-wrap" onclick="app.toggleImageSelection('${doc.id}', '${img.id}')">
            <img class="thumb-row-img" src="${img.dataUrl}" loading="lazy">
            <button class="thumb-select" onclick="event.stopPropagation();app.toggleImageSelection('${doc.id}', '${img.id}')" title="Seleccionar">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <input class="thumb-row-name" value="${esc(img.name)}"
            onchange="app.renameImage('${doc.id}', '${img.id}', this.value); app.refreshDocPanel('${doc.id}')"
            onclick="event.stopPropagation()"
            title="Renombrar imagen">
          <span class="thumb-row-grip">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
          </span>
        </div>
      `;
    });
    html += '</div>';

    // Check if any images are selected in this document
    const selForDoc = sel.filter(s => s.docId === doc.id);
    if (selForDoc.length > 0) {
      // Show delete row instead
      html += `
        <div class="thumb-row add-row"
          onclick="app.deleteSelectedImages()"
          title="Eliminar seleccionadas">
          <div class="add-row-icon" style="border-color:var(--danger);color:var(--danger)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </div>
          <span class="add-row-label" style="color:var(--danger)">ELIMINAR ${selForDoc.length} SELECCIONADA${selForDoc.length !== 1 ? 'S' : ''}</span>
        </div>
      `;
    } else {
      html += `
        <div class="thumb-row add-row"
          onclick="app.openFilePicker('${doc.id}')"
          title="Agregar imágenes">
          <div class="add-row-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span class="add-row-label">AGREGAR IMÁGENES</span>
        </div>
      `;
    }
  } else {
    // Empty state - show drop zone
    html += `
      <div class="doc-panel-empty">
        <div class="drop-zone"
          onclick="app.openFilePicker('${doc.id}')"
          ondragover="app.onDragOver(event, '${doc.id}')"
          ondragleave="app.onDragLeave(event)"
          ondrop="app.onDrop(event, '${doc.id}')">
          + AGREGAR IMÁGENES
        </div>
      </div>
    `;
  }

  return html;
}

function refreshDocPanel(docId) {
  // Re-render just the body when actions modify the doc
  const body = document.getElementById('docPanelBody');
  const docs = state.getDocuments();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;
  body.innerHTML = renderDocPanelContent(doc);
}

function refreshOpenDocPanel(docId) {
  const panel = document.getElementById('docPanel');
  if (panel && panel.classList.contains('open')) {
    refreshDocPanel(panel.dataset.docId || docId);
  }
}

// ── DOC EDIT PANEL (mobile) ──
function toggleDocEditPanel(docId) {
  const panel = document.getElementById('docEditPanel');
  const backdrop = document.getElementById('docEditPanelBackdrop');

  // If already open for this doc, close it
  if (panel.classList.contains('open') && panel.dataset.docId === docId) {
    closeDocEditPanel();
    return;
  }

  const docs = state.getDocuments();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;

  panel.dataset.docId = docId;
  panel.querySelector('.doc-edit-panel-title').textContent = doc.name;

  // Render edit panel content
  const body = document.getElementById('docEditPanelBody');
  body.innerHTML = renderDocEditPanelContent(doc);

  panel.classList.add('open');
  backdrop.classList.add('open');
}

function closeDocEditPanel() {
  const panel = document.getElementById('docEditPanel');
  const backdrop = document.getElementById('docEditPanelBackdrop');
  panel.classList.remove('open');
  backdrop.classList.remove('open');
}

function renderDocEditPanelContent(doc) {
  const currentSize = doc.customRowH ?? config.PRESETS[doc.preset];
  const currentMaxRow = doc.customMaxRow ?? config.MAX_PER_ROW[doc.preset];
  const sizeOptions = [30, 50, 70, 100, 130, 160, 200, 250, 300];
  if (!sizeOptions.includes(currentSize)) sizeOptions.unshift(currentSize);
  sizeOptions.sort((a, b) => a - b);

  // Check if any custom overrides exist
  const hasOverrides = doc.customRowH !== null || doc.customMaxRow !== null;

  return `
    <!-- Preset toggle -->
    <div class="settings-section">
      <div class="settings-section-title">Layout</div>
      <div class="preset-toggle">
        <button class="preset-toggle-btn ${doc.preset === 'S' ? 'active' : ''}" onclick="app.setPreset('${doc.id}', 'S');app.refreshDocEditPanel('${doc.id}')">Compacto</button>
        <button class="preset-toggle-btn ${doc.preset === 'M' ? 'active' : ''}" onclick="app.setPreset('${doc.id}', 'M');app.refreshDocEditPanel('${doc.id}')">Normal</button>
        <button class="preset-toggle-btn ${doc.preset === 'L' ? 'active' : ''}" onclick="app.setPreset('${doc.id}', 'L');app.refreshDocEditPanel('${doc.id}')">Amplio</button>
      </div>
    </div>

    <!-- Size control -->
    <div class="settings-section">
      <div class="settings-section-title">Tamaño de imagen</div>
      <div class="preset-row">
        <label>Altura de fila</label>
        <span style="display:flex;align-items:center;gap:6px">
          <select class="preset-input" onchange="app.docSizeChange('${doc.id}', this.value);app.refreshDocEditPanel('${doc.id}')">
            ${sizeOptions.map(v =>
              `<option value="${v}"${v === currentSize ? ' selected' : ''}>${v} pt</option>`
            ).join('')}
          </select>
        </span>
      </div>
    </div>

    <!-- Max per row -->
    <div class="settings-section">
      <div class="settings-section-title">Imágenes por fila</div>
      <div class="preset-row">
        <label>Máximo</label>
        <span style="display:flex;align-items:center;gap:6px">
          <select class="preset-input" onchange="app.docMaxRowChange('${doc.id}', this.value);app.refreshDocEditPanel('${doc.id}')">
            ${[1,2,3,4,5,6,7,8,9].map(v =>
              `<option value="${v}"${v === currentMaxRow ? ' selected' : ''}>${v} imgs</option>`
            ).join('')}
            ${currentMaxRow > 9 ? `<option value="${currentMaxRow}" selected>${currentMaxRow} imgs</option>` : ''}
            <option value="custom">Personalizado...</option>
          </select>
        </span>
      </div>
    </div>

    <!-- Layout mode -->
    <div class="settings-section">
      <div class="settings-section-title">Modo de layout</div>
      <div class="layout-toggle">
        <button class="layout-toggle-btn ${config.LAYOUT_MODE === 'justified' ? 'active' : ''}" onclick="app.setLayoutMode('justified')">Auto</button>
        <button class="layout-toggle-btn ${config.LAYOUT_MODE === 'grid' ? 'active' : ''}" onclick="app.setLayoutMode('grid')">Cuadrícula</button>
      </div>
    </div>

    ${hasOverrides ? `
    <!-- Reset overrides -->
    <div class="settings-section doc-edit-reset-section">
      <button class="doc-edit-reset-btn" onclick="app.docReset('${doc.id}', 'rowH');app.docReset('${doc.id}', 'maxRow');app.refreshDocEditPanel('${doc.id}')">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        Restablecer valores del documento
      </button>
    </div>
    ` : ''}

    <!-- Delete/Clear button (contextual) -->
    <div class="settings-section" style="padding-top:16px">
      <button class="doc-edit-delete-btn ${state.getDocuments().length > 1 ? '' : 'doc-edit-clear-btn'}" onclick="app.removeDocument('${doc.id}');app.closeDocEditPanel()">
        ${deleteButtonInnerHtml(state.getDocuments().length > 1)}
      </button>
    </div>
  `;
}

function refreshDocEditPanel(docId) {
  const body = document.getElementById('docEditPanelBody');
  const docs = state.getDocuments();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return;
  body.innerHTML = renderDocEditPanelContent(doc);
  const panel = document.getElementById('docEditPanel');
  if (panel) {
    panel.querySelector('.doc-edit-panel-title').textContent = doc.name;
  }
}

// ── SELECTION ──
function toggleImageSelection(docId, imgId) {
  state.toggleImageSelection(docId, imgId);
  // Refresh doc panel if open
  const panel = document.getElementById('docPanel');
  if (panel && panel.classList.contains('open') && panel.dataset.docId === docId) {
    refreshDocPanel(docId);
  }
  ui.renderSidebar();
}

function deleteSelectedImages() {
  state.deleteSelectedImages();
  const panel = document.getElementById('docPanel');
  if (panel && panel.classList.contains('open')) {
    refreshDocPanel(panel.dataset.docId);
  }
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

function clearSelection() {
  state.clearSelection();
  const panel = document.getElementById('docPanel');
  if (panel && panel.classList.contains('open')) {
    refreshDocPanel(panel.dataset.docId);
  }
  ui.renderSidebar();
}

// ── SHARE DIALOG (mobile) ──
function showShareDialog() {
  const dialog = document.getElementById('shareDialog');
  const backdrop = document.getElementById('shareDialogBackdrop');
  const actions = document.getElementById('shareDialogActions');
  const saving = document.getElementById('shareDialogSaving');
  const result = document.getElementById('shareDialogResult');
  if (dialog && backdrop) {
    // Reset: show actions, hide others
    if (actions) actions.style.display = '';
    if (saving) saving.style.display = 'none';
    if (result) result.style.display = 'none';
    dialog.classList.add('open');
    backdrop.classList.add('open');
  }
}

function closeShareDialog() {
  const dialog = document.getElementById('shareDialog');
  const backdrop = document.getElementById('shareDialogBackdrop');
  if (dialog && backdrop) {
    dialog.classList.remove('open');
    backdrop.classList.remove('open');
  }
}

function showShareSaving() {
  const actions = document.getElementById('shareDialogActions');
  const saving = document.getElementById('shareDialogSaving');
  const result = document.getElementById('shareDialogResult');
  if (actions) actions.style.display = 'none';
  if (result) result.style.display = 'none';
  if (saving) saving.style.display = '';
}

function showShareSuccess(pathMessage) {
  const actions = document.getElementById('shareDialogActions');
  const saving = document.getElementById('shareDialogSaving');
  const result = document.getElementById('shareDialogResult');
  const titleEl = document.getElementById('shareDialogResultTitle');
  const iconWrap = document.getElementById('shareDialogResultIcon');
  const svgEl = document.getElementById('shareDialogResultSvg');
  const pathEl = document.getElementById('shareDialogResultPath');

  if (actions) actions.style.display = 'none';
  if (saving) saving.style.display = 'none';
  if (result) result.style.display = '';

  if (titleEl) {
    titleEl.textContent = 'GUARDADO EXITOSO';
    titleEl.classList.remove('share-dialog-error');
  }
  if (iconWrap) {
    iconWrap.classList.remove('share-dialog-error');
  }
  if (svgEl) {
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
  }
  if (pathEl) {
    pathEl.textContent = pathMessage || '';
    pathEl.classList.remove('share-dialog-error');
  }
}

function showShareError(errorMessage) {
  const actions = document.getElementById('shareDialogActions');
  const saving = document.getElementById('shareDialogSaving');
  const result = document.getElementById('shareDialogResult');
  const titleEl = document.getElementById('shareDialogResultTitle');
  const iconWrap = document.getElementById('shareDialogResultIcon');
  const svgEl = document.getElementById('shareDialogResultSvg');
  const pathEl = document.getElementById('shareDialogResultPath');

  if (actions) actions.style.display = 'none';
  if (saving) saving.style.display = 'none';
  if (result) result.style.display = '';

  if (titleEl) {
    titleEl.textContent = 'ERROR AL GUARDAR';
    titleEl.classList.add('share-dialog-error');
  }
  if (iconWrap) {
    iconWrap.classList.add('share-dialog-error');
  }
  if (svgEl) {
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  }
  if (pathEl) {
    pathEl.textContent = errorMessage || 'Ocurrió un error inesperado.';
    pathEl.classList.add('share-dialog-error');
  }
}

function shareDialogSave() {
  // Capture filenames before clearing
  const exports = window.__pendingExports || [];
  const filenames = exports.map(function(e) { return e.filename; });

  // Show saving state inside dialog
  showShareSaving();

  // Download in background
  setTimeout(() => {
    downloadPendingPdfs();
    clearPendingExports();

    // Show success (optimistic — browser download has no completion callback)
    var msg;
    if (filenames.length === 1) {
      msg = 'Documents/CollaPDF/' + filenames[0];
    } else if (filenames.length > 1) {
      msg = 'Documents/CollaPDF/: ' + filenames.join(', ');
    } else {
      msg = 'PDF descargado en el navegador';
    }
    showShareSuccess(msg);
  }, 400);
}

function shareDialogShare() {
  closeShareDialog();
  setTimeout(() => {
    sharePendingPdfs();
    clearPendingExports();
  }, 200);
}

// ── STATS ──
function updateStats() {
  const docs = state.getDocuments();
  document.getElementById('statDocuments').textContent = docs.length;
  const total = docs.reduce((s, d) => s + d.images.length, 0);
  document.getElementById('statImages').textContent = total;

  let totalPages = 0;
  let hasImages = false;
  for (const doc of docs) {
    if (doc.images.length > 0) {
      hasImages = true;
      totalPages += buildPagesForDocument(doc).length;
    }
  }
  document.getElementById('statPages').textContent = hasImages ? totalPages : '—';
}

// ── DRAG & DROP FOR DOCUMENT REORDERING ──
let draggedDocumentId = null;

// ── DRAG & DROP FOR IMAGE REORDERING ──
let draggedThumb = null;

function setupDragAndDrop() {
  const list = document.getElementById('documentsList');
  if (!list) return;

  // ── Document drag & drop ──
  function getThumb(el) {
    return el.closest('.thumb-wrap') || el.closest('.thumb-row');
  }

  list.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('.document-drag-handle');
    if (!handle) {
      // Check if it's a thumb drag
      const thumb = getThumb(e.target);
      if (thumb) return; // Let thumb handler deal with it
      e.preventDefault();
      return;
    }
    const card = e.target.closest('.document-card');
    if (!card) {
      e.preventDefault();
      return;
    }

    draggedDocumentId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedDocumentId);
  });

  list.addEventListener('dragover', (e) => {
    // Check if we're dragging a thumb
    if (draggedThumb) {
      e.preventDefault();
      const thumb = getThumb(e.target);
      if (!thumb || thumb === draggedThumb) return;

      // Only allow drop within same document
      const draggedDocId = draggedThumb.dataset.docId;
      const targetDocId = thumb.dataset.docId;
      if (draggedDocId !== targetDocId) return;

      // Clear other indicators
      list.querySelectorAll('.thumb-wrap, .thumb-row').forEach(t => {
        if (t !== thumb) t.classList.remove('drag-over');
      });

      thumb.classList.add('drag-over');
      return;
    }

    // Document drag & drop
    e.preventDefault();
    const card = e.target.closest('.document-card');
    if (!card || card.dataset.id === draggedDocumentId) return;

    const rect = card.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    list.querySelectorAll('.document-card').forEach(c => {
      if (c !== card) {
        c.classList.remove('drag-over-before', 'drag-over-after');
      }
    });

    if (relativeY < rect.height / 2) {
      card.classList.add('drag-over-before');
      card.classList.remove('drag-over-after');
    } else {
      card.classList.add('drag-over-after');
      card.classList.remove('drag-over-before');
    }
  });

  list.addEventListener('dragleave', (e) => {
    const card = e.target.closest('.document-card');
    if (card) {
      card.classList.remove('drag-over-before', 'drag-over-after');
    }
    const thumb = getThumb(e.target);
    if (thumb) {
      thumb.classList.remove('drag-over');
    }
  });

  list.addEventListener('dragend', (e) => {
    list.querySelectorAll('.document-card').forEach(c => {
      c.classList.remove('dragging', 'drag-over-before', 'drag-over-after');
    });
    list.querySelectorAll('.thumb-wrap, .thumb-row').forEach(t => {
      t.classList.remove('dragging', 'drag-over');
    });
    draggedDocumentId = null;
    draggedThumb = null;
  });

  list.addEventListener('drop', (e) => {
    // Check if dropping a thumb
    if (draggedThumb) {
      e.preventDefault();
      e.stopPropagation();
      const thumb = getThumb(e.target);
      if (!thumb || thumb === draggedThumb) return;

      const draggedDocId = draggedThumb.dataset.docId;
      const targetDocId = thumb.dataset.docId;
      if (draggedDocId !== targetDocId) return;

      const fromIndex = parseInt(draggedThumb.dataset.imgIndex, 10);
      const toIndex = parseInt(thumb.dataset.imgIndex, 10);

      state.reorderImages(draggedDocId, fromIndex, toIndex);

      list.querySelectorAll('.thumb-wrap, .thumb-row').forEach(t => {
        t.classList.remove('dragging', 'drag-over');
      });

      ui.renderSidebar();
      renderPreview();
      updateStats();
      draggedThumb = null;
      return;
    }

    // Document drop
    e.preventDefault();
    const card = e.target.closest('.document-card');
    if (!card || card.dataset.id === draggedDocumentId) return;

    const position = card.classList.contains('drag-over-before') ? 'before' : 'after';
    const targetDocId = card.dataset.id;

    state.reorderDocuments(draggedDocumentId, targetDocId, position);

    list.querySelectorAll('.document-card').forEach(c => {
      c.classList.remove('dragging', 'drag-over-before', 'drag-over-after');
    });

    ui.renderSidebar();
    renderPreview();
    updateStats();
  });

  // ── Thumb dragstart (delegated) ──
  list.addEventListener('dragstart', (e) => {
    const thumb = getThumb(e.target);
    if (!thumb) return;

    draggedThumb = thumb;
    thumb.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'thumb');
  });

  // ── Doc panel drag & drop ──
  const docPanelBody = document.getElementById('docPanelBody');
  if (docPanelBody) {
    docPanelBody.addEventListener('dragstart', (e) => {
      const row = e.target.closest('.thumb-row');
      if (!row || row.classList.contains('add-row')) return;
      draggedThumb = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'thumb');
    });

    docPanelBody.addEventListener('dragover', (e) => {
      if (!draggedThumb) return;
      e.preventDefault();
      const row = e.target.closest('.thumb-row');
      if (!row || row === draggedThumb || row.classList.contains('add-row')) return;
      if (draggedThumb.dataset.docId !== row.dataset.docId) return;

      docPanelBody.querySelectorAll('.thumb-row').forEach(r => {
        if (r !== row) r.classList.remove('drag-over');
      });
      row.classList.add('drag-over');
    });

    docPanelBody.addEventListener('dragleave', (e) => {
      const row = e.target.closest('.thumb-row');
      if (row) row.classList.remove('drag-over');
    });

    docPanelBody.addEventListener('drop', (e) => {
      if (!draggedThumb) return;
      e.preventDefault();
      e.stopPropagation();
      const row = e.target.closest('.thumb-row');
      if (!row || row === draggedThumb || row.classList.contains('add-row')) return;

      const fromIndex = parseInt(draggedThumb.dataset.imgIndex, 10);
      const toIndex = parseInt(row.dataset.imgIndex, 10);
      const docId = draggedThumb.dataset.docId;

      state.reorderImages(docId, fromIndex, toIndex);

      docPanelBody.querySelectorAll('.thumb-row').forEach(r => {
        r.classList.remove('dragging', 'drag-over');
      });

      ui.renderSidebar();
      renderPreview();
      updateStats();
      refreshOpenDocPanel(docId);
      draggedThumb = null;
    });

    docPanelBody.addEventListener('dragend', (e) => {
      docPanelBody.querySelectorAll('.thumb-row').forEach(r => {
        r.classList.remove('dragging', 'drag-over');
      });
      if (draggedThumb && draggedThumb.parentNode === docPanelBody) {
        draggedThumb = null;
      }
    });

    // ── Touch drag & drop for doc panel thumb rows ──
    let panelTouchDraggedRow = null;

    docPanelBody.addEventListener('touchstart', (e) => {
      const grip = e.target.closest('.thumb-row-grip');
      if (!grip) return;
      const row = grip.closest('.thumb-row');
      if (!row || row.classList.contains('add-row')) return;

      panelTouchDraggedRow = row;
      row.classList.add('dragging');
    }, { passive: true });

    docPanelBody.addEventListener('touchmove', (e) => {
      if (!panelTouchDraggedRow) return;
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!target) return;
      const targetRow = target.closest('.thumb-row');
      if (!targetRow || targetRow === panelTouchDraggedRow || targetRow.classList.contains('add-row')) return;
      if (panelTouchDraggedRow.dataset.docId !== targetRow.dataset.docId) return;

      docPanelBody.querySelectorAll('.thumb-row').forEach(r => {
        if (r !== targetRow) r.classList.remove('drag-over');
      });
      targetRow.classList.add('drag-over');
    }, { passive: false });

    docPanelBody.addEventListener('touchend', (e) => {
      if (!panelTouchDraggedRow) return;
      const targetRow = docPanelBody.querySelector('.thumb-row.drag-over');
      if (targetRow) {
        const fromIndex = parseInt(panelTouchDraggedRow.dataset.imgIndex, 10);
        const toIndex = parseInt(targetRow.dataset.imgIndex, 10);
        const docId = panelTouchDraggedRow.dataset.docId;

        state.reorderImages(docId, fromIndex, toIndex);
        ui.renderSidebar();
        renderPreview();
        updateStats();
        refreshOpenDocPanel(docId);
      }
      docPanelBody.querySelectorAll('.thumb-row').forEach(r => {
        r.classList.remove('dragging', 'drag-over');
      });
      panelTouchDraggedRow = null;
    }, { passive: true });
  }

  // ── Touch drag & drop for mobile list rows ──
  let touchDraggedRow = null;

  list.addEventListener('touchstart', (e) => {
    const grip = e.target.closest('.thumb-row-grip');
    if (!grip) return;
    const row = grip.closest('.thumb-row');
    if (!row || row.classList.contains('add-row')) return;

    touchDraggedRow = row;
    row.classList.add('dragging');
  }, { passive: true });

  list.addEventListener('touchmove', (e) => {
    if (!touchDraggedRow) return;
    e.preventDefault();

    const touch = e.touches[0];
    // Find what's under the finger
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;
    const targetRow = target.closest('.thumb-row');
    if (!targetRow || targetRow === touchDraggedRow || targetRow.classList.contains('add-row')) return;

    // Same document check
    if (touchDraggedRow.dataset.docId !== targetRow.dataset.docId) return;

    // Clear previous indicators
    list.querySelectorAll('.thumb-row').forEach(r => {
      if (r !== touchDraggedRow) r.classList.remove('drag-over');
    });

    targetRow.classList.add('drag-over');
  }, { passive: false });

  list.addEventListener('touchend', (e) => {
    if (!touchDraggedRow) return;

    const targetRow = list.querySelector('.thumb-row.drag-over');
    if (targetRow) {
      const fromIndex = parseInt(touchDraggedRow.dataset.imgIndex, 10);
      const toIndex = parseInt(targetRow.dataset.imgIndex, 10);

      state.reorderImages(touchDraggedRow.dataset.docId, fromIndex, toIndex);

      ui.renderSidebar();
      renderPreview();
      updateStats();
    }

    list.querySelectorAll('.thumb-row').forEach(r => {
      r.classList.remove('dragging', 'drag-over');
    });
    touchDraggedRow = null;
  }, { passive: true });
}

// ── Sync DOM values from persisted config ──
function syncConfigUI() {
  for (const key of ['S', 'M', 'L']) {
    const presetEl = document.getElementById('preset' + key);
    if (presetEl && presetEl.tagName === 'SELECT') {
      const val = String(config.PRESETS[key]);
      // If the value doesn't match any option, default to the first option
      if ([...presetEl.options].some(o => o.value === val)) {
        presetEl.value = val;
      } else {
        presetEl.selectedIndex = 0;
      }
    }
    const maxEl = document.getElementById('max' + key);
    if (maxEl && maxEl.tagName === 'SELECT') {
      const val = String(config.MAX_PER_ROW[key]);
      if ([...maxEl.options].some(o => o.value === val)) {
        maxEl.value = val;
      } else {
        maxEl.selectedIndex = 0;
      }
    }
  }
}

// ── INIT ──
// Ensure at least one document exists at startup
if (state.getDocuments().length === 0) {
  state.addDocument();
}
syncConfigUI();
setupDragAndDrop();
applyFontScale();
updateFontScaleUI();
ui.renderSidebar();
renderPreview();
updateStats();
updateLayoutToggleUI();
updateCaptionsToggleUI();

// ── RESPONSIVE ──
window.addEventListener('resize', () => {
  // Don't re-render if user is editing an input (keyboard open on mobile)
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (state.getDocuments().length > 0) {
    renderPreview();
  }
});
