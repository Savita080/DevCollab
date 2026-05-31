// components/kanban/KanbanFilters.jsx
// Client-side only — filters are local state, never sent to backend.
// Drop this next to TaskDetail.jsx and import it in ProjectKanban.jsx.

import { useState, useRef, useEffect } from 'react';
import { taskAssigneeIds } from '../../lib/utils';
import s from '../../styles/modules/KanbanFilters.module.css';

const PRIORITIES = [
  { value: 'P0', label: 'P0 — Critical' },
  { value: 'P1', label: 'P1 — High' },
  { value: 'P2', label: 'P2 — Normal' },
];

const STATUSES = [
  { value: 'To Do',       label: 'To Do' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'In Review',   label: 'In Review' },
  { value: 'Done',        label: 'Done' },
];

const DEADLINE_OPTIONS = [
  { value: '',          label: 'Any time' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'today',     label: 'Due today' },
  { value: 'week',      label: 'Due this week' },
  { value: 'month',     label: 'Due this month' },
  { value: 'none',      label: 'No deadline' },
];

/**
 * Props:
 *   wsMembers   — array of { user: { _id, name } }
 *   allTasks    — full task list (used to derive available labels)
 *   filters     — current filter state (controlled)
 *   onChange    — (filters) => void
 *   onClose     — () => void  (hide the bar)
 */
export default function KanbanFilters({ wsMembers = [], allTasks = [], filters, onChange, onClose }) {
  const [tagInput, setTagInput] = useState('');
  const tagRef = useRef(null);

  // Derive unique labels from all tasks
  const allLabels = [...new Set(allTasks.flatMap(t => t.labels || []))].sort();

  const set = (key, value) => onChange({ ...filters, [key]: value });

  const toggleArrayItem = (key, value) => {
    const arr = filters[key] || [];
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    set(key, next);
  };

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const arr = filters.tags || [];
    if (!arr.includes(trimmed)) set('tags', [...arr, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag) => {
    set('tags', (filters.tags || []).filter(t => t !== tag));
  };

  const activeCount =
    (filters.assignees?.length || 0) +
    (filters.priorities?.length || 0) +
    (filters.statuses?.length || 0) +
    (filters.deadline ? 1 : 0) +
    (filters.tags?.length || 0);

  return (
    <div className={s.bar}>
      <div className={s.barInner}>

        {/* ── Assigned To ─────────────────────────────── */}
        <FilterGroup label="Assigned to">
          <ChipRow>
            <Chip
              active={filters.assignees?.includes('__me__')}
              onClick={() => toggleArrayItem('assignees', '__me__')}
            >Me</Chip>
            <Chip
              active={filters.assignees?.includes('__unassigned__')}
              onClick={() => toggleArrayItem('assignees', '__unassigned__')}
            >Unassigned</Chip>
          </ChipRow>
          {wsMembers.length > 0 && (
            <ChipRow>
              {wsMembers.map(m => {
                const uid = m.user?._id || m.user;
                const name = m.user?.name || 'Unknown';
                return (
                  <Chip
                    key={uid}
                    active={filters.assignees?.includes(uid)}
                    onClick={() => toggleArrayItem('assignees', uid)}
                  >
                    {name.split(' ')[0]}
                  </Chip>
                );
              })}
            </ChipRow>
          )}
        </FilterGroup>

        <Divider />

        {/* ── Priority ───────────────────────────────── */}
        <FilterGroup label="Priority">
          <ChipRow>
            {PRIORITIES.map(p => (
              <Chip
                key={p.value}
                active={filters.priorities?.includes(p.value)}
                onClick={() => toggleArrayItem('priorities', p.value)}
                accent={p.value === 'P0' ? 'red' : p.value === 'P1' ? 'amber' : 'slate'}
              >
                {p.value}
              </Chip>
            ))}
          </ChipRow>
        </FilterGroup>

        <Divider />

        {/* ── Status ─────────────────────────────────── */}
        <FilterGroup label="Status">
          <ChipRow>
            {STATUSES.map(st => (
              <Chip
                key={st.value}
                active={filters.statuses?.includes(st.value)}
                onClick={() => toggleArrayItem('statuses', st.value)}
              >
                {st.label}
              </Chip>
            ))}
          </ChipRow>
        </FilterGroup>

        <Divider />

        {/* ── Deadline ───────────────────────────────── */}
        <FilterGroup label="Deadline">
          <ChipRow>
            {DEADLINE_OPTIONS.filter(o => o.value).map(o => (
              <Chip
                key={o.value}
                active={filters.deadline === o.value}
                onClick={() => set('deadline', filters.deadline === o.value ? '' : o.value)}
                accent={o.value === 'overdue' ? 'red' : undefined}
              >
                {o.label}
              </Chip>
            ))}
          </ChipRow>
        </FilterGroup>

        <Divider />

        {/* ── Tags / Labels ──────────────────────────── */}
        <FilterGroup label="Tags">
          {allLabels.length > 0 && (
            <ChipRow>
              {allLabels.map(l => (
                <Chip
                  key={l}
                  active={filters.tags?.includes(l)}
                  onClick={() => toggleArrayItem('tags', l)}
                >
                  {l}
                </Chip>
              ))}
            </ChipRow>
          )}
          <div className={s.tagInputRow}>
            <input
              ref={tagRef}
              className={s.tagInput}
              placeholder="Type a tag and press Enter…"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
              }}
            />
          </div>
          {(filters.tags?.length || 0) > 0 && (
            <ChipRow>
              {filters.tags.map(t => (
                <span key={t} className={s.activeTag}>
                  {t}
                  <button className={s.tagRemove} onClick={() => removeTag(t)}>×</button>
                </span>
              ))}
            </ChipRow>
          )}
        </FilterGroup>

      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className={s.footer}>
        {activeCount > 0 && (
          <button
            className={s.clearBtn}
            onClick={() => onChange({ assignees: [], priorities: [], statuses: [], deadline: '', tags: [] })}
          >
            Clear all ({activeCount})
          </button>
        )}
        <button className={s.doneBtn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

/* ─── tiny helpers ────────────────────────────────────────────────────── */

function FilterGroup({ label, children }) {
  return (
    <div className={s.group}>
      <span className={s.groupLabel}>{label}</span>
      <div className={s.groupBody}>{children}</div>
    </div>
  );
}

function ChipRow({ children }) {
  return <div className={s.chipRow}>{children}</div>;
}

function Chip({ active, onClick, children, accent }) {
  return (
    <button
      className={`${s.chip} ${active ? s.chipActive : ''} ${accent ? s[`accent_${accent}`] : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className={s.divider} />;
}

/* ─── exported hook: apply filters to a task list ────────────────────── */

export function applyFilters(tasks, filters, currentUserId) {
  let result = tasks;

  // Assignee — tasks may have multiple assignees now.
  if (filters.assignees?.length) {
    result = result.filter(t => {
      const ids = taskAssigneeIds(t);
      return filters.assignees.some(f => {
        if (f === '__me__')         return ids.includes(currentUserId?.toString());
        if (f === '__unassigned__') return ids.length === 0;
        return ids.includes(f?.toString());
      });
    });
  }

  // Priority
  if (filters.priorities?.length) {
    result = result.filter(t => filters.priorities.includes(t.priority));
  }

  // Status
  if (filters.statuses?.length) {
    result = result.filter(t => filters.statuses.includes(t.status));
  }

  // Deadline
  if (filters.deadline) {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week  = new Date(today); week.setDate(today.getDate() + 7);
    const month = new Date(today); month.setMonth(today.getMonth() + 1);

    result = result.filter(t => {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      switch (filters.deadline) {
        case 'overdue': return due && due < today && t.status !== 'Done';
        case 'today':   return due && due >= today && due < new Date(today.getTime() + 86400000);
        case 'week':    return due && due >= today && due <= week;
        case 'month':   return due && due >= today && due <= month;
        case 'none':    return !due;
        default:        return true;
      }
    });
  }

  // Tags
  if (filters.tags?.length) {
    result = result.filter(t =>
      filters.tags.every(tag => (t.labels || []).includes(tag))
    );
  }

  return result;
}

export const EMPTY_FILTERS = {
  assignees:  [],
  priorities: [],
  statuses:   [],
  deadline:   '',
  tags:       [],
};