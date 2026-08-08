// components/ProjectMembersModal.jsx
import { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Avatar } from './ui/Badge';
import { workspaces as wsApi, projects as projApi } from '../lib/api';
import { useUI } from '../store/ui';
import s from './ProjectMembersModal.module.css';

const WS_ROLE_COLORS = {
  OWNER:  'var(--amber)',
  ADMIN:  'var(--indigo)',
  MEMBER: 'var(--green)',
  VIEWER: 'var(--text-3)',
};

const PROJ_ROLE_COLORS = {
  CONTRIBUTOR: 'var(--cyan)',
  VIEWER:      'var(--violet)',
};

export default function ProjectMembersModal({ open, onClose, workspace, project, currentUserId, workspaceRole }) {
  const { toast, confirm } = useUI();
  const creatorId = project?.createdBy?._id || project?.createdBy;
  const isWsAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const iAmCreator = !!(creatorId && currentUserId && creatorId.toString() === currentUserId.toString());
  // Removal is restricted to the project creator and workspace OWNER/ADMIN.
  // Contributors can add members but not kick them. Anyone may remove themselves.
  const canRemove = (uid) => {
    if (uid && currentUserId && uid.toString() === currentUserId.toString()) return true;
    return isWsAdmin || iAmCreator;
  };

  const [projMembers, setProjMembers] = useState([]);   // current project members (populated)
  const [wsMembers,   setWsMembers]   = useState([]);   // all workspace members (populated)
  const [search,      setSearch]      = useState('');
  const [addingId,    setAddingId]    = useState(null); // userId being added
  const [addRole,     setAddRole]     = useState({});   // { [userId]: role }
  const [removingId,  setRemovingId]  = useState(null);
  const [loading,     setLoading]     = useState(false);

  // ── Fetch project members ────────────────────────────────────────────────
  const loadProjMembers = useCallback(async () => {
    if (!workspace?._id || !project?._id) return;
    setLoading(true);
    try {
      const { data } = await projApi.members(workspace._id, project._id);
      setProjMembers(data.members ?? []);
    } catch {
      toast('Could not load project members', 'error');
    } finally {
      setLoading(false);
    }
  }, [workspace?._id, project?._id]);

  // ── Fetch workspace members ──────────────────────────────────────────────
  useEffect(() => {
    if (!open || !workspace?._id) return;
    wsApi.members(workspace._id)
      .then(({ data }) => setWsMembers(data.members ?? []))
      .catch(() => {});
    loadProjMembers();
    setSearch('');
  }, [open, workspace?._id, project?._id]);

  // ── Derived: who's NOT in the project yet ───────────────────────────────
  const projMemberIds = new Set(projMembers.map(m => m.user?._id));
  const eligible = wsMembers.filter(m => {
    const uid = m.user?._id;
    if (!uid || projMemberIds.has(uid)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q)
    );
  });

  // ── Add member ───────────────────────────────────────────────────────────
  const handleAdd = async (wsm) => {
    const uid = wsm.user?._id;
    const role = addRole[uid] || 'VIEWER';
    setAddingId(uid);
    try {
      await projApi.addMember(workspace._id, project._id, { userId: uid, role });
      toast(`${wsm.user?.name} added as ${role}`, 'success');
      await loadProjMembers();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to add member', 'error');
    } finally {
      setAddingId(null);
    }
  };

  // ── Remove member ────────────────────────────────────────────────────────
  const handleRemove = async (pm) => {
    const uid = pm.user?._id;
    if (!(await confirm(`Remove ${pm.user?.name} from this project?`))) return;
    setRemovingId(uid);
    try {
      await projApi.removeMember(workspace._id, project._id, uid);
      toast(`${pm.user?.name} removed`, 'info');
      setProjMembers(prev => prev.filter(m => m.user?._id !== uid));
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to remove member', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  if (!project) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Project Members — ${project.name}`} size="md">
      <div className={s.wrap}>

        {/* ── Current Project Members ─────────────────────────────── */}
        <section className={s.section}>
          <div className={s.sectionHeader}>
            <span className={s.sectionTitle}>CURRENT MEMBERS</span>
            <span className={s.pill}>{projMembers.length}</span>
          </div>

          {loading && (
            <div className={s.skelWrap}>
              {[1,2].map(i => <div key={i} className={s.skel} />)}
            </div>
          )}

          {!loading && projMembers.length === 0 && (
            <p className={s.empty}>No members yet. Add someone below.</p>
          )}

          {!loading && projMembers.map(pm => {
            const uid      = pm.user?._id;
            const isMe     = uid === currentUserId;
            const isCreator = !!(creatorId && uid && uid.toString() === creatorId.toString());
            return (
              <div key={uid} className={s.row}>
                <Avatar name={pm.user?.name || '?'} src={pm.user?.avatar} size={34} />
                <div className={s.info}>
                  <span className={s.name}>
                    {pm.user?.name || 'Unknown'}
                    {isMe && <span className={s.youBadge}>You</span>}
                  </span>
                  <span className={s.email}>{pm.user?.email || ''}</span>
                </div>
                <span
                  className={s.roleChip}
                  style={{ '--c': PROJ_ROLE_COLORS[pm.role] || 'var(--text-3)' }}
                >
                  {pm.role}
                </span>
                {isCreator && (
                  <span className={s.youBadge} title="Project creator">Creator</span>
                )}
                {!isMe && canRemove(uid) && (
                  <button
                    className={s.removeBtn}
                    onClick={() => handleRemove(pm)}
                    disabled={removingId === uid}
                  >
                    {removingId === uid ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {/* ── Divider ─────────────────────────────────────────────── */}
        <div className={s.divider} />

        {/* ── Add Workspace Members ────────────────────────────────── */}
        <section className={s.section}>
          <div className={s.sectionHeader}>
            <span className={s.sectionTitle}>ADD WORKSPACE MEMBERS</span>
          </div>

          {/* Search */}
          <div className={s.searchWrap}>
            <svg className={s.searchIcon} width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className={s.searchInput}
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className={s.clearSearch} onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Eligible list */}
          <div className={s.eligibleList}>
            {eligible.length === 0 && (
              <p className={s.empty}>
                {search ? 'No matching workspace members.' : 'All workspace members are already in this project.'}
              </p>
            )}
            {eligible.map(wsm => {
              const uid = wsm.user?._id;
              const selectedRole = addRole[uid] || 'VIEWER';
              return (
                <div key={uid} className={s.row}>
                  <Avatar name={wsm.user?.name || '?'} src={wsm.user?.avatar} size={34} />
                  <div className={s.info}>
                    <span className={s.name}>{wsm.user?.name || 'Unknown'}</span>
                    <span className={s.wsBadge} style={{ '--c': WS_ROLE_COLORS[wsm.role] || 'var(--text-3)' }}>
                      {wsm.role}
                    </span>
                  </div>

                  {/* Role picker */}
                  <select
                    className={s.roleSelect}
                    value={selectedRole}
                    onChange={e => setAddRole(r => ({ ...r, [uid]: e.target.value }))}
                    style={{ '--c': PROJ_ROLE_COLORS[selectedRole] }}
                    disabled={addingId === uid}
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                  </select>

                  <button
                    className={s.addBtn}
                    onClick={() => handleAdd(wsm)}
                    disabled={addingId === uid}
                  >
                    {addingId === uid ? (
                      <span className={s.spinner} />
                    ) : (
                      '+ Add'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </Modal>
  );
}
