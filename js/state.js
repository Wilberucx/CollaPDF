// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let documents = [];
let dCounter = 0;
let activeDocumentId = null;

// ── Selection state (multi-select on mobile) ──
let selectedImages = []; // {docId, imgId}[]

// Initialize state from localStorage if available
try {
  const saved = localStorage.getItem('collapdf_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.documents)) {
      documents = parsed.documents.map(d => ({
        ...d,
        customRowH: d.customRowH ?? null,
        customMaxRow: d.customMaxRow ?? null
      }));
      dCounter = parsed.dCounter || documents.length;
    } else if (parsed && Array.isArray(parsed.groups)) {
      // Migration from old format
      documents = parsed.groups.map(g => ({
        ...g,
        name: g.name.replace('Grupo', 'Documento')
      }));
      dCounter = parsed.gCounter || documents.length;
    }
  }
} catch (e) {
  console.error('Error loading state from localStorage:', e);
}

function saveState() {
  try {
    localStorage.setItem('collapdf_state', JSON.stringify({
      documents,
      dCounter
    }));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function getDocuments() { return documents; }
export function getActiveDocumentId() { return activeDocumentId; }
export function setActiveDocumentId(id) { activeDocumentId = id; }

export function addDocument() {
  dCounter++;
  const newDoc = {
    id: 'd' + dCounter,
    name: 'Documento ' + dCounter,
    preset: 'M',
    images: [],
    customRowH: null,
    customMaxRow: null
  };
  documents.push(newDoc);
  saveState();
  return newDoc;
}

export function removeDocument(id) {
  if (documents.length === 1) return; // keep at least one
  documents = documents.filter(d => d.id !== id);
  saveState();
}

export function setPreset(docId, preset) {
  const d = documents.find(d => d.id === docId);
  if (d) {
    d.preset = preset;
    saveState();
  }
}

export function setDocumentRowH(docId, val) {
  const d = documents.find(d => d.id === docId);
  if (d) {
    d.customRowH = val;
    saveState();
  }
}

export function setDocumentMaxRow(docId, val) {
  const d = documents.find(d => d.id === docId);
  if (d) {
    d.customMaxRow = val;
    saveState();
  }
}

export function resetDocumentOverrides(docId) {
  const d = documents.find(d => d.id === docId);
  if (d) {
    d.customRowH = null;
    d.customMaxRow = null;
    saveState();
  }
}

export function renameDocument(id, name) {
  const d = documents.find(d => d.id === id);
  if (d) {
    d.name = name;
    saveState();
  }
}

export function removeImage(docId, imgId) {
  const d = documents.find(d => d.id === docId);
  if (d) {
    d.images = d.images.filter(i => i.id !== imgId);
    saveState();
  }
}

export function renameImage(docId, imgId, name) {
  const d = documents.find(d => d.id === docId);
  if (!d) return;
  const img = d.images.find(i => i.id === imgId);
  if (img) {
    img.name = name;
    saveState();
  }
}

export function addImagesToDocument(docId, images) {
  const d = documents.find(d => d.id === docId);
  if (d) {
    d.images.push(...images);
    saveState();
  }
}

export function reorderImages(docId, fromIndex, toIndex) {
  const d = documents.find(d => d.id === docId);
  if (!d || fromIndex === toIndex) return;
  if (fromIndex < 0 || fromIndex >= d.images.length) return;
  if (toIndex < 0 || toIndex >= d.images.length) return;

  const [img] = d.images.splice(fromIndex, 1);
  d.images.splice(toIndex, 0, img);
  saveState();
}

export function getSelectedImages() { return selectedImages; }

export function toggleImageSelection(docId, imgId) {
  const idx = selectedImages.findIndex(s => s.docId === docId && s.imgId === imgId);
  if (idx >= 0) {
    selectedImages.splice(idx, 1);
  } else {
    selectedImages.push({ docId, imgId });
  }
  // Return new selection state
  return selectedImages.length;
}

export function clearSelection() {
  selectedImages = [];
}

export function deleteSelectedImages() {
  // Iterate backwards so splice indices stay valid
  for (let i = selectedImages.length - 1; i >= 0; i--) {
    const { docId, imgId } = selectedImages[i];
    const d = documents.find(doc => doc.id === docId);
    if (d) {
      d.images = d.images.filter(img => img.id !== imgId);
    }
  }
  selectedImages = [];
  saveState();
}

/**
 * Reorder documents inside the state array.
 * @param {string} draggedId 
 * @param {string} targetId 
 * @param {'before'|'after'} position 
 */
export function reorderDocuments(draggedId, targetId, position) {
  const draggedIndex = documents.findIndex(d => d.id === draggedId);
  const targetIndex = documents.findIndex(d => d.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedId === targetId) return;

  const [draggedDoc] = documents.splice(draggedIndex, 1);

  const newTargetIndex = documents.findIndex(d => d.id === targetId);
  const insertIndex = position === 'before' ? newTargetIndex : newTargetIndex + 1;

  documents.splice(insertIndex, 0, draggedDoc);
  saveState();
}
