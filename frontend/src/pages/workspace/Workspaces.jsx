// pages/workspace/Workspaces.jsx — landing/master after login: list all workspaces
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, FolderKanban, Sparkles, ArrowRight, LogOut, MoreHorizontal } from 'lucide-react';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { workspaces as wsApi, projects as projApi, notifications as notifApi } from '../../lib/api';
import { Avatar } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input, Textarea } from '../../components/ui/Input';
import { useClickOutside } from '../../lib/hooks';
import ProfileCardBadge from '../../components/layout/ProfileCardBadge';
import ThemeQuickPick from '../../components/layout/ThemeQuickPick';
import Button from '../../components/ui/Button';
import s from '../../styles/modules/Workspaces.module.css';

const WS_GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#ef4444'],
  ['#ec4899', '#8b5cf6'],
  ['#8b5cf6', '#ec4899'],
];

const ROLE_COLORS = { OWNER: 'var(--amber)', ADMIN: 'var(--indigo)', MEMBER: 'var(--green)', VIEWER: 'var(--text-3)' };

export default function Workspaces() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { workspaces: wsList, fetchWorkspaces, createWorkspace } = useWorkspace();
  const { bindNotifications, unbindNotifications, setNotifications } = useUI();

  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [creating, setCreating] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const userRef = useRef(null);
  useClickOutside(userRef, () => setUserOpen(false));

  useEffect(() => {
    fetchWorkspaces().finally(() => setLoading(false));
    bindNotifications();
    notifApi.unread()
      .then(({ data }) => setNotifications(data.notifications ?? data ?? []))
      .catch(() => {});
    return () => unbindNotifications();
  }, []);

  // Load stats per workspace (members + project counts) — fire-and-forget
  useEffect(() => {
    wsList.forEach(async (w) => {
      try {
        const [m, p] = await Promise.all([
          wsApi.members(w._id).catch(() => ({ data: { members: [] } })),
          projApi.list(w._id).catch(() => ({ data: { projects: [] } })),
        ]);
        const members = m.data.members ?? m.data ?? [];
        const projects = p.data.projects ?? p.data ?? [];
        setStats(prev => ({
          ...prev,
          [w._id]: { members: members.length, projects: projects.length, membersList: members },
        }));
      } catch {
        setStats(prev => ({ ...prev, [w._id]: { members: 0, projects: 0, membersList: [] } }));
      }
    });
  }, [wsList.length]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setNameError('');
    try {
      const ws = await createWorkspace({ name: newName.trim(), description: description.trim() });
      setNewName('');
      setDescription('');
      setCreateOpen(false);
      navigate(`/workspaces/${ws.slug || ws._id}`);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === 'DUPLICATE_NAME') {
        setNameError(data.message || 'You already have a workspace with this name.');
      } else {
        setNameError(data?.message || 'Failed to create workspace.');
      }
    } finally { setCreating(false); }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className={s.page}>
      {/* Top bar */}
      <header className={s.topbar}>
        <div className={s.brand}>
          <span className={s.brandName}>
            <span className={s.brandReal}>Dev</span>Collab
          </span>
        </div>
        <div className={s.userBox} ref={userRef} style={{ position: 'relative' }}>
          <ThemeQuickPick />
          <button className={s.userClickArea} onClick={() => setUserOpen(o => !o)}>
            <Avatar name={user?.name || 'U'} src={user?.avatar} size={32} />
            <div className={s.userText}>
              <div className={s.userName}>{user?.name}</div>
              <div className={s.userEmail}>{user?.email}</div>
            </div>
          </button>
          <button className={s.iconBtn} onClick={logout} title="Sign out">
            <LogOut size={14} />
          </button>
          {userOpen && (
            <ProfileCardBadge
              user={user}
              onClose={() => setUserOpen(false)}
              onLogout={logout}
              style={{ top: 'calc(100% + 14px)', right: '0' }}
            />
          )}
        </div>
      </header>

      <div className={s.hero}>
        <div className={s.heroLeft}>
          <div className={s.eyebrow}>YOUR WORKSPACES</div>
          <h1 className={s.title}>Welcome back, {firstName}.</h1>
          <p className={s.subtitle}>
            Pick a workspace to jump into your projects, or create a new one to start collaborating.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Workspace
        </Button>
      </div>

      {/* Workspaces grid */}
      <section className={s.grid}>
        {loading && wsList.length === 0 && (
          <>
            <Skeleton height={170} style={{ borderRadius: 16 }} />
            <Skeleton height={170} style={{ borderRadius: 16 }} />
            <Skeleton height={170} style={{ borderRadius: 16 }} />
          </>
        )}

        {!loading && wsList.length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>
              <Sparkles size={28} />
            </div>
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to start collaborating with your team.</p>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Create Workspace
            </Button>
          </div>
        )}

        {wsList.map((w, i) => {
          const grad = WS_GRADIENTS[i % WS_GRADIENTS.length];
          const st = stats[w._id];
          const uid = user?.id || user?._id;
          const myMember = st?.membersList?.find(mem => (mem.user?._id || mem.user) === uid);
          const role = myMember?.role || 'MEMBER';

          return (
            <button
              key={w._id}
              className={s.folderCard}
              onClick={() => navigate(`/workspaces/${w.slug || w._id}`)}
              style={{ '--accent-1': grad[0], '--accent-2': grad[1] }}
            >
              {/* Folder Backing (Gradient Top) */}
              <div className={s.folderBack} style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }} />

              {/* Emerging Papers */}
              <div className={s.papers}>
                <div className={s.paper1}>
                  <div className={s.paperLineShort} />
                  <div className={s.paperLineLong} />
                  <div className={s.paperLineLong} />
                </div>
                <div className={s.paper2}>
                  <span className={s.paperWatermark}>{w.name[0]?.toUpperCase()}</span>
                  <div className={s.paperLineShort} />
                  <div className={s.paperLineLong} />
                  <div className={s.paperLineLong} />
                  <div className={s.paperLineLong} />
                </div>
                <div className={s.paper3}>
                  <div className={s.paperLineShort} />
                  <div className={s.paperLineLong} />
                  <div className={s.paperLineLong} />
                </div>
              </div>

              {/* Folder Front Cover (Masked via CSS Clip Path) */}
              <div className={s.folderFront}>
                <div className={s.folderContent}>
                  <div className={s.folderHeader}>
                    <div className={s.folderTitleBox}>
                      <h3 className={s.folderTitle}>{w.name}</h3>
                      <span className={s.folderSubtitle}>Workspace</span>
                    </div>
                    <div className={s.folderDots} onClick={e => e.stopPropagation()}>
                      <MoreHorizontal size={16} />
                    </div>
                  </div>
                  
                  <div className={s.folderFooter}>
                    <div className={s.folderStatsGroup}>
                      <div className={s.folderStat}>
                        <Users size={12} className={s.folderStatIcon} />
                        <span>{st ? `${st.members} Member${st.members === 1 ? '' : 's'}` : '…'}</span>
                      </div>
                      <div className={s.folderStat}>
                        <FolderKanban size={12} className={s.folderStatIcon} />
                        <span>{st ? `${st.projects} Project${st.projects === 1 ? '' : 's'}` : '…'}</span>
                      </div>
                    </div>
                    {st && (
                      <span className={s.cardRoleBadge} style={{ backgroundColor: ROLE_COLORS[role] }}>
                        {role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {!loading && wsList.length > 0 && (
          <button className={s.newCard} onClick={() => setCreateOpen(true)}>
            <Plus size={20} />
            <span>New Workspace</span>
          </button>
        )}
      </section>

      {/* Create modal */}
      {createOpen && (
        <div className={s.modalOverlay} onClick={() => { setCreateOpen(false); setNameError(''); setNewName(''); setDescription(''); }}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>Create Workspace</h3>
            <p className={s.modalDesc}>
              Workspaces let you group projects, members, and conversations together.
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Workspace name"
                placeholder="e.g. DevFusion Team"
                value={newName}
                onChange={e => { setNewName(e.target.value); if (nameError) setNameError(''); }}
                error={nameError}
                required
                autoFocus
              />
              <Textarea
                label="Description"
                placeholder="Describe your workspace (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
              <div className={s.modalActions}>
                <Button type="button" variant="ghost" onClick={() => { setCreateOpen(false); setNameError(''); setNewName(''); setDescription(''); }}>Cancel</Button>
                <Button type="submit" variant="primary" loading={creating}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SVG Clip Path for Folder Front Cover Tab */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <clipPath id="folder-clip" clipPathUnits="objectBoundingBox">
            <path d="M 0,0.12
                     C 0,0.12 0,0 0.04,0
                     L 0.38,0
                     C 0.42,0 0.44,0.12 0.48,0.12
                     L 0.96,0.12
                     C 0.98,0.12 1,0.16 1,0.22
                     L 1,1
                     L 0,1
                     Z" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}
