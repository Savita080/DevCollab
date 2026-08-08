// pages/workspace/WorkspaceChat.jsx — workspace-level chat at full parity with
// project chat: edit, delete, pin, search, read receipts, image upload, link
// previews, scoped presence. Reuses MessageBubble so behaviour stays identical.
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send, X, Paperclip, File as FileIcon } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { chat as chatApi, workspaces as wsApi } from '../../lib/api';
import { useScopedPresence } from '../../lib/hooks';
import { Avatar } from '../../components/ui/Badge';
import ChatHeader from '../../components/chat/ChatHeader';
import ChatPinned from '../../components/chat/ChatPinned';
import MessageBubble from '../../components/chat/MessageBubble';
import MentionInput from '../../components/ui/MentionInput';
import EmojiPickerButton from '../../components/ui/EmojiPickerButton';
import { ReplyPreview } from '../../components/ui/ReplyControls';
import rs from '../../styles/modules/ReplyControls.module.css';
import socket, { joinWorkspace, leaveWorkspace } from '../../lib/socket';
import { uploadImage, uploadFile, isImage, MAX_FILE_BYTES, MAX_ATTACHMENT_BYTES } from '../../lib/upload';
import ImageLightbox from '../../components/ui/ImageLightbox';
import s from '../../styles/modules/Chat.module.css';

// Old records (pre-R2 migration) have no `kind` field but are always images —
// fall back to the presence of width/height to tell them apart from files.
const isImageAttachment = (att) => att.kind === 'image' || (!att.kind && (att.width || att.height));

export default function WorkspaceChat() {
  const { workspaceId, workspace } = useOutletContext();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const online = useScopedPresence(workspace?._id ? `ws:${workspace._id}` : null);

  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reads, setReads] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const bottomRef = useRef(null);
  const messageRefs = useRef({});
  const dragCounterRef = useRef(0);

  const myId = user?.id || user?._id;

  // Join workspace room + load history. Rooms are keyed by canonical _id.
  useEffect(() => {
    if (!workspaceId) return;
    const roomId = workspace?._id;
    if (roomId) joinWorkspace(roomId);
    setLoading(true);
    chatApi.workspaceMessages(workspaceId)
      .then(({ data }) => {
        setMessages(data.messages ?? data ?? []);
        setReads(data.reads ?? []);
      })
      .catch(() => toast('Failed to load chat', 'error'))
      .finally(() => setLoading(false));

    wsApi.members(workspaceId)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));

    return () => { if (roomId) leaveWorkspace(roomId); };
  }, [workspaceId, workspace?._id]);

  // Realtime events
  useEffect(() => {
    if (!workspaceId) return;
    const canonicalId = workspace?._id;
    const sameWs = (id) => id === canonicalId || id === workspaceId;

    const onNew = (msg) => {
      const msgWs = msg.workspace?._id || msg.workspace;
      if (msgWs && !sameWs(msgWs)) return;
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        const senderId = msg.sender?._id || msg.sender;
        const tempIdx = prev.findIndex(m => m._optimistic && m.content === msg.content && (m.sender?._id || m.sender) === senderId);
        if (tempIdx !== -1) { const next = [...prev]; next[tempIdx] = msg; return next; }
        return [...prev, msg];
      });
    };
    const onReaction = ({ scope, messageId, reactions }) => {
      if (scope !== 'workspace') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };
    const onEdited = ({ scope, message }) => {
      if (scope !== 'workspace') return;
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    };
    const onDeleted = ({ scope, messageId }) => {
      if (scope !== 'workspace') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: '' } : m));
    };
    const onPinned = ({ scope, message }) => {
      if (scope !== 'workspace') return;
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    };
    const onLinkPreview = ({ scope, messageId, linkPreview }) => {
      if (scope !== 'workspace') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, linkPreview } : m));
    };
    const onRead = ({ scope, workspaceId: wid, user: u, lastReadAt }) => {
      if (scope !== 'workspace' || !sameWs(wid)) return;
      setReads(prev => {
        const idx = prev.findIndex(r => (r.user?._id || r.user) === (u?._id || u));
        const entry = { user: u, lastReadAt };
        if (idx === -1) return [...prev, entry];
        const next = [...prev]; next[idx] = entry; return next;
      });
    };
    const onTyping = ({ workspaceId: wsId, userName }) => {
      if (sameWs(wsId) && userName !== user?.name) {
        setTypingUser(userName);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };
    socket.on('new_workspace_message', onNew);
    socket.on('message_reaction_updated', onReaction);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    socket.on('message_pinned', onPinned);
    socket.on('message_link_preview', onLinkPreview);
    socket.on('chat_read', onRead);
    socket.on('workspace_user_typing', onTyping);
    return () => {
      socket.off('new_workspace_message', onNew);
      socket.off('message_reaction_updated', onReaction);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('message_pinned', onPinned);
      socket.off('message_link_preview', onLinkPreview);
      socket.off('chat_read', onRead);
      socket.off('workspace_user_typing', onTyping);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [workspaceId, workspace?._id, user?.name]);

  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (!bottomRef.current) return;
    const isInitialLoad = prevLengthRef.current === 0 && messages.length > 1;
    prevLengthRef.current = messages.length;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: isInitialLoad ? 'instant' : 'smooth',
      });
    });
  }, [messages.length]);

  // Mark read when open + focused.
  useEffect(() => {
    if (!workspaceId || loading || messages.length === 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const t = setTimeout(() => { chatApi.markWorkspaceRead(workspaceId).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [workspaceId, loading, messages.length]);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files.slice(0, 6)) {
        if (isImage(file)) {
          if (file.size > MAX_FILE_BYTES) { toast(`${file.name}: image is too large (max 10MB)`, 'error'); continue; }
          const att = await uploadImage(file);
          setAttachments(prev => [...prev, { ...att, kind: 'image' }].slice(0, 6));
        } else {
          if (file.size > MAX_ATTACHMENT_BYTES) { toast(`${file.name}: file is too large (max 50MB)`, 'error'); continue; }
          const att = await uploadFile(file);
          setAttachments(prev => [...prev, { ...att, kind: 'file' }].slice(0, 6));
        }
      }
    } catch (err) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const onDragEnter = (e) => { e.preventDefault(); dragCounterRef.current++; setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); dragCounterRef.current--; if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setDragActive(false); } };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    const pendingAtts = attachments;
    if (!text && pendingAtts.length === 0) return;
    const replyTo = replyingTo;
    const replyToId = replyTo?._id;
    setInput('');
    setReplyingTo(null);
    setAttachments([]);

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      _id: tempId,
      _optimistic: true,
      content: text,
      attachments: pendingAtts,
      sender: { _id: myId, name: user?.name, avatar: user?.avatar },
      createdAt: new Date().toISOString(),
      reactions: [],
      ...(replyTo ? { replyTo: { _id: replyTo._id, content: replyTo.content, sender: replyTo.sender } } : {}),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const { data } = await chatApi.sendWorkspace(workspaceId, {
        content: text,
        ...(pendingAtts.length ? { attachments: pendingAtts } : {}),
        ...(replyToId ? { replyTo: replyToId } : {}),
      });
      const msg = data.chatMessage ?? data.data ?? data;
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev.filter(m => m._id !== tempId);
        return prev.map(m => m._id === tempId ? msg : m);
      });
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setInput(text);
      setAttachments(pendingAtts);
      if (replyTo) setReplyingTo(replyTo);
      toast('Failed to send', 'error');
    }
  };

  const jumpToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(rs.highlight);
    setTimeout(() => el.classList.remove(rs.highlight), 1500);
  };

  useEffect(() => {
    if (!replyingTo) return;
    const onKey = (e) => { if (e.key === 'Escape') setReplyingTo(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replyingTo]);

  const isMe = (m) => {
    const id = m.sender?._id ?? m.sender;
    return id === user?.id || id === user?._id;
  };

  const handleReact = async (msgId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m._id !== msgId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx === -1) reactions.push({ emoji, users: [myId] });
      else {
        const users = reactions[idx].users || [];
        const has = users.some(u => (u?._id || u)?.toString() === myId?.toString());
        const next = has ? users.filter(u => (u?._id || u)?.toString() !== myId?.toString()) : [...users, myId];
        if (next.length === 0) reactions.splice(idx, 1);
        else reactions[idx] = { ...reactions[idx], users: next };
      }
      return { ...m, reactions };
    }));
    try { await chatApi.reactWorkspace(workspaceId, msgId, emoji); }
    catch { toast('Failed to react', 'error'); }
  };

  const startEdit = (m) => { setEditingId(m._id); setEditingText(m.content); };
  const cancelEdit = () => { setEditingId(null); setEditingText(''); };
  const saveEdit = async () => {
    const text = editingText.trim();
    if (!text || !editingId) return cancelEdit();
    const id = editingId;
    const original = messages.find(m => m._id === id);
    if (!original || original.content === text) return cancelEdit();
    setMessages(prev => prev.map(m => m._id === id ? { ...m, content: text, editedAt: new Date().toISOString() } : m));
    cancelEdit();
    try { await chatApi.editWorkspace(workspaceId, id, text); }
    catch { setMessages(prev => prev.map(m => m._id === id ? original : m)); toast('Failed to edit', 'error'); }
  };
  const handleTogglePin = async (msg) => {
    const id = msg._id;
    const wasPinned = !!msg.pinned;
    setMessages(prev => prev.map(m => m._id === id ? { ...m, pinned: !wasPinned, pinnedAt: !wasPinned ? new Date().toISOString() : null } : m));
    try { await chatApi.togglePinWorkspace(workspaceId, id); }
    catch { setMessages(prev => prev.map(m => m._id === id ? { ...m, pinned: wasPinned } : m)); toast('Failed to pin', 'error'); }
  };
  const handleDelete = async (msgId) => {
    if (!(await confirm('Delete this message?'))) return;
    const original = messages.find(m => m._id === msgId);
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deletedAt: new Date().toISOString(), content: '' } : m));
    try { await chatApi.deleteWorkspace(workspaceId, msgId); }
    catch { if (original) setMessages(prev => prev.map(m => m._id === msgId ? original : m)); toast('Failed to delete', 'error'); }
  };

  return (
    <div className={s.page} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}>
      {dragActive && <div className={s.dropOverlay}>Drop to attach</div>}
      <ChatHeader
        title={`${workspace?.name || 'Workspace'} Chat`}
        subtitle={online.length > 0 ? `${online.length} online` : `${members.length} member${members.length !== 1 ? 's' : ''}`}
        online={online}
        messages={messages}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        jumpToMessage={jumpToMessage}
      />

      <ChatPinned messages={messages} jumpToMessage={jumpToMessage} />

      <div className={s.messages}>
        {loading && <p className={s.empty}>Loading messages…</p>}
        {!loading && messages.length === 0 && <p className={s.empty}>No messages yet. Say hello!</p>}
        {messages.map((m, i) => (
          <MessageBubble
            key={m._id ?? i}
            m={m}
            index={i}
            messages={messages}
            isMe={isMe}
            myId={myId}
            members={members}
            editingId={editingId}
            editingText={editingText}
            setEditingText={setEditingText}
            saveEdit={saveEdit}
            cancelEdit={cancelEdit}
            startEdit={startEdit}
            handleDelete={handleDelete}
            handleTogglePin={handleTogglePin}
            handleReact={handleReact}
            setReplyingTo={setReplyingTo}
            jumpToMessage={jumpToMessage}
            messageRefs={messageRefs}
            onImageClick={setLightboxSrc}
          />
        ))}
        {(() => {
          const last = [...messages].reverse().find(m => !m.deletedAt);
          if (!last) return null;
          const lastTime = new Date(last.createdAt).getTime();
          const seers = (reads || []).filter(r => {
            const uid = r.user?._id || r.user;
            if (!uid || uid === myId) return false;
            return new Date(r.lastReadAt).getTime() >= lastTime;
          });
          if (seers.length === 0) return null;
          return (
            <div className={s.seenRow}>
              <span>Seen</span>
              {seers.slice(0, 4).map(r => (
                <Avatar key={r.user?._id || r.user} name={r.user?.name} src={r.user?.avatar} size={14} />
              ))}
              {seers.length > 4 && <span>+{seers.length - 4}</span>}
            </div>
          );
        })()}
        <div ref={bottomRef} />
      </div>

      {typingUser && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
          {typingUser} is typing…
        </div>
      )}

      <ReplyPreview replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} />

      {(attachments.length > 0 || uploading) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 8px' }}>
          {attachments.map((att, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              {isImageAttachment(att) ? (
                <img src={att.url} alt="" onClick={() => setLightboxSrc(att.url)} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4, textAlign: 'center' }}>
                  <FileIcon size={16} />
                  <span style={{ fontSize: 9, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{att.name}</span>
                </div>
              )}
              <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} title="Remove"
                style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--text-2)' }}>
                <X size={11} />
              </button>
            </div>
          ))}
          {uploading && (
            <div style={{ width: 56, height: 56, borderRadius: 6, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-3)' }}>
              Uploading…
            </div>
          )}
        </div>
      )}

      <form className={s.inputRow} onSubmit={send}>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        <button type="button" className={s.sendBtn} title="Attach file"
          onClick={() => fileInputRef.current?.click()} disabled={uploading || attachments.length >= 6}>
          <Paperclip size={14} />
        </button>
        <MentionInput
          className={s.mentionWrap}
          inputClassName={s.input}
          placeholder={replyingTo ? `Reply to ${replyingTo.sender?.name || 'message'}…` : `Message ${workspace?.name || 'workspace'}… (use @ to mention)`}
          value={input}
          members={members}
          onChange={e => {
            setInput(e.target.value);
            const emitId = workspace?._id || workspaceId;
            if (emitId && user?.name && !typingEmitRef.current) {
              socket.emit('workspace_typing', { workspaceId: emitId, userName: user.name });
              typingEmitRef.current = setTimeout(() => { typingEmitRef.current = null; }, 2000);
            }
          }}
        />
        <EmojiPickerButton className={s.sendBtn} title="Insert emoji" onSelect={(emoji) => setInput(prev => prev + emoji)}>
          😊
        </EmojiPickerButton>
        <button type="submit" className={s.sendBtn} disabled={(!input.trim() && attachments.length === 0) || uploading} title="Send">
          <Send size={14} />
        </button>
      </form>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
