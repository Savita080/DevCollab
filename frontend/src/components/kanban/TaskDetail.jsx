// components/kanban/TaskDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useTasks, TASK_COLUMNS } from '../../store/tasks';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { tasks as tasksApi, workspaces as wsApi } from '../../lib/api';
import socket from '../../lib/socket';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import MentionInput from '../ui/MentionInput';
import EmojiPickerButton from '../ui/EmojiPickerButton';
import ReactionBar from '../ui/ReactionBar';
import { ReplyButton, QuoteChip, ReplyPreview } from '../ui/ReplyControls';
import rs from '../../styles/modules/ReplyControls.module.css';
import { PriorityChip, Avatar } from '../ui/Badge';
import { fmtDate, fmtRelative, fmtBytes, taskAssigneeIds, taskAssignees } from '../../lib/utils';
import MultiAssigneeSelect from './MultiAssigneeSelect';
import { uploadImage, uploadFile, isImage, MAX_FILE_BYTES, MAX_ATTACHMENT_BYTES } from '../../lib/upload';
import ImageLightbox from '../ui/ImageLightbox';
import { ImagePlus, X as XIcon, File as FileIcon } from 'lucide-react';
import s from '../../styles/modules/TaskDetail.module.css';

// Old records (pre-R2 migration) have no `kind` field but are always images —
// fall back to the presence of width/height to tell them apart from files.
const isImageAttachment = (att) => att.kind === 'image' || (!att.kind && (att.width || att.height));

export default function TaskDetail({ task, onClose, wsMembers = [], mentionMembers, canEdit = true }) {
  const storeTasks = useTasks(state => state.tasks);
  const currentTask = storeTasks.find(t => t._id === task._id) || task;

  // Mentions in task comments are scoped to project members only — fall back to
  // wsMembers if a project-scoped list wasn't provided (legacy callers).
  const mentionPool = mentionMembers ?? wsMembers;
  const { update, delete: deleteTask } = useTasks();
  const { current: ws, currentProject } = useWorkspace();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: currentTask.title,
    description: currentTask.description || '',
    priority: currentTask.priority || 'P1',
    status: currentTask.status || 'To Do',
    assignees: taskAssigneeIds(currentTask),
    dueDate: currentTask.dueDate ? currentTask.dueDate.slice(0, 10) : '',
    labels: currentTask.labels?.join(', ') || '',
    attachments: currentTask.attachments || [],
  });
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const fileInputRef = useRef(null);
  const commentsEndRef = useRef(null);
  const commentRefs = useRef({});

  // Upload picked images and append to the edit form's attachment list.
  const handleAttachFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files.slice(0, 10)) {
        if (isImage(file)) {
          if (file.size > MAX_FILE_BYTES) { toast(`${file.name}: image is too large (max 10MB)`, 'error'); continue; }
          const att = await uploadImage(file);
          setForm(f => ({ ...f, attachments: [...(f.attachments || []), { url: att.url, name: file.name, width: att.width, height: att.height, kind: 'image' }].slice(0, 10) }));
        } else {
          if (file.size > MAX_ATTACHMENT_BYTES) { toast(`${file.name}: file is too large (max 50MB)`, 'error'); continue; }
          const att = await uploadFile(file);
          setForm(f => ({ ...f, attachments: [...(f.attachments || []), { url: att.url, name: att.name, size: att.size, mimeType: att.mimeType, kind: 'file' }].slice(0, 10) }));
        }
      }
    } catch (err) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Sync form state when the current task updates in store (e.g. edited elsewhere or saved)
  useEffect(() => {
    setForm({
      title: currentTask.title,
      description: currentTask.description || '',
      priority: currentTask.priority || 'P1',
      status: currentTask.status || 'To Do',
      assignees: taskAssigneeIds(currentTask),
      dueDate: currentTask.dueDate ? currentTask.dueDate.slice(0, 10) : '',
      labels: currentTask.labels?.join(', ') || '',
    });
  }, [currentTask]);

  // Load existing comments on mount
  useEffect(() => {
    tasksApi.comments(currentTask._id)
      .then(({ data }) => setComments(data.comments ?? data))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [currentTask._id]);

  // Live: listen for comments added/deleted in this project room
  useEffect(() => {
    const onAdded = (c) => {
      if (c.task === currentTask._id || c.task?._id === currentTask._id) {
        setComments(prev => [...prev, c]);
      }
    };
    const onDeleted = ({ commentId, taskId }) => {
      if (taskId === currentTask._id || taskId?.toString() === currentTask._id) {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    };
    const onReaction = ({ commentId, reactions }) => {
      setComments(prev => prev.map(c => c._id === commentId ? { ...c, reactions } : c));
    };
    socket.on('task_comment_added', onAdded);
    socket.on('task_comment_deleted', onDeleted);
    socket.on('comment_reaction_updated', onReaction);
    return () => {
      socket.off('task_comment_added', onAdded);
      socket.off('task_comment_deleted', onDeleted);
      socket.off('comment_reaction_updated', onReaction);
    };
  }, [currentTask._id]);

  // Scroll to bottom when comments update
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSave = async () => {
    try {
      const parsedLabels = form.labels.split(',').map(l => l.trim()).filter(Boolean);
      const payload = { ...form, labels: parsedLabels };

      // form.assignees is the authoritative array (may be empty = unassign).
      if (!payload.dueDate) payload.dueDate = null;

      await update(ws._id, currentProject._id, currentTask._id, payload);
      toast('Task updated', 'success');
      setEditing(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to update task';
      toast(msg, 'error');
    }
  };

  const handleDelete = async () => {
    if (!(await confirm('Delete this task?'))) return;
    await deleteTask(ws._id, currentProject._id, currentTask._id);
    toast('Task deleted', 'info');
    onClose();
  };

  // Detect @mentions — NOTE: backend handles notifications automatically when comment is created
  // We keep this as a no-op to avoid double notifications
  const detectMentions = async (_content) => {};

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const replyToId = replyingTo?._id;
    try {
      const { data } = await tasksApi.comment(currentTask._id, {
        content: comment,
        projectId: currentProject._id,
        ...(replyToId ? { replyTo: replyToId } : {}),
      });
      const newComment = data.comment ?? data;
      // Optimistically add if socket doesn't fire for self
      setComments(prev => {
        const exists = prev.some(c => c._id === newComment._id);
        return exists ? prev : [...prev, newComment];
      });
      await detectMentions(comment);
      setComment('');
      setReplyingTo(null);
    } catch {
      toast('Failed to post comment', 'error');
    }
  };

  const jumpToComment = (commentId) => {
    const el = commentRefs.current[commentId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(rs.highlight);
    setTimeout(() => el.classList.remove(rs.highlight), 1500);
  };

  // Esc cancels active reply
  useEffect(() => {
    if (!replyingTo) return;
    const onKey = (e) => { if (e.key === 'Escape') setReplyingTo(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replyingTo]);

  const handleDeleteComment = async (commentId) => {
    try {
      await tasksApi.deleteComment(currentTask._id, commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch {
      toast('Failed to delete comment', 'error');
    }
  };

  const myId = user?.id || user?._id;
  const handleReactComment = async (commentId, emoji) => {
    setComments(prev => prev.map(c => {
      if (c._id !== commentId) return c;
      const reactions = [...(c.reactions || [])];
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
      return { ...c, reactions };
    }));
    try { await tasksApi.reactComment(currentTask._id, commentId, emoji, currentProject?._id); }
    catch { toast('Failed to react', 'error'); }
  };

  return (
    <Modal open onClose={onClose} title="Task Detail" size="lg">
      <div className={s.body}>
        {/* Title */}
        {editing && canEdit ? (
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        ) : (
          <h2 className={s.title}>{currentTask.title}</h2>
        )}

        {/* Meta row */}
        <div className={s.meta}>
          <PriorityChip priority={currentTask.priority} />
          <span className={s.status}>{currentTask.status}</span>
          {currentTask.dueDate && <span className={s.due}>Due {fmtDate(currentTask.dueDate)}</span>}
          {currentTask.labels?.length > 0 && (
            <div className={s.labels}>
              {currentTask.labels.map(l => <span key={l} className={s.label}>{l}</span>)}
            </div>
          )}
        </div>

        {/* Assignees (read view) */}
        {!editing && (() => {
          const assignees = taskAssignees(currentTask).map(a => {
            if (a.name) return a;
            const m = wsMembers.find(m => m.user?._id === (a._id || a));
            return m ? { _id: m.user._id, name: m.user.name, avatar: m.user.avatar } : a;
          });
          return (
            <div className={s.section}>
              <span className={s.sLabel}>Assignees</span>
              {assignees.length === 0 ? (
                <p className={s.desc}><em>Unassigned</em></p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {assignees.map((u, i) => (
                    <span key={u._id || i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-2, rgba(0,0,0,0.05))', borderRadius: 999, padding: '3px 10px 3px 3px' }}>
                      <Avatar name={u.name} src={u.avatar} size={22} />
                      <span style={{ fontSize: 13 }}>{u.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Description */}
        <div className={s.section}>
          <span className={s.sLabel}>Description</span>
          {editing && canEdit ? (
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          ) : (
            <p className={s.desc}>{currentTask.description || <em>No description</em>}</p>
          )}
        </div>

        {/* Attachments (images + files) */}
        {(() => {
          const atts = editing ? (form.attachments || []) : (currentTask.attachments || []);
          if (!editing && atts.length === 0) return null;
          return (
            <div className={s.section}>
              <span className={s.sLabel}>Attachments</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {atts.map((att, idx) => (
                  <div key={idx} style={{ position: 'relative', lineHeight: 0 }}>
                    {isImageAttachment(att) ? (
                      <img src={att.url} alt={att.name || 'attachment'} onClick={() => setLightboxSrc(att.url)} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
                    ) : (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        download={att.name}
                        title={att.size != null ? fmtBytes(att.size) : undefined}
                        style={{ width: 96, height: 96, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6, textAlign: 'center', textDecoration: 'none', color: 'inherit' }}
                      >
                        <FileIcon size={20} />
                        <span style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{att.name || 'file'}</span>
                        {att.size != null && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{fmtBytes(att.size)}</span>}
                      </a>
                    )}
                    {editing && canEdit && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }))}
                        title="Remove"
                        style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--text-2)' }}
                      >
                        <XIcon size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {editing && canEdit && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => { handleAttachFiles(e.target.files); e.target.value = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || (form.attachments?.length || 0) >= 10}
                      title="Add attachment"
                      style={{ width: 96, height: 96, borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11 }}
                    >
                      <ImagePlus size={18} />
                      {uploading ? 'Uploading…' : 'Add'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Edit fields */}
        {editing && canEdit && (
          <div className={s.editFields}>
            <Select label="Priority" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={['P0', 'P1', 'P2']} />
            <Select label="Status" value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={TASK_COLUMNS.map(c => ({ value: c.key, label: c.label }))} />
            <Input label="Due date" type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            <Input label="Labels (comma separated)" placeholder="frontend, bug, auth"
              value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} />
            {/* Assignees (multiple) */}
            <MultiAssigneeSelect
              members={wsMembers}
              value={form.assignees}
              onChange={(next) => setForm(f => ({ ...f, assignees: next }))}
            />
          </div>
        )}

        {/* Actions — viewers can read but not edit/delete */}
        {canEdit && (
          <div className={s.actions}>
            {editing ? (
              <>
                <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
              </>
            )}
          </div>
        )}

        {/* Comments */}
        <div className={s.section}>
          <span className={s.sLabel}>
            Comments ({comments.length})
            <span className={s.liveDot} title="Live" />
          </span>
          <div className={s.comments}>
            {loadingComments && <p className={s.loading}>Loading comments…</p>}
            {!loadingComments && comments.length === 0 && (
              <p className={s.noComments}>No comments yet. Be the first!</p>
            )}
            {comments.map((c) => (
              <div
                key={c._id}
                ref={el => { if (c._id) commentRefs.current[c._id] = el; }}
                className={s.comment}
              >
                <Avatar name={c.author?.name || 'U'} src={c.author?.avatar} size={26} />
                <div className={s.commentBody}>
                  <div className={s.commentHeader}>
                    <strong className={s.commenter}>{c.author?.name || 'Someone'}</strong>
                    <span className={s.commentTime}>{fmtRelative(c.createdAt)}</span>
                    {(c.author?._id === user?.id || c.author === user?.id) && (
                      <button className={s.deleteCommentBtn} onClick={() => handleDeleteComment(c._id)} title="Delete">✕</button>
                    )}
                  </div>
                  <QuoteChip replyTo={c.replyTo} mine={false} onJump={jumpToComment} />
                  <p className={s.commentText}>{c.content}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ReactionBar
                      reactions={c.reactions}
                      currentUserId={myId}
                      members={mentionPool}
                      onToggle={(emoji) => handleReactComment(c._id, emoji)}
                    />
                    <ReplyButton onClick={() => setReplyingTo(c)} />
                  </div>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
          <ReplyPreview replyingTo={replyingTo} onCancel={() => setReplyingTo(null)} />
          <form onSubmit={submitComment} className={s.commentForm}>
            <MentionInput
              placeholder={replyingTo ? `Reply to ${replyingTo.author?.name || 'comment'}…` : 'Add a comment… use @ to mention someone'}
              value={comment}
              members={mentionPool}
              onChange={e => setComment(e.target.value)}
            />
            <EmojiPickerButton
              title="Insert emoji"
              onSelect={(emoji) => setComment(prev => prev + emoji)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, padding: '0 6px' }}
            >
              😊
            </EmojiPickerButton>
            <Button type="submit" variant="ghost" size="sm">Post</Button>
          </form>
        </div>

        {/* Created-by footer */}
        {(() => {
          const creator = currentTask.createdBy;
          const creatorName = creator?.name
            || wsMembers.find(m => m.user?._id === (creator?._id || creator))?.user?.name;
          if (!creatorName && !currentTask.createdAt) return null;
          return (
            <div className={s.createdFooter} style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {creator && <Avatar name={creatorName || 'U'} src={creator?.avatar} size={18} />}
              <span>
                Created {creatorName ? <>by <strong style={{ color: 'var(--text-2)' }}>{creatorName}</strong></> : null}
                {currentTask.createdAt && <> on {fmtDate(currentTask.createdAt)}</>}
              </span>
            </div>
          );
        })()}
      </div>
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </Modal>
  );
}
