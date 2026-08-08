import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, Check, X, Pin, PinOff, File as FileIcon, SmilePlus, Reply, Copy } from 'lucide-react';
import { Avatar } from '../ui/Badge';
import MessageBody from '../ui/MessageBody';
import EmojiPickerButton from '../ui/EmojiPickerButton';
import { ReplyButton, QuoteChip } from '../ui/ReplyControls';
import rs from '../../styles/modules/ReplyControls.module.css';
import { fmtChatTime, fmtBytes } from '../../lib/utils';
import s from '../../styles/modules/Chat.module.css';

const QUICK_REACTS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Old records (pre-R2 migration) have no `kind` field but are always images —
// fall back to the presence of width/height to tell them apart from files.
const isImageAttachment = (att) => att.kind === 'image' || (!att.kind && (att.width || att.height));

export default function MessageBubble({
  m,
  index,
  messages,
  isMe,
  myId,
  members,
  editingId,
  editingText,
  setEditingText,
  saveEdit,
  cancelEdit,
  startEdit,
  handleDelete,
  handleTogglePin,
  handleReact,
  setReplyingTo,
  jumpToMessage,
  messageRefs,
  onImageClick,
}) {
  const mine = isMe(m);
  const senderName = m.sender?.name ?? 'Unknown';
  const prevSenderId = messages[index - 1]?.sender?._id ?? messages[index - 1]?.sender;
  const nextSenderId = messages[index + 1]?.sender?._id ?? messages[index + 1]?.sender;
  const thisSenderId = m.sender?._id ?? m.sender;
  const isRunStart = index === 0 || prevSenderId !== thisSenderId;
  const isRunEnd = index === messages.length - 1 || nextSenderId !== thisSenderId;
  const showName = !mine && isRunStart;
  const isMediaOnly = !m.content && m.attachments?.length > 0;

  // WhatsApp-style reaction pill — small overlapping badge in the bubble's
  // bottom corner instead of a row of individual per-emoji chips.
  const reactionEntries = Array.isArray(m.reactions) ? m.reactions.filter(r => r?.emoji && r.users?.length > 0) : [];
  const reactionTotal = reactionEntries.reduce((sum, r) => sum + r.users.length, 0);
  const reactionTitle = (() => {
    if (reactionEntries.length === 0) return '';
    const nameById = new Map();
    for (const mem of members || []) {
      const u = mem?.user || mem;
      if (u?._id) nameById.set(u._id.toString(), u.name || 'Unknown');
    }
    return reactionEntries.map(r => {
      const names = r.users.slice(0, 4).map(u => nameById.get((u?._id || u)?.toString()) || 'someone');
      const extra = r.users.length > names.length ? ` +${r.users.length - names.length}` : '';
      return `${r.emoji} ${names.join(', ')}${extra}`;
    }).join(' · ');
  })();

  const [menuPos, setMenuPos] = useState(null); // { x, y } or null
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuPos) return;
    const close = () => setMenuPos(null);
    const onKey = (e) => { if (e.key === 'Escape') setMenuPos(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuPos]);

  const onContextMenu = (e) => {
    if (m.deletedAt || editingId === m._id) return;
    e.preventDefault();
    const MENU_W = 200;
    const MENU_H = 300;
    const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
    const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
    setMenuPos({ x, y });
  };

  const copyText = () => {
    if (m.content) navigator.clipboard?.writeText(m.content).catch(() => {});
    setMenuPos(null);
  };

  const contextMenu = menuPos && createPortal(
    <div
      ref={menuRef}
      className={s.ctxMenu}
      style={{ top: menuPos.y, left: menuPos.x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={s.ctxQuickReacts}>
        {QUICK_REACTS.map(emoji => (
          <button
            key={emoji}
            type="button"
            className={s.ctxEmoji}
            onClick={() => { handleReact(m._id, emoji); setMenuPos(null); }}
          >
            {emoji}
          </button>
        ))}
        <EmojiPickerButton className={s.ctxEmoji} title="More reactions" onSelect={(emoji) => { handleReact(m._id, emoji); setMenuPos(null); }}>
          <SmilePlus size={15} />
        </EmojiPickerButton>
      </div>
      <div className={s.ctxDivider} />
      <button type="button" className={s.ctxItem} onClick={() => { setReplyingTo(m); setMenuPos(null); }}>
        <Reply size={14} /> Reply
      </button>
      {m.content && (
        <button type="button" className={s.ctxItem} onClick={copyText}>
          <Copy size={14} /> Copy
        </button>
      )}
      {!m._optimistic && (
        <button type="button" className={s.ctxItem} onClick={() => { handleTogglePin(m); setMenuPos(null); }}>
          {m.pinned ? <PinOff size={14} /> : <Pin size={14} />} {m.pinned ? 'Unpin' : 'Pin'}
        </button>
      )}
      {mine && !m._optimistic && (
        <>
          <button type="button" className={s.ctxItem} onClick={() => { startEdit(m); setMenuPos(null); }}>
            <Pencil size={14} /> Edit
          </button>
          <button type="button" className={`${s.ctxItem} ${s.ctxDanger}`} onClick={() => { handleDelete(m._id); setMenuPos(null); }}>
            <Trash2 size={14} /> Delete
          </button>
        </>
      )}
    </div>,
    document.body
  );

  const actions = !m.deletedAt && editingId !== m._id && (
    <div className={s.actions}>
      <ReplyButton onClick={() => setReplyingTo(m)} />
      {!m._optimistic && (
        <EmojiPickerButton className={s.actionBtn} title="Add reaction" onSelect={(emoji) => handleReact(m._id, emoji)}>
          <SmilePlus size={12} />
        </EmojiPickerButton>
      )}
      {!m._optimistic && (
        <button
          type="button"
          className={`${s.actionBtn} ${m.pinned ? s.pinned : ''}`}
          onClick={() => handleTogglePin(m)}
          title={m.pinned ? 'Unpin' : 'Pin'}
        >
          {m.pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
      )}
      {mine && !m._optimistic && (
        <>
          <button type="button" className={s.actionBtn} onClick={() => startEdit(m)} title="Edit">
            <Pencil size={12} />
          </button>
          <button type="button" className={s.actionBtn} onClick={() => handleDelete(m._id)} title="Delete">
            <Trash2 size={12} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div
      ref={el => { if (m._id && messageRefs) messageRefs.current[m._id] = el; }}
      className={`${s.msgGroup} ${mine ? s.mine : ''} ${isRunEnd ? s.runEnd : ''} ${reactionEntries.length > 0 ? s.hasReactions : ''}`}
    >
      {showName && (
        <div className={s.senderMeta}>
          <Avatar name={senderName} src={m.sender?.avatar} size={20} />
          <span className={s.senderName}>{senderName}</span>
        </div>
      )}
      <div className={s.bubbleRow}>
      {mine && actions}
      <div className={`${s.bubble} ${isMediaOnly ? s.mediaOnly : ''}`} onContextMenu={onContextMenu}>
        <QuoteChip replyTo={m.replyTo} mine={mine} onJump={jumpToMessage} />
        {m.deletedAt ? (
          <span className={s.msgText} style={{ fontStyle: 'italic', opacity: 0.6 }}>
            [message deleted]
          </span>
        ) : editingId === m._id ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              autoFocus
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
              }}
              rows={Math.min(4, editingText.split('\n').length)}
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: 6, color: 'inherit', font: 'inherit', resize: 'vertical', minWidth: 200 }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button type="button" onClick={cancelEdit} title="Cancel" style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: 'inherit' }}>
                <X size={12} />
              </button>
              <button type="button" onClick={saveEdit} title="Save (Enter)" style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: '#fff' }}>
                <Check size={12} />
              </button>
            </div>
          </div>
        ) : (
          m.content && (
            <p className={s.msgText}>
              <MessageBody text={m.content} />
              <span className={s.msgTimeInline}>
                {fmtChatTime(m.createdAt)}
                {m.editedAt && <span className={s.editedTag}> · edited</span>}
              </span>
            </p>
          )
        )}
        {/* Attachments (images + files) */}
        {!m.deletedAt && editingId !== m._id && m.attachments?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: m.content ? 6 : 0 }}>
            {m.attachments.map((att, idx) => (
              isImageAttachment(att) ? (
                <img
                  key={idx}
                  src={att.url}
                  alt="attachment"
                  loading="lazy"
                  onClick={() => onImageClick?.(att.url)}
                  className={s.attachmentImg}
                />
              ) : (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  download={att.name}
                  className={s.attachmentFile}
                >
                  <FileIcon size={14} style={{ flexShrink: 0 }} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {att.name || 'file'}
                    {att.size != null && <span style={{ color: 'var(--text-3)' }}> · {fmtBytes(att.size)}</span>}
                  </span>
                </a>
              )
            ))}
          </div>
        )}
        {m.linkPreview?.url && !m.deletedAt && editingId !== m._id && (
          <a
            href={m.linkPreview.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 6,
              padding: 8,
              borderRadius: 8,
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              color: 'inherit',
              maxWidth: 360,
              alignItems: 'flex-start',
            }}
          >
            {m.linkPreview.image && (
              <img
                src={m.linkPreview.image}
                alt=""
                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              {m.linkPreview.siteName && (
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {m.linkPreview.siteName}
                </div>
              )}
              {m.linkPreview.title && (
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {m.linkPreview.title}
                </div>
              )}
              {m.linkPreview.description && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {m.linkPreview.description}
                </div>
              )}
            </div>
          </a>
        )}
        {(m.deletedAt || !m.content || editingId === m._id) && (
          <span className={s.msgTime}>
            {fmtChatTime(m.createdAt)}
            {m.editedAt && !m.deletedAt && <span style={{ marginLeft: 4, opacity: 0.7 }}>(edited)</span>}
          </span>
        )}
        {reactionEntries.length > 0 && (
          <button
            type="button"
            className={`${s.reactionPill} ${mine ? s.reactionPillMine : ''}`}
            title={reactionTitle}
            onClick={() => handleReact(m._id, reactionEntries[0].emoji)}
          >
            {reactionEntries.slice(0, 3).map(r => <span key={r.emoji} className={s.reactionEmoji}>{r.emoji}</span>)}
            {reactionTotal > 1 && <span className={s.reactionCount}>{reactionTotal}</span>}
          </button>
        )}
      </div>
      {!mine && actions}
      </div>
      {contextMenu}
    </div>
  );
}
