import { CAPTION_H, CAPTION_PAD, PDF, SHOW_CAPTIONS } from './config.js';
import { getDocuments } from './state.js';
import { buildPagesForDocument } from './layout.js';
import { truncateName, showToast } from './utils.js';

/**
 * Exportar un PDF por documento
 */
export async function exportPDF() {
  const docs = getDocuments();
  const docsWithImages = docs.filter(d => d.images.length > 0);

  if (!docsWithImages.length) {
    showToast('Agregá imágenes antes de exportar.', 'error');
    return;
  }

  const exportBtn = document.getElementById('exportBtn');
  const originalText = exportBtn ? exportBtn.textContent : 'Exportar PDF';
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.textContent = 'PROCESANDO...';
  }

  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('active');

  await new Promise(r => setTimeout(r, 80));

  try {
    const { jsPDF } = window.jspdf;

    for (let di = 0; di < docsWithImages.length; di++) {
      const doc = docsWithImages[di];
      const pdfDoc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
      const pages = buildPagesForDocument(doc);

      for (let pi = 0; pi < pages.length; pi++) {
        if (pi > 0) pdfDoc.addPage();
        for (const { item, x, y } of pages[pi]) {
          // Validar coordenadas
          if (x < 0 || y < 0 || item.w <= 0 || item.h <= 0 ||
              x + item.w > PDF.w + 10 || y + item.h > PDF.h + 10) {
            console.warn('Saltando imagen con coordenadas inválidas:', { x, y, w: item.w, h: item.h });
            continue;
          }
          const fmt = item.img.dataUrl.includes('data:image/png') ? 'PNG' : 'JPEG';
          pdfDoc.addImage(item.img.dataUrl, fmt, x, y, item.w, item.h, undefined, 'FAST');

          // Caption
          if (SHOW_CAPTIONS) {
            const capFontSize = Math.max(6, (item.capH || CAPTION_H) * 0.7);
            pdfDoc.setFontSize(capFontSize);
            pdfDoc.setTextColor(140, 140, 140);
            const capText = truncateName(item.img.name, Math.floor(item.w / 4));
            pdfDoc.text(capText, x + item.w / 2, y + item.h + (CAPTION_PAD + (item.capH || CAPTION_H)) * 0.65, {
              align: 'center'
            });
          }
        }
      }

      // Nombre del PDF
      const baseName = doc.name.replace(/[^a-zA-Z0-9\-_"]/g, '_');
      const idx = di + 1;
      const suffix = docsWithImages.length > 1 ? `_${idx}` : '';
      const filename = `${baseName}${suffix}_${doc.images.length}imgs_${pages.length}pag.pdf`;
      pdfDoc.save(filename);

      // Pausa entre descargas
      if (di < docsWithImages.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    showToast('PDF generado con éxito.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error al generar PDF: ' + err.message, 'error');
  } finally {
    if (loader) loader.classList.remove('active');
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.textContent = originalText;
    }
  }
}
