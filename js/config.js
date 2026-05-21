// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
export const PDF = { w: 595, h: 842 };
export const MARGIN = 20;
export const GAP = 4;
export const CAPTION_H = 14; // altura para la leyenda debajo de cada imagen
export const CAPTION_PAD = 2; // padding entre imagen y leyenda
export const GROUP_GAP = 12;
export const USABLE_W = PDF.w - MARGIN * 2;

export let PRESETS = { S: 70, M: 130, L: 200 };
export let MAX_PER_ROW = { S: 8, M: 5, L: 3 };
export let LAYOUT_MODE = 'justified';

export function updatePreset(key, val) {
  const v = parseInt(val);
  if (!isNaN(v) && v >= 30 && v <= 300) {
    PRESETS[key] = v;
  }
}

export function updateMaxRow(key, val) {
  const v = parseInt(val);
  if (!isNaN(v) && v >= 1 && v <= 20) {
    MAX_PER_ROW[key] = v;
  }
}

export function setLayoutMode(mode) {
  if (mode === 'justified' || mode === 'grid') {
    LAYOUT_MODE = mode;
  }
}
