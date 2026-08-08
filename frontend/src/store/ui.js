// store/ui.js
import { create } from 'zustand';
import socket from '../lib/socket';

// Listen for paywall events dispatched by api.js 403 interceptor
let paywallListenerAttached = false;
function attachPaywallListener(openPaywall) {
  if (paywallListenerAttached) return;
  paywallListenerAttached = true;
  window.addEventListener('paywall', (e) => openPaywall(e.detail));
}

const POPUP_DURATION = 6000;
const POPUP_MAX = 4;
// Track each popup's auto-dismiss timer + remaining time so hover can pause.
const popupTimers = new Map(); // id -> { timeoutId, expiresAt, remaining }

function startPopupTimer(id, duration, dismiss) {
  if (popupTimers.has(id)) clearTimeout(popupTimers.get(id).timeoutId);
  const timeoutId = setTimeout(() => {
    popupTimers.delete(id);
    dismiss(id);
  }, duration);
  popupTimers.set(id, { timeoutId, expiresAt: Date.now() + duration, remaining: duration });
}

export const useUI = create((set, get) => ({
  toasts: [],
  popups: [],          // live notification popups (corner dialogs)
  notifications: [],
  unreadCount: 0,
  sidebarOpen: true,
  paywallModal: null,   // { message, upgradeUrl } or null
  confirmDialog: null,  // { message, resolve, danger, confirmLabel, cancelLabel } or null

  // Themed replacement for window.confirm — returns a Promise<boolean>.
  // Usage: if (!(await confirm('Delete this task?'))) return;
  confirm: (message, opts = {}) => new Promise((resolve) => {
    set({ confirmDialog: { message, resolve, danger: true, ...opts } });
  }),
  resolveConfirm: (result) => {
    get().confirmDialog?.resolve(result);
    set({ confirmDialog: null });
  },

  toast: (msg, type = 'info', duration = 4000) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },

  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // Notification popups (separate from toasts — bigger, click-to-navigate)
  pushPopup: (notif) => {
    const id = notif._id || `pop-${Date.now()}`;
    const item = { ...notif, id };
    set(s => ({ popups: [item, ...s.popups].slice(0, POPUP_MAX) }));
    startPopupTimer(id, POPUP_DURATION, get().dismissPopup);
  },

  dismissPopup: (id) => {
    const t = popupTimers.get(id);
    if (t) { clearTimeout(t.timeoutId); popupTimers.delete(id); }
    set(s => ({ popups: s.popups.filter(p => (p._id || p.id) !== id) }));
  },

  // Pause auto-dismiss on hover so the popup doesn't disappear mid-read
  pausePopup: (id) => {
    const t = popupTimers.get(id);
    if (!t) return;
    clearTimeout(t.timeoutId);
    t.remaining = Math.max(1500, t.expiresAt - Date.now());
    t.timeoutId = null;
  },

  resumePopup: (id) => {
    const t = popupTimers.get(id);
    if (!t || t.timeoutId) return;
    startPopupTimer(id, t.remaining, get().dismissPopup);
  },

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  openPaywall: (data) => set({ paywallModal: data }),
  closePaywall: () => set({ paywallModal: null }),

  // Bind socket notifications — event name must match backend exactly
  bindNotifications: () => {
    // Attach paywall listener once
    attachPaywallListener(get().openPaywall);

    // Remove any prior listener to avoid duplicates on remounts
    socket.off('new_notification');
    socket.on('new_notification', (notif) => {
      set(s => ({
        notifications: [notif, ...s.notifications],
        unreadCount: s.unreadCount + 1,
      }));
      get().pushPopup(notif);
    });
  },

  unbindNotifications: () => socket.off('new_notification'),

  setNotifications: (n) => set({ notifications: n, unreadCount: n.filter(x => !x.seen).length }),
  clearUnread: () => set({ unreadCount: 0 }),
}));

// Auto-attach paywall listener so 403 errors show modal even outside notification context
setTimeout(() => attachPaywallListener(useUI.getState().openPaywall), 100);

