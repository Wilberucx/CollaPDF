import { CAPTION_H, CAPTION_PAD, PDF, SHOW_CAPTIONS } from './config.js';
import { getDocuments } from './state.js';
import { buildPagesForDocument } from './layout.js';
import { truncateName, showToast } from './utils.js';

// ── Pending exports for mobile share dialog ──
// Stored here so both pdf.js and capacitor.js can access them.
// The share dialog in app.js reads/writes this.
let pendingExports = [];
window.__pendingExports = pendingExports;

function setPendingExports(arr) {
  pendingExports = arr;
  window.__pendingExports = arr;
}

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
      const isDefaultName = /^Documento_\d+$/.test(baseName);
      const namePart = isDefaultName ? `CollaPDF${di + 1}` : baseName;
      const filename = `${namePart}.pdf`;

      // On mobile or Capacitor: collect blob for the share dialog instead of downloading directly
      const isMobile = window.innerWidth <= 640 || window.__capacitorMode;
      if (isMobile) {
        const blob = pdfDoc.output('blob');
        pendingExports.push({ blob, filename, docName: doc.name });
      } else {
        pdfDoc.save(filename);
      }

      // Pausa entre descargas
      if (!isMobile && di < docsWithImages.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    // On mobile: show share dialog instead of immediate download
    if (pendingExports.length > 0) {
      setPendingExports(pendingExports);
      showToast('PDF generado con éxito.', 'success');
      if (window.app && window.app.showShareDialog) {
        window.app.showShareDialog();
      }
    } else {
      showToast('PDF generado con éxito.', 'success');
    }
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

/**
 * Download all pending PDFs (used by the share dialog's "Guardar")
 */
export function downloadPendingPdfs() {
  const exports = window.__pendingExports || [];
  if (!exports.length) return;

  function downloadOne(index) {
    if (index >= exports.length) return;
    const { blob, filename } = exports[index];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Download next after a small delay
    setTimeout(() => downloadOne(index + 1), 300);
  }

  downloadOne(0);
}

/**
 * Share pending PDFs via Web Share API (used by "Compartir")
 * Falls back to download if Web Share is not available.
 */
export function sharePendingPdfs() {
  const exports = window.__pendingExports || [];
  if (!exports.length) return;

  // Try Web Share API
  if (navigator.share && exports.length === 1) {
    const { blob, filename } = exports[0];
    const file = new File([blob], filename, { type: 'application/pdf' });
    navigator.share({
      title: filename,
      files: [file]
    }).catch(() => {
      // User cancelled or error – fallback to download
      downloadPendingPdfs();
    });
    return;
  }

  if (navigator.share && exports.length > 1) {
    const files = exports.map(({ blob, filename }) =>
      new File([blob], filename, { type: 'application/pdf' })
    );
    navigator.share({
      title: 'CollaPDF - Documentos',
      files: files
    }).catch(() => {
      downloadPendingPdfs();
    });
    return;
  }

  // Fallback: download instead
  downloadPendingPdfs();
}

/**
 * Clear pending exports
 */
export function clearPendingExports() {
  setPendingExports([]);
}
