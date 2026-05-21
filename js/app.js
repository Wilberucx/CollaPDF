// ═══════════════════════════════════════════
//  APP — Punto de entrada y conexión de módulos
// ═══════════════════════════════════════════
import * as config from './config.js';
import * as state from './state.js';
import * as ui from './ui.js';
import { exportPDF } from './pdf.js';
import { renderPreview } from './ui.js';
import { buildPagesForGroup } from './layout.js';

// ── Exponer API pública globalmente para los onclick del HTML ──
window.app = {
  addGroup,
  removeGroup,
  setPreset,
  renameGroup,
  removeImage,
  reorderImages,
  openFilePicker,
  onDragOver,
  onDragLeave,
  onDrop,
  exportPDF,
  switchTab,
  toggleSettings,
  updatePreset,
  updateMaxRow,
  setLayoutMode,
  getGroups: state.getGroups
};

// ── FILE PICKER ──
function openFilePicker(groupId) {
  state.setActiveGroupId(groupId);
  const el = document.getElementById('fileInput');
  el.value = '';
  el.click();
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  const groupId = state.getActiveGroupId();
  if (!files.length || !groupId) return;
  await loadImages(files, groupId);
});

async function loadImages(files, groupId) {
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
  state.addImagesToGroup(groupId, loaded);
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

// ── DRAG & DROP ──
function onDragOver(e, groupId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function onDrop(e, groupId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) {
    state.setActiveGroupId(groupId);
    await loadImages(files, groupId);
  }
}

// ── GROUP MANAGEMENT ──
function addGroup() {
  state.addGroup();
  ui.renderSidebar();
  updateStats();
}

function removeGroup(id) {
  state.removeGroup(id);
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

function setPreset(groupId, preset) {
  state.setPreset(groupId, preset);
  ui.renderSidebar();
  renderPreview();
}

function renameGroup(id, name) {
  state.renameGroup(id, name);
  updateStats();
}

function removeImage(groupId, imgId) {
  state.removeImage(groupId, imgId);
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

function reorderImages(groupId, fromIndex, toIndex) {
  state.reorderImages(groupId, fromIndex, toIndex);
  ui.renderSidebar();
  renderPreview();
  updateStats();
}

// ── SETTINGS ──
function toggleSettings() {
  const el = document.getElementById('sidebarRight');
  const btn = document.getElementById('settingsBtn');
  const open = el.classList.toggle('open');
  btn.classList.toggle('active', open);
}

function updatePreset(key, val) {
  config.updatePreset(key, val);
  renderPreview();
}

function updateMaxRow(key, val) {
  config.updateMaxRow(key, val);
  renderPreview();
}

function setLayoutMode(mode) {
  config.setLayoutMode(mode);
  renderPreview();
  updateLayoutToggleUI();
}

function updateLayoutToggleUI() {
  const justifiedBtn = document.getElementById('layoutJustified');
  const gridBtn = document.getElementById('layoutGrid');
  if (justifiedBtn && gridBtn) {
    justifiedBtn.classList.toggle('active', config.LAYOUT_MODE === 'justified');
    gridBtn.classList.toggle('active', config.LAYOUT_MODE === 'grid');
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

// ── STATS ──
function updateStats() {
  const groups = state.getGroups();
  document.getElementById('statGroups').textContent = groups.length;
  const total = groups.reduce((s, g) => s + g.images.length, 0);
  document.getElementById('statImages').textContent = total;

  let totalPages = 0;
  let hasImages = false;
  for (const group of groups) {
    if (group.images.length > 0) {
      hasImages = true;
      totalPages += buildPagesForGroup(group).length;
    }
  }
  document.getElementById('statPages').textContent = hasImages ? totalPages : '—';
}

// ── DRAG & DROP FOR GROUP REORDERING ──
let draggedGroupId = null;

// ── DRAG & DROP FOR IMAGE REORDERING ──
let draggedThumb = null;

function setupDragAndDrop() {
  const list = document.getElementById('groupsList');
  if (!list) return;

  // ── Group drag & drop ──
  list.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('.group-drag-handle');
    if (!handle) {
      // Check if it's a thumb drag
      const thumbWrap = e.target.closest('.thumb-wrap');
      if (thumbWrap) return; // Let thumb handler deal with it
      e.preventDefault();
      return;
    }
    const card = e.target.closest('.group-card');
    if (!card) {
      e.preventDefault();
      return;
    }

    draggedGroupId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedGroupId);
  });

  list.addEventListener('dragover', (e) => {
    // Check if we're dragging a thumb
    if (draggedThumb) {
      e.preventDefault();
      const thumbWrap = e.target.closest('.thumb-wrap');
      if (!thumbWrap || thumbWrap === draggedThumb) return;

      // Only allow drop within same group
      const draggedGroupId2 = draggedThumb.dataset.groupId;
      const targetGroupId = thumbWrap.dataset.groupId;
      if (draggedGroupId2 !== targetGroupId) return;

      // Clear other indicators
      list.querySelectorAll('.thumb-wrap').forEach(t => {
        if (t !== thumbWrap) t.classList.remove('drag-over');
      });

      thumbWrap.classList.add('drag-over');
      return;
    }

    // Group drag & drop
    e.preventDefault();
    const card = e.target.closest('.group-card');
    if (!card || card.dataset.id === draggedGroupId) return;

    const rect = card.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    list.querySelectorAll('.group-card').forEach(c => {
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
    const card = e.target.closest('.group-card');
    if (card) {
      card.classList.remove('drag-over-before', 'drag-over-after');
    }
    const thumbWrap = e.target.closest('.thumb-wrap');
    if (thumbWrap) {
      thumbWrap.classList.remove('drag-over');
    }
  });

  list.addEventListener('dragend', (e) => {
    list.querySelectorAll('.group-card').forEach(c => {
      c.classList.remove('dragging', 'drag-over-before', 'drag-over-after');
    });
    list.querySelectorAll('.thumb-wrap').forEach(t => {
      t.classList.remove('dragging', 'drag-over');
    });
    draggedGroupId = null;
    draggedThumb = null;
  });

  list.addEventListener('drop', (e) => {
    // Check if dropping a thumb
    if (draggedThumb) {
      e.preventDefault();
      e.stopPropagation();
      const thumbWrap = e.target.closest('.thumb-wrap');
      if (!thumbWrap || thumbWrap === draggedThumb) return;

      const draggedGroupId2 = draggedThumb.dataset.groupId;
      const targetGroupId = thumbWrap.dataset.groupId;
      if (draggedGroupId2 !== targetGroupId) return;

      const fromIndex = parseInt(draggedThumb.dataset.imgIndex, 10);
      const toIndex = parseInt(thumbWrap.dataset.imgIndex, 10);

      state.reorderImages(draggedGroupId2, fromIndex, toIndex);

      list.querySelectorAll('.thumb-wrap').forEach(t => {
        t.classList.remove('dragging', 'drag-over');
      });

      ui.renderSidebar();
      renderPreview();
      updateStats();
      draggedThumb = null;
      return;
    }

    // Group drop
    e.preventDefault();
    const card = e.target.closest('.group-card');
    if (!card || card.dataset.id === draggedGroupId) return;

    const position = card.classList.contains('drag-over-before') ? 'before' : 'after';
    const targetGroupId = card.dataset.id;

    state.reorderGroups(draggedGroupId, targetGroupId, position);

    list.querySelectorAll('.group-card').forEach(c => {
      c.classList.remove('dragging', 'drag-over-before', 'drag-over-after');
    });

    ui.renderSidebar();
    renderPreview();
    updateStats();
  });

  // ── Thumb dragstart (delegated) ──
  list.addEventListener('dragstart', (e) => {
    const thumbWrap = e.target.closest('.thumb-wrap');
    if (!thumbWrap) return;

    draggedThumb = thumbWrap;
    thumbWrap.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'thumb');
  });
}

// ── INIT ──
if (state.getGroups().length === 0) {
  state.addGroup();
}
setupDragAndDrop();
ui.renderSidebar();
renderPreview();
updateStats();
updateLayoutToggleUI();

// ── RESPONSIVE ──
window.addEventListener('resize', () => {
  if (state.getGroups().some(g => g.images.length > 0)) {
    renderPreview();
  }
});
