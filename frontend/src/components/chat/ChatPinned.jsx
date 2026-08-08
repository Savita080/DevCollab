import React from 'react';
import { Pin } from 'lucide-react';
import s from '../../styles/modules/Chat.module.css';

export default function ChatPinned({ messages, jumpToMessage }) {
  const pinned = messages.filter(m => m.pinned && !m.deletedAt);
  if (pinned.length === 0) return null;
  const latest = pinned[pinned.length - 1];

  return (
    <button type="button" className={s.pinnedBar} onClick={() => jumpToMessage(latest._id)} title="Jump to pinned message">
      <Pin size={13} className={s.pinnedIcon} />
      <div className={s.pinnedBody}>
        <span className={s.pinnedLabel}>{pinned.length > 1 ? `Pinned message (${pinned.length})` : 'Pinned message'}</span>
        <span className={s.pinnedText}>{latest.sender?.name || 'Unknown'}: {latest.content || '📷 Photo'}</span>
      </div>
    </button>
  );
}
