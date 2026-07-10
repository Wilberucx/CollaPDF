import { CAPTION_H, CAPTION_PAD, PDF, SHOW_CAPTIONS, SINGLE_PDF_EXPORT } from './config.js';
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
window.__setPendingExports = setPendingExports;

/**
 * Build combined filename for single-PDF export
 */
function buildCombinedFilename(docs) {
  const sanitizedNames = docs.map(d => d.name.replace(/[^a-zA-Z0-9\-_"]/g, '_'));
  if (sanitizedNames.length <= 3) {
    return sanitizedNames.join(' & ') + '.pdf';
  }
  return sanitizedNames.slice(0, 3).join(' & ') + ` + ${sanitizedNames.length - 3} más.pdf`;
}

/**
 * Add document name header to a PDF page
 */
function addDocumentHeader(pdfDoc, docName) {
  pdfDoc.setFontSize(8);
  pdfDoc.setTextColor(160, 160, 160);
  pdfDoc.text(docName, PDF.w - 10, 12, { align: 'right' });
}

/**
 * Render page items (images + captions) onto a jsPDF instance
 */
function renderPageItems(pdfDoc, pageItems) {
  for (const { item, x, y } of pageItems) {
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

/**
 * Exportar PDF(s) según la configuración actual
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

    if (SINGLE_PDF_EXPORT) {
      // ── MODO: Todo en un solo PDF ──
      const pdfDoc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
      let isFirstDoc = true;

      for (let di = 0; di < docsWithImages.length; di++) {
        const doc = docsWithImages[di];
        const pages = buildPagesForDocument(doc);

        if (pages.length === 0) continue;

        for (let pi = 0; pi < pages.length; pi++) {
          if (!isFirstDoc || pi > 0) pdfDoc.addPage();
          isFirstDoc = false;

          // Add document name header (top-right corner)
          addDocumentHeader(pdfDoc, doc.name);

          // Render images + captions
          renderPageItems(pdfDoc, pages[pi]);
        }
      }

      // Nombre del PDF combinado
      const filename = buildCombinedFilename(docsWithImages);

      const isMobile = window.innerWidth <= 640 || window.__capacitorMode;
      if (isMobile) {
        const blob = pdfDoc.output('blob');
        pendingExports = [{ blob, filename, docName: filename.replace('.pdf', '') }];
      } else {
        pdfDoc.save(filename);
      }
    } else {
      // ── MODO: 1 PDF por documento (comportamiento actual) ──
      for (let di = 0; di < docsWithImages.length; di++) {
        const doc = docsWithImages[di];
        const pdfDoc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
        const pages = buildPagesForDocument(doc);

        for (let pi = 0; pi < pages.length; pi++) {
          if (pi > 0) pdfDoc.addPage();
          renderPageItems(pdfDoc, pages[pi]);
        }

        // Nombre del PDF: usa el nombre del documento sanitizado
        const namePart = doc.name.replace(/[^a-zA-Z0-9\-_"]/g, '_');
        const filename = `${namePart}.pdf`;

        // On mobile or Capacitor: collect blob for the share dialog
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
    }

    // On mobile: show share dialog
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
