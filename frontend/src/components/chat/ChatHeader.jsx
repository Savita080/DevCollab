import React from 'react';
import { Search } from 'lucide-react';
import { Avatar } from '../ui/Badge';
import { fmtRelative } from '../../lib/utils';
import s from '../../styles/modules/Chat.module.css';

export default function ChatHeader({
  title,
  subtitle,
  online,
  messages,
  searchQ,
  setSearchQ,
  searchOpen,
  setSearchOpen,
  jumpToMessage
}) {
  return (
    <div className={s.header}>
      <div className={s.headerIdentity}>
        <Avatar name={title} size={38} />
        <div>
          <h1 className={s.title}>{title}</h1>
          <p className={s.subtitle}>
            <span className={s.presenceDot} data-active={online.length > 0} />
            {subtitle}
          </p>
        </div>
      </div>
      <div className={s.headerActions}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setSearchOpen(o => !o)}
            title="Search messages"
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center' }}
          >
            <Search size={14} />
          </button>
          {searchOpen && (
            <div style={{ position: 'absolute', top: '110%', right: 0, width: 320, background: 'var(--bg-dropdown, var(--bg-card, #fff))', color: 'var(--text-1)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, zIndex: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.18)' }}>
              <input
                autoFocus
                type="text"
                placeholder="Search messages…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQ(''); } }}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2, transparent)', color: 'var(--text-1)', font: 'inherit', marginBottom: 6 }}
              />
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {searchQ.trim() === '' ? (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 2px' }}>Type to search this chat</div>
                ) : (() => {
                  const q = searchQ.toLowerCase();
                  const hits = messages.filter(m => !m.deletedAt && (m.content || '').toLowerCase().includes(q)).slice(-30).reverse();
                  if (hits.length === 0) return <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 2px' }}>No matches</div>;
                  return hits.map(h => (
                    <button
                      key={h._id}
                      onClick={() => { setSearchOpen(false); setSearchQ(''); jumpToMessage(h._id); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 4px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{h.sender?.name || 'Unknown'} · {fmtRelative(h.createdAt)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.content}</div>
                    </button>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
        {online.slice(0, 5).map(u => (
          <Avatar key={u._id || u.userId} name={u.name} src={u.avatar} online size={26} />
        ))}
        <span className={s.livePill}>● LIVE</span>
      </div>
    </div>
  );
}
