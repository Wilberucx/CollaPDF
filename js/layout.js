import { GAP, CAPTION_H, CAPTION_PAD, MARGIN, PDF, USABLE_W, PRESETS, MAX_PER_ROW } from './config.js';

/**
 * Algoritmo Justified Layout
 * - Respeta maxPerRow por preset
 * - Filas de 1 imagen no se estiran, se centran
 * - 2+ imágenes se estiran para llenar el ancho
 */
export function justifiedLayout(images, containerWidth, targetRowHeight, maxPerRow) {
  if (!images.length) return [];

  const rows = [];
  let row = []; // [{img, w}]

  const rowRenderedWidth = (items) =>
    items.reduce((s, r) => s + r.w, 0) + GAP * Math.max(0, items.length - 1);

  const sealRow = (items) => {
    if (!items.length) return;

    // ── FILA CON 1 SOLA IMAGEN ──
    // No se estira: usa su altura natural o un máximo razonable, y se centra.
    if (items.length === 1) {
      const img0 = items[0];
      const iw = img0.img.w || 1;
      const ih = img0.img.h || 1;
      const ar = iw / ih;
      const maxH = targetRowHeight * 1.5;
      let h = maxH;
      let w = h * ar;
      if (w > containerWidth) {
        w = containerWidth;
        h = w / ar;
        if (h > maxH) { h = maxH; w = h * ar; }
      }
      const xOffset = (containerWidth - w) / 2;
      const scale = h / ih;
      const capH = CAPTION_H * scale;
      rows.push({
        items: [{
          img: img0.img,
          w, h, capH,
          totalH: h + CAPTION_PAD * scale + capH,
          xOffset
        }],
        h: h + CAPTION_PAD * scale + capH
      });
      return;
    }

    // ── FILA CON 2+ IMÁGENES ──: Justified normal (estirar para llenar)
    const gaps = GAP * (items.length - 1);
    const imgOnlyW = items.reduce((s, r) => s + r.w, 0);
    const avail = containerWidth - gaps;
    const scale = avail / imgOnlyW;
    const scaledImgH = targetRowHeight * scale;
    const scaledCapH = CAPTION_H * scale;
    rows.push({
      items: items.map(r => ({
        img: r.img,
        w: r.w * scale,
        h: scaledImgH,
        capH: scaledCapH,
        totalH: scaledImgH + CAPTION_PAD * scale + scaledCapH
      })),
      h: scaledImgH + CAPTION_PAD * scale + scaledCapH
    });
  };

  for (const img of images) {
    if (!img.w || !img.h) continue;
    const ar = img.w / img.h;
    const imgW = targetRowHeight * ar;

    const tentative = [...row, { img, w: imgW }];
    const overflows = row.length > 0 && rowRenderedWidth(tentative) > containerWidth;
    const tooMany  = row.length >= (maxPerRow || 99);

    if (overflows || tooMany) {
      sealRow(row);
      row = [];
    }

    row.push({ img, w: imgW });
  }

  sealRow(row);
  return rows;
}

/**
 * Genera páginas para un grupo específico
 */
export function buildPagesForGroup(group) {
  const pages = [];
  let page = [];
  let y = MARGIN;

  function newPage() {
    if (page.length) pages.push(page);
    page = [];
    y = MARGIN;
  }

  if (!group.images.length) return pages;

  const rowH = PRESETS[group.preset];
  const maxPerRow = MAX_PER_ROW[group.preset];
  const rows = justifiedLayout(group.images, USABLE_W, rowH, maxPerRow);

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    if (y + row.h > PDF.h - MARGIN) newPage();

    let x = MARGIN;
    for (const item of row.items) {
      let xPos = x;
      if (item.xOffset !== undefined) {
        xPos = MARGIN + item.xOffset;
        if (xPos + item.w > PDF.w - MARGIN) {
          xPos = PDF.w - MARGIN - item.w;
        }
        if (xPos < MARGIN) xPos = MARGIN;
      }
      page.push({ item, x: xPos, y });
      x += item.w + GAP;
    }
    y += row.h + GAP;
  }

  if (page.length) pages.push(page);
  return pages;
}
