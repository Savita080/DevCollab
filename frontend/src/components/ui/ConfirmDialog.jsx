// components/ui/ConfirmDialog.jsx — themed replacement for window.confirm().
// Mounted once at app root; driven by useUI().confirmDialog + resolveConfirm.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../../store/ui';
import { useClickOutside } from '../../lib/hooks';
import s from '../../styles/modules/ConfirmDialog.module.css';

export default function ConfirmDialog() {
  const { confirmDialog, resolveConfirm } = useUI();
  const ref = useRef(null);
  useClickOutside(ref, () => confirmDialog && resolveConfirm(false));

  useEffect(() => {
    if (!confirmDialog) return;
    const handler = (e) => { if (e.key === 'Escape') resolveConfirm(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [confirmDialog, resolveConfirm]);

  if (!confirmDialog) return null;
  const { message, danger, confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = confirmDialog;

  return createPortal(
    <div className={s.overlay}>
      <div ref={ref} className={s.panel}>
        <p className={s.message}>{message}</p>
        <div className={s.actions}>
          <button type="button" className={s.cancelBtn} onClick={() => resolveConfirm(false)}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? s.dangerBtn : s.confirmBtn}
            onClick={() => resolveConfirm(true)}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
