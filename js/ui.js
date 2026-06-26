import { CAPTION_H, CAPTION_PAD, PDF, MAX_PER_ROW } from './config.js';
import { getDocuments, getSelectedImages, toggleImageSelection } from './state.js';
import { buildPagesForDocument } from './layout.js';
import { truncateName, esc } from './utils.js';

/**
 * Renderizar el preview de todos los documentos
 */
export function renderPreview() {
  const area = document.getElementById('previewArea');
  const empty = document.getElementById('previewEmpty');
  const docs = getDocuments();
  const hasImages = docs.some(d => d.images.length > 0);

  if (!hasImages) {
    area.innerHTML = '';
    if (empty) area.appendChild(empty);
    document.getElementById('statPages').textContent = '\u2014';
    return;
  }

  const areaW = area.clientWidth - 48;
  const PREVIEW_W = Math.min(Math.max(areaW, 300), 560);
  const scale = PREVIEW_W / PDF.w;
  const PREVIEW_H = PDF.h * scale;

  area.innerHTML = '';

  let totalPages = 0;
  for (let di = 0; di < docs.length; di++) {
    const doc = docs[di];
    if (!doc.images.length) continue;

    // Separador entre documentos (no antes del primero)
    if (di > 0) {
      const separator = document.createElement('div');
      separator.className = 'preview-document-separator';
      area.appendChild(separator);
    }

    // Título del documento con icono
    const docLabel = document.createElement('div');
    docLabel.className = 'preview-document-title';
    docLabel.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3.75 15C5.13071 15 6.25 16.1193 6.25 17.5C6.25 18.8807 5.13071 20 3.75 20H2.5V21.25C2.5 21.6642 2.16421 22 1.75 22C1.33579 22 1 21.6642 1 21.25V15.75C1 15.3358 1.33579 15 1.75 15H3.75ZM2.5 18.5H3.75C4.30228 18.5 4.75 18.0523 4.75 17.5C4.75 16.9477 4.30228 16.5 3.75 16.5H2.5V18.5ZM9.25 15C10.7688 15 12 16.2312 12 17.75V19.25C12 20.7688 10.7688 22 9.25 22H7.75C7.33579 22 7 21.6642 7 21.25V15.75C7 15.3358 7.33579 15 7.75 15H9.25ZM8.5 20.5H9.25C9.94036 20.5 10.5 19.9404 10.5 19.25V17.75C10.5 17.0596 9.94036 16.5 9.25 16.5H8.5V20.5ZM16.75 15C17.1642 15 17.5 15.3358 17.5 15.75C17.5 16.1642 17.1642 16.5 16.75 16.5H14.5V18H16.25C16.6642 18 17 18.3358 17 18.75C17 19.1642 16.6642 19.5 16.25 19.5H14.5V21.25C14.5 21.6642 14.1642 22 13.75 22C13.3358 22 13 21.6642 13 21.25V15.75C13 15.3358 13.3358 15 13.75 15H16.75ZM12.1289 2C12.7256 2.00006 13.2978 2.23728 13.7197 2.65918L19.3408 8.28027C19.7627 8.70218 19.9999 9.27444 20 9.87109V19.5C20 20.8807 18.8807 22 17.5 22H15.3291C15.4374 21.7724 15.5 21.5188 15.5 21.25V20.5H17.5C18.0523 20.5 18.5 20.0523 18.5 19.5V10H14C12.8954 10 12 9.10457 12 8V3.5H6.5C5.94772 3.5 5.5 3.94772 5.5 4.5V14H4V4.5C4 3.11929 5.11929 2 6.5 2H12.1289ZM13.5 8C13.5 8.27614 13.7239 8.5 14 8.5H17.4395L13.5 4.56055V8Z"/></svg>
      ${esc(doc.name)}
    `;
    area.appendChild(docLabel);

    const pages = buildPagesForDocument(doc);
    totalPages += pages.length;

    pages.forEach((pageItems, pi) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'preview-page';
      pageEl.style.width = PREVIEW_W + 'px';
      pageEl.style.height = PREVIEW_H + 'px';

      pageItems.forEach(({ item, x, y }) => {
        const xPos = x * scale;
        const img = document.createElement('img');
        img.src = item.img.dataUrl;
        img.style.cssText = `
          position: absolute;
          left: ${xPos.toFixed(1)}px;
          top: ${(y * scale).toFixed(1)}px;
          width: ${(item.w * scale).toFixed(1)}px;
          height: ${(item.h * scale).toFixed(1)}px;
          object-fit: cover;
        `;
        pageEl.appendChild(img);

        // Caption
        const capH = item.capH || (CAPTION_H * scale);
        const caption = document.createElement('div');
        caption.style.cssText = `
          position: absolute;
          left: ${xPos.toFixed(1)}px;
          top: ${((y + item.h + CAPTION_PAD) * scale).toFixed(1)}px;
          width: ${(item.w * scale).toFixed(1)}px;
          height: ${capH.toFixed(1)}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${Math.max(6, capH * 0.7).toFixed(1)}px;
          color: #888;
          font-family: 'Space Mono', monospace;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          padding: 0 2px;
        `;
        caption.textContent = truncateName(item.img.name, Math.floor(item.w * scale / 5));
        pageEl.appendChild(caption);
      });

      const num = document.createElement('div');
      num.className = 'preview-page-num';
      num.textContent = pi + 1 + ' / ' + pages.length;
      pageEl.appendChild(num);

      area.appendChild(pageEl);
    });
  }

  document.getElementById('statPages').textContent = totalPages;
}

/**
 * Renderizar la sidebar con los documentos
 */
export function renderSidebar() {
  const list = document.getElementById('documentsList');
  const docs = getDocuments();  list.innerHTML = docs.map(d => {
    return `
      <div class="document-card" id="card_${d.id}" draggable="true" data-id="${d.id}">
        <div class="document-header">
          <span class="document-drag-handle">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
          </span>
          <svg class="document-header-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3.75 15C5.13071 15 6.25 16.1193 6.25 17.5C6.25 18.8807 5.13071 20 3.75 20H2.5V21.25C2.5 21.6642 2.16421 22 1.75 22C1.33579 22 1 21.6642 1 21.25V15.75C1 15.3358 1.33579 15 1.75 15H3.75ZM2.5 18.5H3.75C4.30228 18.5 4.75 18.0523 4.75 17.5C4.75 16.9477 4.30228 16.5 3.75 16.5H2.5V18.5ZM9.25 15C10.7688 15 12 16.2312 12 17.75V19.25C12 20.7688 10.7688 22 9.25 22H7.75C7.33579 22 7 21.6642 7 21.25V15.75C7 15.3358 7.33579 15 7.75 15H9.25ZM8.5 20.5H9.25C9.94036 20.5 10.5 19.9404 10.5 19.25V17.75C10.5 17.0596 9.94036 16.5 9.25 16.5H8.5V20.5ZM16.75 15C17.1642 15 17.5 15.3358 17.5 15.75C17.5 16.1642 17.1642 16.5 16.75 16.5H14.5V18H16.25C16.6642 18 17 18.3358 17 18.75C17 19.1642 16.6642 19.5 16.25 19.5H14.5V21.25C14.5 21.6642 14.1642 22 13.75 22C13.3358 22 13 21.6642 13 21.25V15.75C13 15.3358 13.3358 15 13.75 15H16.75ZM12.1289 2C12.7256 2.00006 13.2978 2.23728 13.7197 2.65918L19.3408 8.28027C19.7627 8.70218 19.9999 9.27444 20 9.87109V19.5C20 20.8807 18.8807 22 17.5 22H15.3291C15.4374 21.7724 15.5 21.5188 15.5 21.25V20.5H17.5C18.0523 20.5 18.5 20.0523 18.5 19.5V10H14C12.8954 10 12 9.10457 12 8V3.5H6.5C5.94772 3.5 5.5 3.94772 5.5 4.5V14H4V4.5C4 3.11929 5.11929 2 6.5 2H12.1289ZM13.5 8C13.5 8.27614 13.7239 8.5 14 8.5H17.4395L13.5 4.56055V8Z"/></svg>
          <input class="document-name-input"
            value="${esc(d.name)}"
            onchange="app.renameDocument('${d.id}', this.value)"
            title="Renombrar documento">
          <span class="document-count">${d.images.length}</span>
          <select class="preset-select"
            onchange="app.setPreset('${d.id}', this.value)"
            title="Tamaño de las imágenes">
            <option value="S" ${d.preset === 'S' ? 'selected' : ''}>Compacto</option>
            <option value="M" ${d.preset === 'M' ? 'selected' : ''}>Normal</option>
            <option value="L" ${d.preset === 'L' ? 'selected' : ''}>Amplio</option>
          </select>
          <button class="btn-icon danger" onclick="app.removeDocument('${d.id}')" title="Eliminar documento">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="document-thumbs" id="thumbs_${d.id}">
          ${(window.innerWidth <= 640 ? renderImageList(d) : renderImageGrid(d))}
          ${d.images.length > 0 ? (window.innerWidth <= 640 ? renderAddRow(d) : renderAddButton(d)) : ''}
        </div>

        ${d.images.length === 0 ? `
        <div class="drop-zone"
          onclick="app.openFilePicker('${d.id}')"
          ondragover="app.onDragOver(event, '${d.id}')"
          ondragleave="app.onDragLeave(event)"
          ondrop="app.onDrop(event, '${d.id}')">
          + AGREGAR IMÁGENES
        </div>
        ` : ''}
      </div>
    `}).join('');

  // Update selection bar
  updateSelectionBar();

  // Mobile: "+ Documento" button (replaces old "VER PREVIEW")
  const existing = list.parentElement.querySelector('.add-doc-btn');
  if (existing) existing.remove();
  const addBtn = document.createElement('button');
  addBtn.className = 'add-doc-btn';
  addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Agregar Documento';
  addBtn.onclick = () => app.addDocument();
  list.parentElement.appendChild(addBtn);
}

// ── Image rendering helpers ──

function renderImageGrid(d) {
  return d.images.map((img, i) => {
    const sel = getSelectedImages();
    const isSelected = sel.some(s => s.docId === d.id && s.imgId === img.id);
    return `
    <div class="thumb-wrap${isSelected ? ' selected' : ''}" draggable="true" data-doc-id="${d.id}" data-img-index="${i}">
      <button class="thumb-select" onclick="event.stopPropagation();app.toggleImageSelection('${d.id}', '${img.id}')" title="Seleccionar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="thumb-drag-handle">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="8" cy="5" r="1.5"/><circle cx="16" cy="5" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>
      </span>
      <img src="${img.dataUrl}" title="${esc(img.name)}" loading="lazy">
    </div>
  `}).join('');
}

function renderImageList(d) {
  return d.images.map((img, i) => {
    const sel = getSelectedImages();
    const isSelected = sel.some(s => s.docId === d.id && s.imgId === img.id);
    return `
    <div class="thumb-row${isSelected ? ' selected' : ''}" draggable="true" data-doc-id="${d.id}" data-img-index="${i}">
      <div class="thumb-row-img-wrap" onclick="app.toggleImageSelection('${d.id}', '${img.id}')">
        <img class="thumb-row-img" src="${img.dataUrl}" loading="lazy">
        <button class="thumb-select" onclick="event.stopPropagation();app.toggleImageSelection('${d.id}', '${img.id}')" title="Seleccionar">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <input class="thumb-row-name" value="${esc(img.name)}"
        onchange="app.renameImage('${d.id}', '${img.id}', this.value)"
        onclick="event.stopPropagation()"
        title="Renombrar imagen">
      <span class="thumb-row-grip">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
      </span>
    </div>
  `}).join('');
}

function renderAddRow(d) {
  return `
    <div class="thumb-row add-row"
      onclick="app.openFilePicker('${d.id}')"
      title="Agregar imágenes">
      <div class="add-row-icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <span class="add-row-label">AGREGAR IMÁGENES</span>
      <span class="thumb-row-grip" style="visibility:hidden">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
      </span>
    </div>
  `;
}

function renderAddButton(d) {
  return `
    <div class="drop-zone thumb"
      onclick="app.openFilePicker('${d.id}')"
      ondragover="app.onDragOver(event, '${d.id}')"
      ondragleave="app.onDragLeave(event)"
      ondrop="app.onDrop(event, '${d.id}')"
      title="Agregar imágenes">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>
  `;
}

function updateSelectionBar() {
  const bar = document.getElementById('selectionBar');
  if (!bar) return;
  const sel = getSelectedImages();
  const count = sel.length;
  const countEl = bar.querySelector('.sel-count');
  if (countEl) {
    countEl.textContent = count + ' seleccionada' + (count !== 1 ? 's' : '');
  }
  bar.classList.toggle('active', count > 0);
}
