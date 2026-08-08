// components/ui/EmojiPickerButton.jsx — popover button that opens emoji-mart
// Used both in compose boxes (onSelect inserts emoji into text) and on individual
// messages (onSelect adds an emoji as a reaction).
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useTheme } from '../../store/theme';

export default function EmojiPickerButton({ onSelect, title = 'Add emoji', children, className, style }) {
  const themeKind = useTheme(s => s.getActive().kind);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, flipUp: false });
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      // The picker renders inside the portal — ignore clicks landing inside it
      if (e.target.closest?.('em-emoji-picker') || e.target.closest?.('[data-emoji-popover]')) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const togglePicker = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (open) { setOpen(false); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const pickerHeight = 420;
      const pickerWidth = 350;
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = spaceBelow < pickerHeight && rect.top > pickerHeight;
      // Clamp left so picker stays in viewport
      const left = Math.max(8, Math.min(window.innerWidth - pickerWidth - 8, rect.left));
      setPos({
        top: flipUp ? rect.top - 8 : rect.bottom + 8,
        left,
        flipUp,
      });
    }
    setOpen(true);
  };

  const handleSelect = (emoji) => {
    onSelect?.(emoji.native);
  };

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={className}
        style={style}
        title={title}
        onClick={togglePicker}
      >
        {children ?? '😊'}
      </button>
      {open && createPortal(
        <div
          data-emoji-popover
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: pos.flipUp ? 'translateY(-100%)' : 'none',
            zIndex: 10000,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Picker
            data={data}
            theme={themeKind}
            onEmojiSelect={handleSelect}
            previewPosition="none"
            skinTonePosition="none"
            navPosition="bottom"
          />
        </div>,
        document.body
      )}
    </>
  );
}
