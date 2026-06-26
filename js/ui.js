import { CAPTION_H, CAPTION_PAD, PDF, MAX_PER_ROW } from './config.js';
import { getDocuments } from './state.js';
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
    document.getElementById('statPages').textContent = '—';
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
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
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
          <svg class="document-header-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
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

        <div class="document-thumbs">
          ${d.images.map((img, i) => `
            <div class="thumb-wrap" draggable="true" data-doc-id="${d.id}" data-img-index="${i}">
              <span class="thumb-drag-handle">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="8" cy="5" r="1.5"/><circle cx="16" cy="5" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/></svg>
              </span>
              <img src="${img.dataUrl}" title="${esc(img.name)}" loading="lazy">
              <button class="thumb-remove" onclick="app.removeImage('${d.id}', '${img.id}')">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `).join('')}
        </div>

        <div class="drop-zone"
          onclick="app.openFilePicker('${d.id}')"
          ondragover="app.onDragOver(event, '${d.id}')"
          ondragleave="app.onDragLeave(event)"
          ondrop="app.onDrop(event, '${d.id}')">
          + AGREGAR IMÁGENES
        </div>
      </div>
    `}).join('');

  // Mobile: show "Ver preview" button if there are images
  const hasImages = docs.some(d => d.images.length > 0);
  const existing = list.parentElement.querySelector('.preview-hint');
  if (existing) existing.remove();
  if (hasImages) {
    const hint = document.createElement('button');
    hint.className = 'preview-hint';
    hint.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> VER PREVIEW <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    hint.onclick = () => app.switchTab('preview');
    list.parentElement.appendChild(hint);
  }
}
