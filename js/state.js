// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let groups = [];
let gCounter = 0;
let activeGroupId = null;

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
  return newGroup;
}

export function removeGroup(id) {
  if (groups.length === 1) return; // keep at least one
  groups = groups.filter(g => g.id !== id);
}

export function setPreset(groupId, preset) {
  const g = groups.find(g => g.id === groupId);
  if (g) g.preset = preset;
}

export function renameGroup(id, name) {
  const g = groups.find(g => g.id === id);
  if (g) g.name = name;
}

export function removeImage(groupId, imgId) {
  const g = groups.find(g => g.id === groupId);
  if (g) {
    g.images = g.images.filter(i => i.id !== imgId);
  }
}

export function addImagesToGroup(groupId, images) {
  const g = groups.find(g => g.id === groupId);
  if (g) {
    g.images.push(...images);
  }
}
