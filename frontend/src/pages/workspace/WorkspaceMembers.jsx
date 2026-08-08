// pages/Members.jsx
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { workspaces as wsApi } from '../../lib/api';
import { Avatar } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import s from '../../styles/modules/Members.module.css';

const ROLES = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'];
const ROLE_COLORS = { OWNER: 'var(--amber)', ADMIN: 'var(--indigo)', MEMBER: 'var(--green)', VIEWER: 'var(--text-3)' };

export default function WorkspaceMembers() {
  const { canEdit } = useOutletContext() || {};
  const { current: ws, setWorkspaces, workspaces } = useWorkspace();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' });
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  // Workspace settings
  const [wsName, setWsName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Determine current user's role in this workspace
  const myRole = members.find(m => m.user?._id === user?.id || m.user?._id === user?._id)?.role;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';
  const isOwner   = myRole === 'OWNER';

  useEffect(() => {
    if (!ws) return;
    setWsName(ws.name || '');
    setLoading(true);
    wsApi.members(ws._id)
      .then(({ data }) => setMembers(data.members ?? data))
      .catch(() => toast('Failed to load members', 'error'))
      .finally(() => setLoading(false));
  }, [ws?._id]);

  const handleRenameWs = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setRenameLoading(true);
    try {
      const { data } = await wsApi.update(ws._id, { name: wsName.trim() });
      // Update workspace name in store
      if (setWorkspaces && workspaces) {
        setWorkspaces(workspaces.map(w => w._id === ws._id ? { ...w, name: wsName.trim() } : w));
      }
      toast('Workspace renamed ✓', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to rename workspace', 'error');
    } finally { setRenameLoading(false); }
  };

  const handleDeleteWs = async () => {
    if (deleteConfirm !== ws.name) {
      toast('Type the workspace name exactly to confirm deletion', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      await wsApi.delete(ws._id);
      toast('Workspace deleted', 'info');
      navigate('/dashboard');
      window.location.reload(); // Force workspace store refresh
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to delete workspace', 'error');
      setDeleteLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      const { data } = await wsApi.updateRole(ws._id, userId, { role });
      setMembers(data.members ?? members.map(m => m.user?._id === userId ? { ...m, role } : m));
      toast('Role updated', 'success');
    } catch { toast('Failed to update role', 'error'); }
  };

  const handleRemove = async (userId, name) => {
    if (!(await confirm(`Remove ${name} from this workspace?`))) return;
    try {
      await wsApi.removeMember(ws._id, userId);
      setMembers(m => m.filter(mem => mem.user?._id !== userId));
      toast(`${name} removed`, 'info');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to remove member', 'error');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteLink('');
    try {
      const { data } = await wsApi.invite(ws._id, inviteForm);
      setInviteLink(data.inviteLink || '');
      toast('Invite generated!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to generate invite', 'error');
    } finally { setInviteLoading(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast('Link copied!', 'success');
  };

  const handleTransferOwnership = async () => {
    if (!transferTarget) return;
    if (!(await confirm(`Transfer ownership to ${transferTarget.user?.name}? You will become an ADMIN.`))) return;
    setTransferLoading(true);
    try {
      const { data } = await wsApi.transferOwnership(ws._id, { newOwnerId: transferTarget.user?._id });
      setMembers(data.members ?? members);
      setTransferModal(false);
      setTransferTarget(null);
      toast(`Ownership transferred to ${transferTarget.user?.name}`, 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to transfer ownership', 'error');
    } finally { setTransferLoading(false); }
  };

  if (!ws) return <div className={s.empty}>Select a workspace to manage members.</div>;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Members</h1>
          <p className={s.wsName}>{ws.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={() => setTransferModal(true)}>
              Transfer Ownership
            </Button>
          )}
          {canManage && (
            <Button variant="cyan" size="sm" onClick={() => { setInviteModal(true); setInviteLink(''); }}>
              + Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Member list */}
      <div className={s.list}>
        {loading && [1,2,3].map(i => (
          <div key={i} className={s.skeleton} />
        ))}
        {members.map(m => {
          const uid = m.user?._id;
          const isMe = uid === user?.id || uid === user?._id;
          const isOwner = m.role === 'OWNER';
          return (
            <div key={uid} className={s.memberCard}>
              <Avatar name={m.user?.name || '?'} src={m.user?.avatar} size={40} />
              <div className={s.memberInfo}>
                <div className={s.nameRow}>
                  <strong className={s.name}>{m.user?.name || 'Unknown'}</strong>
                  {isMe && <span className={s.youBadge}>You</span>}
                </div>
                <span className={s.email}>{m.user?.email || ''}</span>
              </div>
              <div className={s.roleSection}>
                {canManage && !isOwner && !isMe ? (
                  <select
                    className={s.roleSelect}
                    value={m.role}
                    onChange={e => handleRoleChange(uid, e.target.value)}
                    style={{ '--rc': ROLE_COLORS[m.role] || 'var(--text-3)' }}
                  >
                    {ROLES.filter(r => r !== 'OWNER').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className={s.roleBadge} style={{ '--rc': ROLE_COLORS[m.role] || 'var(--text-3)' }}>
                    {m.role}
                  </span>
                )}
              </div>
              {canManage && !isOwner && !isMe && (
                <button className={s.removeBtn} onClick={() => handleRemove(uid, m.user?.name)} title="Remove member">
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Member" size="sm">
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Email address" type="email" placeholder="teammate@company.com"
            value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required />
          <Select label="Role" value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
            options={['VIEWER', 'MEMBER', 'ADMIN']} />
          <Button type="submit" variant="cyan" size="md" loading={inviteLoading}>
            Generate Invite Link
          </Button>
        </form>

        {inviteLink && (
          <div className={s.inviteLinkBox}>
            <p className={s.inviteLinkLabel}>Share this link (expires in 24h):</p>
            <div className={s.linkRow}>
              <code className={s.link}>{inviteLink}</code>
              <button className={s.copyBtn} onClick={copyLink}>Copy</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer Ownership modal */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="Transfer Workspace Ownership" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Select a member to become the new <strong>OWNER</strong>. You will become an <strong>ADMIN</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members
              .filter(m => m.role !== 'OWNER')
              .map(m => (
                <button
                  key={m.user?._id || m.user}
                  onClick={() => setTransferTarget(m)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${transferTarget?.user?._id === m.user?._id ? 'var(--indigo)' : 'var(--border)'}`,
                    background: transferTarget?.user?._id === m.user?._id ? 'rgba(99,102,241,0.12)' : 'var(--bg-2)',
                    color: 'var(--text-1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <Avatar name={m.user?.name || '?'} src={m.user?.avatar} size={28} />
                  <div>
                    <strong>{m.user?.name}</strong>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}>{m.role}</span>
                  </div>
                </button>
              ))
            }
          </div>
          <Button
            variant="danger"
            size="md"
            loading={transferLoading}
            disabled={!transferTarget}
            onClick={handleTransferOwnership}
          >
            Transfer to {transferTarget?.user?.name || '…'}
          </Button>
        </div>
      </Modal>

      {/* ── Workspace Settings (OWNER only) ─────────────────────────── */}
      {isOwner && (
        <div className={s.dangerZone}>
          <h3 className={s.dangerTitle}>⚙ Workspace Settings</h3>

          {/* Rename */}
          <div className={s.settingBlock}>
            <h4 className={s.settingLabel}>Rename Workspace</h4>
            <form onSubmit={handleRenameWs} className={s.settingRow}>
              <Input
                value={wsName}
                onChange={e => setWsName(e.target.value)}
                placeholder={ws.name}
                required
              />
              <Button type="submit" variant="ghost" size="sm" loading={renameLoading}>
                Save
              </Button>
            </form>
          </div>

          {/* Delete */}
          <div className={s.settingBlock}>
            <h4 className={s.settingLabel} style={{ color: 'var(--status-danger)' }}>⚠ Delete Workspace</h4>
            <p className={s.settingHint}>
              This permanently deletes <strong>{ws.name}</strong> and all its projects, tasks, wiki pages, and snippets. Type the workspace name to confirm.
            </p>
            <div className={s.settingRow}>
              <Input
                placeholder={`Type "${ws.name}" to confirm`}
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
              <Button
                variant="danger"
                size="sm"
                loading={deleteLoading}
                disabled={deleteConfirm !== ws.name}
                onClick={handleDeleteWs}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
