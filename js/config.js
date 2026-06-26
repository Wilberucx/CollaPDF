// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
export const PDF = { w: 595, h: 842 };
export const MARGIN = 20;
export const GAP = 4;
export const CAPTION_H = 14;
export const CAPTION_PAD = 2;
export const GROUP_GAP = 12;
export const USABLE_W = PDF.w - MARGIN * 2;

const STORAGE_KEY = 'collapdf_config';

// Valores por defecto
const DEFAULTS = {
  PRESETS: { S: 70, M: 130, L: 200 },
  MAX_PER_ROW: { S: 8, M: 5, L: 3 },
  LAYOUT_MODE: 'justified'
};

// Inicializar desde localStorage o defaults
function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        PRESETS: { ...DEFAULTS.PRESETS, ...parsed.PRESETS },
        MAX_PER_ROW: { ...DEFAULTS.MAX_PER_ROW, ...parsed.MAX_PER_ROW },
        LAYOUT_MODE: parsed.LAYOUT_MODE || DEFAULTS.LAYOUT_MODE
      };
    }
  } catch (e) {
    console.error('Error loading config from localStorage:', e);
  }
  return { ...DEFAULTS };
}

function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      PRESETS,
      MAX_PER_ROW,
      LAYOUT_MODE
    }));
  } catch (e) {
    console.error('Failed to save config to localStorage:', e);
  }
}

const loaded = loadConfig();
export let PRESETS = loaded.PRESETS;
export let MAX_PER_ROW = loaded.MAX_PER_ROW;
export let LAYOUT_MODE = loaded.LAYOUT_MODE;

export function updatePreset(key, val) {
  const v = parseInt(val);
  if (!isNaN(v) && v >= 30 && v <= 300) {
    PRESETS[key] = v;
    saveConfig();
  }
}

export function updateMaxRow(key, val) {
  const v = parseInt(val);
  if (!isNaN(v) && v >= 1 && v <= 20) {
    MAX_PER_ROW[key] = v;
    saveConfig();
  }
}

export function setLayoutMode(mode) {
  if (mode === 'justified' || mode === 'grid') {
    LAYOUT_MODE = mode;
    saveConfig();
  }
}
