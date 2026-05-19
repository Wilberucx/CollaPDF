import { CAPTION_H, CAPTION_PAD, PDF, MAX_PER_ROW } from './config.js';
import { getGroups } from './state.js';
import { buildPagesForGroup } from './layout.js';
import { truncateName, esc } from './utils.js';

/**
 * Renderizar el preview de todos los grupos
 */
export function renderPreview() {
  const area = document.getElementById('previewArea');
  const empty = document.getElementById('previewEmpty');
  const groups = getGroups();
  const hasImages = groups.some(g => g.images.length > 0);

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
  for (const group of groups) {
    if (!group.images.length) continue;

    // Título del grupo
    const groupLabel = document.createElement('div');
    groupLabel.className = 'preview-group-title';
    groupLabel.textContent = group.name;
    area.appendChild(groupLabel);

    const pages = buildPagesForGroup(group);
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
 * Renderizar la sidebar con los grupos
 */
export function renderSidebar() {
  const list = document.getElementById('groupsList');
  const groups = getGroups();

  list.innerHTML = groups.map(g => `
    <div class="group-card" id="card_${g.id}" draggable="true" data-id="${g.id}">
      <div class="group-header">
        <span class="group-drag-handle">⠿</span>
        <input class="group-name-input"
          value="${esc(g.name)}"
          onchange="app.renameGroup('${g.id}', this.value)"
          title="Renombrar grupo">
        <span class="group-count">${g.images.length}</span>
        <div class="preset-pills">
          ${['S','M','L'].map(p => `
            <button class="preset-pill ${g.preset === p ? 'active' : ''}"
              onclick="app.setPreset('${g.id}', '${p}')"
              title="${{S:'Pequeño',M:'Mediano',L:'Grande'}[p]}">
              ${p}
            </button>
          `).join('')}
        </div>
        <button class="btn-icon danger" onclick="app.removeGroup('${g.id}')" title="Eliminar grupo">✕</button>
      </div>

      <div class="group-thumbs">
        ${g.images.map(img => `
          <div class="thumb-wrap">
            <img src="${img.dataUrl}" title="${esc(img.name)}" loading="lazy">
            <button class="thumb-remove" onclick="app.removeImage('${g.id}', '${img.id}')">✕</button>
          </div>
        `).join('')}
      </div>

      <div class="drop-zone"
        onclick="app.openFilePicker('${g.id}')"
        ondragover="app.onDragOver(event, '${g.id}')"
        ondragleave="app.onDragLeave(event)"
        ondrop="app.onDrop(event, '${g.id}')">
        + AGREGAR IMÁGENES
      </div>
    </div>
  `).join('');

  // Mobile: show "Ver preview" button if there are images
  const hasImages = groups.some(g => g.images.length > 0);
  const existing = list.parentElement.querySelector('.preview-hint');
  if (existing) existing.remove();
  if (hasImages) {
    const hint = document.createElement('button');
    hint.className = 'preview-hint';
    hint.innerHTML = '◻ VER PREVIEW →';
    hint.onclick = () => app.switchTab('preview');
    list.parentElement.appendChild(hint);
  }
}
