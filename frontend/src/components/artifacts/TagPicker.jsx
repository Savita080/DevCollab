// components/artifacts/TagPicker.jsx — pick from existing project tags (chips)
// or add a brand new custom tag via the "+" input. Controlled: `selected` is
// the array of chosen tag strings, `onChange` receives the updated array.
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import s from '../../styles/modules/TagPicker.module.css';

export default function TagPicker({ availableTags = [], selected = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState('');

  const toggle = (tag) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  };

  const commitNewTag = () => {
    const clean = newTag.trim().toLowerCase();
    if (clean && !selected.includes(clean)) onChange([...selected, clean]);
    setNewTag('');
    setAdding(false);
  };

  const remainingTags = availableTags.filter(t => !selected.includes(t));

  return (
    <div className={s.wrap}>
      {selected.length > 0 && (
        <div className={s.row}>
          {selected.map(t => (
            <button key={t} type="button" className={s.chipSelected} onClick={() => toggle(t)}>
              {t} <X size={11} />
            </button>
          ))}
        </div>
      )}

      <div className={s.row}>
        {remainingTags.map(t => (
          <button key={t} type="button" className={s.chip} onClick={() => toggle(t)}>
            {t}
          </button>
        ))}

        {adding ? (
          <input
            autoFocus
            className={s.newTagInput}
            value={newTag}
            placeholder="New tag…"
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitNewTag(); }
              if (e.key === 'Escape') { setAdding(false); setNewTag(''); }
            }}
            onBlur={commitNewTag}
          />
        ) : (
          <button type="button" className={s.addBtn} onClick={() => setAdding(true)} title="Add a new tag">
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
