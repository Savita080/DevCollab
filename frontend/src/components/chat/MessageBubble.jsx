import React from 'react';
import { Pencil, Trash2, Check, X, Pin, PinOff, File as FileIcon } from 'lucide-react';
import { Avatar } from '../ui/Badge';
import MessageBody from '../ui/MessageBody';
import ReactionBar from '../ui/ReactionBar';
import { ReplyButton, QuoteChip } from '../ui/ReplyControls';
import rs from '../../styles/modules/ReplyControls.module.css';
import { fmtRelative, fmtBytes } from '../../lib/utils';
import s from '../../styles/modules/Chat.module.css';

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
  const thisSenderId = m.sender?._id ?? m.sender;
  const showName = !mine && (index === 0 || prevSenderId !== thisSenderId);

  return (
    <div
      ref={el => { if (m._id && messageRefs) messageRefs.current[m._id] = el; }}
      className={`${s.msgGroup} ${mine ? s.mine : ''}`}
    >
      {showName && (
        <div className={s.senderMeta}>
          <Avatar name={senderName} src={m.sender?.avatar} size={20} />
          <span className={s.senderName}>{senderName}</span>
        </div>
      )}
      <div className={s.bubble}>
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
          m.content && <span className={s.msgText}><MessageBody text={m.content} /></span>
        )}
        {/* Attachments (images + files) */}
        {!m.deletedAt && editingId !== m._id && m.attachments?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: m.content ? 6 : 0 }}>
            {m.attachments.map((att, idx) => (
              isImageAttachment(att) ? (
                <img
                  key={idx}
                  src={att.url}
                  alt="attachment"
                  loading="lazy"
                  onClick={() => onImageClick?.(att.url)}
                  style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                />
              ) : (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  download={att.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.06)', textDecoration: 'none', color: 'inherit', maxWidth: 220 }}
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
        <span className={s.msgTime}>
          {fmtRelative(m.createdAt)}
          {m.editedAt && !m.deletedAt && <span style={{ marginLeft: 4, opacity: 0.7 }}>(edited)</span>}
        </span>
      </div>
      {!m.deletedAt && editingId !== m._id && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ReactionBar
            reactions={m.reactions}
            currentUserId={myId}
            members={members}
            onToggle={(emoji) => handleReact(m._id, emoji)}
          />
          <ReplyButton onClick={() => setReplyingTo(m)} />
          {!m._optimistic && (
            <button type="button" onClick={() => handleTogglePin(m)} title={m.pinned ? 'Unpin' : 'Pin'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: m.pinned ? 'var(--amber, #f59e0b)' : 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center' }}>
              {m.pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
          )}
          {mine && !m._optimistic && (
            <>
              <button type="button" onClick={() => startEdit(m)} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center' }}>
                <Pencil size={12} />
              </button>
              <button type="button" onClick={() => handleDelete(m._id)} title="Delete" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center' }}>
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
