// store/theme.js — multi-theme system
//
// Each theme is a small registry entry: id (CSS data-theme value), display name,
// kind (light/dark — drives Excalidraw + emoji-mart), and a 3-color swatch for
// the picker UI. The actual color values live in globals.css — this file only
// describes themes and manages the active selection.
//
// Persistence: active theme id stored in localStorage under THEME_STORAGE_KEY.
// On boot, applyTheme() is called once to sync <html data-theme=…>.

import { create } from 'zustand';

export const THEMES = [
  {
    id: 'midnight',
    name: 'Midnight',
    kind: 'dark',
    description: 'Deep indigo + cyan — the original look.',
    swatch: ['#0a0e1a', '#6366f1', '#00d4ff'],
  },
  {
    id: 'caramel',
    name: 'Caramel',
    kind: 'light',
    description: 'Warm cream + caramel coffee.',
    swatch: ['#FFF2DF', '#D3A376', '#3E2522'],
  },
  {
    id: 'sage',
    name: 'Sage',
    kind: 'light',
    description: 'Mint cream + deep forest green.',
    swatch: ['#F4F8F4', '#8EB69B', '#163832'],
  },
  {
    id: 'charcoal',
    name: 'Royal Charcoal',
    kind: 'dark',
    description: 'Monochrome graphite with platinum accents.',
    swatch: ['#1e1f22', '#4c4e51', '#C5CDD6'],
  },
  {
    id: 'pastel',
    name: 'Pastel Drift',
    kind: 'light',
    description: 'Misty rainbow — sky, peach, mint, blush.',
    swatch: ['#FDE8D3', '#99CDD8', '#F3C3B2'],
  },
  {
    id: 'linen',
    name: 'Linen',
    kind: 'light',
    description: 'Soft cream paper with stone neutrals.',
    swatch: ['#F2EFE5', '#C7C8CC', '#B4B4B8'],
  },
];

const THEME_STORAGE_KEY = 'rc:theme';
const DEFAULT_THEME = 'caramel';

function readStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEMES.some(t => t.id === stored)) return stored;
  } catch { /* localStorage might be blocked — fall through */ }
  return DEFAULT_THEME;
}

function writeStoredTheme(id) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(THEME_STORAGE_KEY, id); }
  catch { /* ignore */ }
}

// Set the data-theme attribute on <html>. Idempotent — safe to call repeatedly.
function applyDom(id) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', id);
}

export const useTheme = create((set, get) => ({
  themes: THEMES,
  current: readStoredTheme(),

  // Returns the registry entry for the active theme (used by callers that need
  // .kind to drive third-party theme bindings like Excalidraw).
  getActive: () => THEMES.find(t => t.id === get().current) || THEMES[0],

  setTheme: (id) => {
    if (!THEMES.some(t => t.id === id)) return;
    writeStoredTheme(id);
    applyDom(id);
    set({ current: id });
  },
}));

// Apply once at import time so the first paint already has the right theme —
// otherwise the page flashes in the default theme before React mounts.
applyDom(readStoredTheme());
