// pages/project/ProjectChat.jsx — project-level chat (no whiteboard, no ws chat)
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Send, Pencil, Trash2, Check, X, Pin, PinOff, Search, ImagePlus } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { useScopedPresence } from '../../lib/hooks';
import { chat as chatApi, projects as projectsApi, tasks as tasksApi } from '../../lib/api';
import { useChat } from '../../store/chat';
import { Avatar } from '../../components/ui/Badge';
import MentionInput from '../../components/ui/MentionInput';
import MessageBody from '../../components/ui/MessageBody';
import EmojiPickerButton from '../../components/ui/EmojiPickerButton';
import ReactionBar from '../../components/ui/ReactionBar';
import { ReplyButton, QuoteChip, ReplyPreview } from '../../components/ui/ReplyControls';
import rs from '../../styles/modules/ReplyControls.module.css';
import { fmtRelative } from '../../lib/utils';
import { emitTyping } from '../../lib/socket';
import socket from '../../lib/socket';
import { uploadImage, isImage } from '../../lib/upload';
import ImageLightbox from '../../components/ui/ImageLightbox';
import s from '../../styles/modules/Chat.module.css';
import ChatHeader from '../../components/chat/ChatHeader';
import ChatPinned from '../../components/chat/ChatPinned';
import MessageBubble from '../../components/chat/MessageBubble';


export default function ProjectChat() {
  const { workspaceId, projectId, project, projectMembers } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useUI();
  const clearUnread = useChat(s => s.clear);
  // Scoped presence: only people viewing THIS chat (not the whole project).
  // Keyed by canonical _id, not the URL token (which may be a slug).
  const online = useScopedPresence(project?._id ? `chat:${project._id}` : null);

  // Seed members from the layout (it already fetched them) so we don't re-request
  // the same endpoint on every project switch. Members are only used for @mention
  // autocomplete — messages render fine without them.
  const [members, setMembers] = useState(projectMembers || []);
  const [messages, setMessages] = useState([]);
  const [reads, setReads] = useState([]); // [{ user: {_id,name,avatar}, lastReadAt }]
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // { _id, content, sender }
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ url, width, height }]
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitRef = useRef(null);
  const bottomRef = useRef(null);
  const messageRefs = useRef({}); // msgId → DOM node, for jump-to-original

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    chatApi.projectMessages(workspaceId, projectId)
      .then(({ data }) => {
        setMessages(data.messages ?? data ?? []);
        setReads(data.reads ?? []);
      })
      .catch(() => toast('Failed to load chat', 'error'))
      .finally(() => setLoading(false));

    // Members come from the layout via context (already fetched). Only fetch
    // here as a fallback if the context list is empty — avoids a duplicate
    // round-trip on every project switch.
    if (!projectMembers || projectMembers.length === 0) {
      projectsApi.members(workspaceId, projectId)
        .then(({ data }) => setMembers(data.members ?? []))
        .catch(() => setMembers([]));
    }
  }, [workspaceId, projectId]);

  // Keep members in sync if the layout's list arrives/changes after mount.
  useEffect(() => {
    if (projectMembers && projectMembers.length) setMembers(projectMembers);
  }, [projectMembers]);

  // Realtime new messages. Socket events use the project's canonical _id, but
  // projectId from useParams may be a slug — compare against project._id.
  useEffect(() => {
    if (!projectId) return;
    const canonicalId = project?._id;
    const onNew = (msg) => {
      const msgProj = msg.project?._id || msg.project;
      if (msgProj !== canonicalId && msgProj !== projectId) return;
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        const senderId = msg.sender?._id || msg.sender;
        const tempIdx = prev.findIndex(m => m._optimistic && m.content === msg.content && (m.sender?._id || m.sender) === senderId);
        if (tempIdx !== -1) {
          const next = [...prev];
          next[tempIdx] = msg;
          return next;
        }
        return [...prev, msg];
      });
    };
    const onReaction = ({ scope, messageId, reactions }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };
    const onEdited = ({ scope, message }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    };
    const onDeleted = ({ scope, messageId }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: '' } : m));
    };
    const onPinned = ({ scope, message }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    };
    const onLinkPreview = ({ scope, messageId, linkPreview }) => {
      if (scope !== 'project') return;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, linkPreview } : m));
    };
    const onRead = ({ scope, projectId: pid, user: u, lastReadAt }) => {
      if (scope !== 'project' || (pid !== canonicalId && pid !== projectId)) return;
      setReads(prev => {
        const idx = prev.findIndex(r => (r.user?._id || r.user) === (u?._id || u));
        const entry = { user: u, lastReadAt };
        if (idx === -1) return [...prev, entry];
        const next = [...prev];
        next[idx] = entry;
        return next;
      });
    };
    const onTyping = ({ projectId: pid, userName }) => {
      if ((pid === canonicalId || pid === projectId) && userName !== user?.name) {
        setTypingUser(userName);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };
    socket.on('new_group_message', onNew);
    socket.on('message_reaction_updated', onReaction);
    socket.on('user_typing', onTyping);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    socket.on('chat_read', onRead);
    socket.on('message_pinned', onPinned);
    socket.on('message_link_preview', onLinkPreview);
    return () => {
      socket.off('new_group_message', onNew);
      socket.off('message_reaction_updated', onReaction);
      socket.off('user_typing', onTyping);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('chat_read', onRead);
      socket.off('message_pinned', onPinned);
      socket.off('message_link_preview', onLinkPreview);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [projectId, project?._id, user?.name]);

  // Scroll to bottom when messages change. On initial load (loading just became
  // false) use 'instant' so we jump straight to the bottom without animating
  // through the entire history. For new incoming messages use 'smooth'.
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (!bottomRef.current) return;
    const isInitialLoad = prevLengthRef.current === 0 && messages.length > 1;
    prevLengthRef.current = messages.length;
    // Wait one animation frame so the browser has painted all message elements
    // before we measure their positions and scroll.
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: isInitialLoad ? 'instant' : 'smooth',
      });
    });
  }, [messages.length]);

  // Mark chat as read when this page is open + tab focused. Debounced so a
  // burst of incoming messages only triggers one POST. Re-runs on each new
  // message so the seen-by row stays current as the conversation scrolls.
  useEffect(() => {
    if (!workspaceId || !projectId || loading || messages.length === 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const t = setTimeout(() => {
      chatApi.markProjectRead(workspaceId, projectId).catch(() => {});
      if (project?._id) clearUnread(project._id);
    }, 500);
    return () => clearTimeout(t);
  }, [workspaceId, projectId, loading, messages.length, project?._id]);

  // Upload picked image files, appending results to the pending attachment strip.
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(isImage);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files.slice(0, 6)) {
        const att = await uploadImage(file);
        setAttachments(prev => [...prev, att].slice(0, 6));
      }
    } catch (err) {
      toast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    const pendingAtts = attachments;
    // Need text OR at least one image.
    if (!text && pendingAtts.length === 0) return;
    const replyTo = replyingTo;
    const replyToId = replyTo?._id;
    setInput('');
    setReplyingTo(null);
    setAttachments([]);

    // Slash command: /task <title> creates a Kanban task and posts a chat
    // record with a link to the new card. Priority hint: trailing !p0/!p1/!p2.
    // (Slash commands are text-only — ignore any attached images here.)
    const taskMatch = text.match(/^\/task\s+(.+)$/i);
    if (taskMatch) {
      let title = taskMatch[1].trim();
      let priority = 'P2';
      const pri = title.match(/\s+!(p[012])\s*$/i);
      if (pri) {
        priority = pri[1].toUpperCase();
        title = title.slice(0, pri.index).trim();
      }
      try {
        const { data } = await tasksApi.create(workspaceId, projectId, { title, priority });
        const task = data.task ?? data;
        const taskUrl = `/workspaces/${workspaceId}/projects/${projectId}/kanban`;
        await chatApi.sendProject(workspaceId, projectId, {
          content: `📌 Created task: **${title}** (${priority}) → [open kanban](${window.location.origin}${taskUrl}) · id: ${task._id}`,
        });
        toast(`Task "${title}" created`, 'success');
      } catch {
        setInput(text);
        toast('Failed to create task', 'error');
      }
      return;
    }

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      _id: tempId,
      _optimistic: true,
      content: text,
      attachments: pendingAtts,
      sender: { _id: user?.id || user?._id, name: user?.name, avatar: user?.avatar },
      createdAt: new Date().toISOString(),
      reactions: [],
      ...(replyTo ? { replyTo: { _id: replyTo._id, content: replyTo.content, sender: replyTo.sender } } : {}),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const { data } = await chatApi.sendProject(workspaceId, projectId, {
        content: text,
        ...(pendingAtts.length ? { attachments: pendingAtts } : {}),
        ...(replyToId ? { replyTo: replyToId } : {}),
      });
      const msg = data.chatMessage ?? data;
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

  // Jump to + flash-highlight an original message when its quote chip is clicked.
  const jumpToMessage = (msgId) => {
    const el = messageRefs.current[msgId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(rs.highlight);
    setTimeout(() => el.classList.remove(rs.highlight), 1500);
  };

  // Esc cancels the active reply
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

  const myId = user?.id || user?._id;
  const handleReact = async (msgId, emoji) => {
    // Optimistic update — server broadcast will reconcile
    setMessages(prev => prev.map(m => {
      if (m._id !== msgId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx === -1) {
        reactions.push({ emoji, users: [myId] });
      } else {
        const users = reactions[idx].users || [];
        const has = users.some(u => (u?._id || u)?.toString() === myId?.toString());
        const next = has ? users.filter(u => (u?._id || u)?.toString() !== myId?.toString()) : [...users, myId];
        if (next.length === 0) reactions.splice(idx, 1);
        else reactions[idx] = { ...reactions[idx], users: next };
      }
      return { ...m, reactions };
    }));
    try { await chatApi.reactProject(workspaceId, projectId, msgId, emoji); }
    catch { toast('Failed to react', 'error'); }
  };

  const startEdit = (m) => {
    setEditingId(m._id);
    setEditingText(m.content);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };
  const saveEdit = async () => {
    const text = editingText.trim();
    if (!text || !editingId) return cancelEdit();
    const id = editingId;
    const original = messages.find(m => m._id === id);
    if (!original || original.content === text) return cancelEdit();
    setMessages(prev => prev.map(m => m._id === id ? { ...m, content: text, editedAt: new Date().toISOString() } : m));
    setEditingId(null);
    setEditingText('');
    try { await chatApi.editProject(workspaceId, projectId, id, text); }
    catch {
      setMessages(prev => prev.map(m => m._id === id ? original : m));
      toast('Failed to edit', 'error');
    }
  };
  const handleTogglePin = async (msg) => {
    const id = msg._id;
    const wasPinned = !!msg.pinned;
    setMessages(prev => prev.map(m => m._id === id ? { ...m, pinned: !wasPinned, pinnedAt: !wasPinned ? new Date().toISOString() : null } : m));
    try { await chatApi.togglePin(workspaceId, projectId, id); }
    catch {
      setMessages(prev => prev.map(m => m._id === id ? { ...m, pinned: wasPinned } : m));
      toast('Failed to pin', 'error');
    }
  };
  const handleDelete = async (msgId) => {
    if (!confirm('Delete this message?')) return;
    const original = messages.find(m => m._id === msgId);
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deletedAt: new Date().toISOString(), content: '' } : m));
    try { await chatApi.deleteProject(workspaceId, projectId, msgId); }
    catch {
      if (original) setMessages(prev => prev.map(m => m._id === msgId ? original : m));
      toast('Failed to delete', 'error');
    }
  };

  return (
    <div className={s.page}>
      <ChatHeader
        project={project}
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
          // Show "Seen by" avatars for users who've read past the latest message.
          // Skip self; only show when there's a latest message.
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, padding: '0 8px 4px', fontSize: 10, color: 'var(--text-3)' }}>
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

      {/* Pending image attachments */}
      {(attachments.length > 0 || uploading) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '6px 8px' }}>
          {attachments.map((att, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <img src={att.url} alt="" onClick={() => setLightboxSrc(att.url)} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                title="Remove"
                style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--text-2)' }}
              >
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        <button
          type="button"
          className={s.sendBtn}
          title="Attach image"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || attachments.length >= 6}
        >
          <ImagePlus size={14} />
        </button>
        <MentionInput
          className={s.mentionWrap}
          inputClassName={s.input}
          placeholder={replyingTo ? `Reply to ${replyingTo.sender?.name || 'message'}…` : `Message ${project?.name || 'project'}… (@ to mention, /task to create)`}
          value={input}
          members={members}
          onChange={e => {
            setInput(e.target.value);
            if (project?._id && user?.name && !typingEmitRef.current) {
              emitTyping(project._id, user.name);
              typingEmitRef.current = setTimeout(() => { typingEmitRef.current = null; }, 2000);
            }
          }}
        />
        <EmojiPickerButton
          className={s.sendBtn}
          title="Insert emoji"
          onSelect={(emoji) => setInput(prev => prev + emoji)}
        >
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
