// ═══════════════════════════════════════════
//  APP — Punto de entrada y conexión de módulos
// ═══════════════════════════════════════════
import * as config from './config.js';
import * as state from './state.js';
import * as ui from './ui.js';
import { exportPDF } from './pdf.js';
import { renderPreview } from './ui.js';
import { buildPagesForDocument } from './layout.js';

// ── Exponer API pública globalmente para los onclick del HTML ──
window.app = {
  addDocument,
  removeDocument,
  setPreset,
  docRowHStep,
  docMaxRowStep,
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
  switchTab,
  toggleSettings,
  setLayoutMode,
  presetStep,
  maxRowStep,
  setFontScale,
  getDocuments: state.getDocuments,
  toggleImageSelection,
  deleteSelectedImages,
  clearSelection
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
      reader.readAsDataURL(file);
    })
  );

  const loaded = (await Promise.all(promises)).filter(Boolean);
  state.addImagesToDocument(docId, loaded);
  ui.renderSidebar();
  renderPreview();
  updateStats();
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
}

function removeImage(docId, imgId) {
  state.removeImage(docId, imgId);
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

function renameImage(docId, imgId, name) {
  state.renameImage(docId, imgId, name);
}

function reorderImages(docId, fromIndex, toIndex) {
  state.reorderImages(docId, fromIndex, toIndex);
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

// ── SETTINGS ──
function toggleSettings() {
  const el = document.getElementById('sidebarRight');
  const backdrop = document.getElementById('settingsBackdrop');
  const btn = document.getElementById('settingsBtn');
  const open = el.classList.toggle('open');
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

// ── MOBILE ──
function switchTab(tab) {
  document.querySelectorAll('.mob-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  const left = document.querySelector('.sidebar-left');
  const right = document.querySelector('.sidebar-right');
  const preview = document.querySelector('.preview-area');
  
  left.classList.toggle('active', tab === 'sidebar');
  preview.classList.toggle('mob-hidden', tab !== 'preview');
  right.classList.toggle('active', tab === 'settings');
  
  if (tab === 'preview') renderPreview();
}

// ── SELECTION ──
function toggleImageSelection(docId, imgId) {
  state.toggleImageSelection(docId, imgId);
  ui.renderSidebar();
}

function deleteSelectedImages() {
  state.deleteSelectedImages();
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

function clearSelection() {
  state.clearSelection();
  ui.renderSidebar();
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
    if (presetEl) presetEl.textContent = config.PRESETS[key];
    const maxEl = document.getElementById('max' + key);
    if (maxEl) maxEl.textContent = config.MAX_PER_ROW[key];
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

// ── RESPONSIVE ──
window.addEventListener('resize', () => {
  if (state.getDocuments().some(d => d.images.length > 0)) {
    renderPreview();
  }
});
