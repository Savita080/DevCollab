// components/kanban/MultiAssigneeSelect.jsx — pick one or more assignees from
// the workspace member list. Controlled: `value` is an array of user ids,
// `onChange` receives the next array.
import { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Avatar } from '../ui/Badge';
import { useClickOutside } from '../../lib/hooks';

export default function MultiAssigneeSelect({ members = [], value = [], onChange, label = 'Assignees' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const selected = new Set(value.map(v => v?.toString()));
  const toggle = (uid) => {
    const id = uid.toString();
    const next = selected.has(id) ? value.filter(v => v?.toString() !== id) : [...value, id];
    onChange(next);
  };

  const selectedMembers = members.filter(m => selected.has(m.user?._id?.toString()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && (
        <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)',
          fontSize: 13, borderRadius: 'var(--r-sm)', padding: '8px 12px', cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          {selectedMembers.length === 0
            ? <span style={{ color: 'var(--text-3)' }}>Unassigned</span>
            : (
              <>
                {selectedMembers.slice(0, 4).map(m => (
                  <Avatar key={m.user._id} name={m.user.name} src={m.user.avatar} size={20} />
                ))}
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {selectedMembers.length} selected
                </span>
              </>
            )}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 20,
          background: 'var(--bg-dropdown, var(--bg-card, #fff))', border: '1px solid var(--border)',
          borderRadius: 8, padding: 4, maxHeight: 240, overflowY: 'auto',
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        }}>
          {members.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: 8 }}>No members</div>
          )}
          {members.map(m => {
            const uid = m.user?._id?.toString();
            const isSel = selected.has(uid);
            return (
              <button
                key={uid}
                type="button"
                onClick={() => toggle(uid)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  background: isSel ? 'var(--bg-2, rgba(0,0,0,0.05))' : 'transparent',
                  border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                  color: 'var(--text-1)', textAlign: 'left',
                }}
              >
                <Avatar name={m.user?.name} src={m.user?.avatar} size={22} />
                <span style={{ flex: 1, fontSize: 13 }}>{m.user?.name}</span>
                {isSel && <Check size={14} style={{ color: 'var(--accent, #2563eb)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
