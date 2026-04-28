// ═══════════════════════════════════════════
//  APP — Punto de entrada y conexión de módulos
// ═══════════════════════════════════════════
import * as config from './config.js';
import * as state from './state.js';
import * as ui from './ui.js';
import { exportPDF } from './pdf.js';
import { renderPreview } from './ui.js';

// ── Exponer API pública globalmente para los onclick del HTML ──
window.app = {
  addGroup,
  removeGroup,
  setPreset,
  renameGroup,
  removeImage,
  openFilePicker,
  onDragOver,
  onDragLeave,
  onDrop,
  exportPDF,
  switchTab,
  toggleSettings,
  updatePreset,
  updateMaxRow,
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

// ── SETTINGS ──
function toggleSettings() {
  const el = document.getElementById('presetSettings');
  const toggle = document.getElementById('settingsToggle');
  const open = el.classList.toggle('open');
  toggle.classList.toggle('open', open);
}

function updatePreset(key, val) {
  config.updatePreset(key, val);
  renderPreview();
}

function updateMaxRow(key, val) {
  config.updateMaxRow(key, val);
  renderPreview();
}

// ── MOBILE ──
function switchTab(tab) {
  document.querySelectorAll('.mob-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  const sidebar = document.querySelector('.sidebar');
  const preview = document.querySelector('.preview-area');
  sidebar.classList.toggle('mob-hidden', tab !== 'sidebar');
  preview.classList.toggle('mob-hidden', tab !== 'preview');
  if (tab === 'preview') renderPreview();
}

// ── STATS ──
function updateStats() {
  const groups = state.getGroups();
  document.getElementById('statGroups').textContent = groups.length;
  const total = groups.reduce((s, g) => s + g.images.length, 0);
  document.getElementById('statImages').textContent = total;
}

// ── INIT ──
state.addGroup();
ui.renderSidebar();
updateStats();

// ── RESPONSIVE ──
window.addEventListener('resize', () => {
  if (state.getGroups().some(g => g.images.length > 0)) {
    renderPreview();
  }
});
