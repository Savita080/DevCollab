// pages/project/ProjectMembers.jsx — project members management
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Crown, UserPlus, Trash2, Shield } from 'lucide-react';
import { workspaces as wsApi, projects as projApi } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { Avatar } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import s from '../../styles/modules/ProjectMembers.module.css';

const PROJ_ROLES = ['CONTRIBUTOR', 'VIEWER'];
const PROJ_ROLE_COLORS = { CONTRIBUTOR: 'var(--cyan)', VIEWER: 'var(--violet)' };
const WS_ROLE_COLORS = { OWNER: 'var(--amber)', ADMIN: 'var(--indigo)', MEMBER: 'var(--green)', VIEWER: 'var(--text-3)' };

export default function ProjectMembers() {
  const { workspaceId, projectId, project, isContributor, canEdit, workspaceRole } = useOutletContext();
  const { user } = useAuth();
  const { toast, confirm } = useUI();

  const [projMembers, setProjMembers] = useState([]);
  const [wsMembers, setWsMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({}); // { [userId]: 'adding' | 'removing' }
  const [pendingRole, setPendingRole] = useState({});

  const isAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  // Contributors can ADD members but not remove them. Removal is restricted to
  // the project creator and workspace OWNER/ADMIN. Anyone can remove themselves.
  const canManage = isAdmin || isContributor;
  const creatorId = project?.createdBy?._id || project?.createdBy;
  const myId = user?.id || user?._id;
  const iAmCreator = creatorId && myId && creatorId.toString() === myId.toString();
  const canRemove = (uid) => {
    if (uid && myId && uid.toString() === myId.toString()) return true; // leave self
    return isAdmin || iAmCreator;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, wRes] = await Promise.all([
        projApi.members(workspaceId, projectId).catch(() => ({ data: { members: [] } })),
        wsApi.members(workspaceId).catch(() => ({ data: { members: [] } })),
      ]);
      setProjMembers(pRes.data.members ?? []);
      setWsMembers(wRes.data.members ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    loadAll();
  }, [workspaceId, projectId]);

  const projIds = new Set(projMembers.map(m => m.user?._id));
  const eligible = wsMembers.filter(m => {
    const uid = m.user?._id;
    return uid && !projIds.has(uid);
  });

  const handleAdd = async (userId) => {
    setBusy(b => ({ ...b, [userId]: 'adding' }));
    try {
      const role = pendingRole[userId] || 'CONTRIBUTOR';
      await projApi.addMember(workspaceId, projectId, { userId, role });
      toast('Member added', 'success');
      loadAll();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to add', 'error');
    } finally {
      setBusy(b => ({ ...b, [userId]: undefined }));
    }
  };

  const handleRemove = async (userId, name) => {
    if (!(await confirm(`Remove ${name} from this project?`))) return;
    setBusy(b => ({ ...b, [userId]: 'removing' }));
    try {
      await projApi.removeMember(workspaceId, projectId, userId);
      toast(`${name} removed`, 'info');
      setProjMembers(prev => prev.filter(m => m.user?._id !== userId));
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to remove', 'error');
    } finally {
      setBusy(b => ({ ...b, [userId]: undefined }));
    }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Project Members</h1>
          <p className={s.subtitle}>{project?.name} · {projMembers.length} member{projMembers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Current members */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <Shield size={14} />
          <h3>Current Project Members</h3>
        </div>

        {loading ? (
          <div className={s.list}>
            {[1, 2, 3].map(i => <div key={i} className={s.skeleton} />)}
          </div>
        ) : projMembers.length === 0 ? (
          <p className={s.emptyTxt}>No project members yet.</p>
        ) : (
          <div className={s.list}>
            {projMembers.map(m => {
              const uid = m.user?._id;
              const isMe = uid === user?.id || uid === user?._id;
              const wsRole = wsMembers.find(w => w.user?._id === uid)?.role;
              return (
                <div key={uid} className={s.memberCard}>
                  <Avatar name={m.user?.name || '?'} src={m.user?.avatar} size={38} />
                  <div className={s.memberInfo}>
                    <div className={s.nameRow}>
                      <strong>{m.user?.name || 'Unknown'}</strong>
                      {isMe && <span className={s.youBadge}>You</span>}
                      {(wsRole === 'OWNER' || wsRole === 'ADMIN') && (
                        <span className={s.crownBadge} title={`Workspace ${wsRole}`}>
                          <Crown size={11} />
                        </span>
                      )}
                    </div>
                    <span className={s.email}>{m.user?.email || ''}</span>
                  </div>
                  <span
                    className={s.roleBadge}
                    style={{ '--rc': PROJ_ROLE_COLORS[m.role] || 'var(--text-3)' }}
                  >
                    {m.role}
                  </span>
                  {canManage && !isMe && canRemove(uid) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busy[uid] === 'removing'}
                      onClick={() => handleRemove(uid, m.user?.name)}
                    >
                      <Trash2 size={12} /> Remove
                    </Button>
                  )}
                  {creatorId && uid?.toString() === creatorId.toString() && (
                    <span className={s.youBadge} title="Project creator">Creator</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add members */}
      {canManage && eligible.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>
            <UserPlus size={14} />
            <h3>Add from Workspace</h3>
          </div>
          <p className={s.desc}>Workspace members not yet in this project.</p>
          <div className={s.list}>
            {eligible.map(m => {
              const uid = m.user?._id;
              return (
                <div key={uid} className={s.memberCard}>
                  <Avatar name={m.user?.name || '?'} src={m.user?.avatar} size={38} />
                  <div className={s.memberInfo}>
                    <strong>{m.user?.name || 'Unknown'}</strong>
                    <span className={s.email}>{m.user?.email || ''}</span>
                  </div>
                  <span className={s.wsRoleBadge} style={{ '--rc': WS_ROLE_COLORS[m.role] || 'var(--text-3)' }}>
                    {m.role}
                  </span>
                  <Select
                    value={pendingRole[uid] || 'CONTRIBUTOR'}
                    onChange={e => setPendingRole(p => ({ ...p, [uid]: e.target.value }))}
                    options={PROJ_ROLES}
                    style={{ minWidth: 140 }}
                  />
                  <Button
                    variant="cyan"
                    size="sm"
                    loading={busy[uid] === 'adding'}
                    onClick={() => handleAdd(uid)}
                  >
                    Add
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
