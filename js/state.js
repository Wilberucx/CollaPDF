// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let groups = [];
let gCounter = 0;
let activeGroupId = null;

// Initialize state from localStorage if available
try {
  const saved = localStorage.getItem('collapdf_state');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.groups)) {
      groups = parsed.groups;
      gCounter = parsed.gCounter || groups.length;
    }
  }
} catch (e) {
  console.error('Error loading state from localStorage:', e);
}

function saveState() {
  try {
    localStorage.setItem('collapdf_state', JSON.stringify({
      groups,
      gCounter
    }));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function getGroups() { return groups; }
export function getActiveGroupId() { return activeGroupId; }
export function setActiveGroupId(id) { activeGroupId = id; }

export function addGroup() {
  gCounter++;
  const newGroup = {
    id: 'g' + gCounter,
    name: 'Grupo ' + gCounter,
    preset: 'M',
    images: []
  };
  groups.push(newGroup);
  saveState();
  return newGroup;
}

export function removeGroup(id) {
  if (groups.length === 1) return; // keep at least one
  groups = groups.filter(g => g.id !== id);
  saveState();
}

export function setPreset(groupId, preset) {
  const g = groups.find(g => g.id === groupId);
  if (g) {
    g.preset = preset;
    saveState();
  }
}

export function renameGroup(id, name) {
  const g = groups.find(g => g.id === id);
  if (g) {
    g.name = name;
    saveState();
  }
}

export function removeImage(groupId, imgId) {
  const g = groups.find(g => g.id === groupId);
  if (g) {
    g.images = g.images.filter(i => i.id !== imgId);
    saveState();
  }
}

export function addImagesToGroup(groupId, images) {
  const g = groups.find(g => g.id === groupId);
  if (g) {
    g.images.push(...images);
    saveState();
  }
}

/**
 * Reorder groups inside the state array.
 * @param {string} draggedId 
 * @param {string} targetId 
 * @param {'before'|'after'} position 
 */
export function reorderGroups(draggedId, targetId, position) {
  const draggedIndex = groups.findIndex(g => g.id === draggedId);
  const targetIndex = groups.findIndex(g => g.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedId === targetId) return;

  const [draggedGroup] = groups.splice(draggedIndex, 1);

  const newTargetIndex = groups.findIndex(g => g.id === targetId);
  const insertIndex = position === 'before' ? newTargetIndex : newTargetIndex + 1;

  groups.splice(insertIndex, 0, draggedGroup);
  saveState();
}
