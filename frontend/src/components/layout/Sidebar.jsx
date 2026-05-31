// components/layout/Sidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { Avatar } from '../ui/Badge';
import { Input } from '../ui/Input';
import Button from '../ui/Button';
import { workspaces as wsApi, tasks as tasksApi, projects as projectsApi, subscriptions as subApi } from '../../lib/api';
import { useWorkspaceRole } from '../../lib/useWorkspaceRole';
import ProjectMembersModal from '../ProjectMembersModal';
import s from '../../styles/modules/Sidebar.module.css';

const PROJECT_COLORS = [
  '#6366f1', '#00d4ff', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4',
];

const MAIN_NAV = [
  { to: '/dashboard', label: 'Dashboard',    icon: <DashIcon /> },
  { to: '/kanban',    label: 'Kanban Board',  icon: <KanbanIcon /> },
  { to: '/snippets',  label: 'Code Snippets', icon: <SnipIcon /> },
  { to: '/wiki',      label: 'Wiki',          icon: <WikiIcon /> },
  { to: '/ai',        label: 'AI Panel',      icon: <AIIcon />, badge: 'Beta' },
];

const SETTINGS_NAV = [
  { to: '/members',   label: 'Members',      icon: <MembersIcon /> },
  { to: '/activity',  label: 'Activity',     icon: <ActivityIcon /> },
  { to: '/collab',    label: 'Live Collab',  icon: <CollabIcon /> },
  { to: '/subscribe', label: 'Subscription', icon: <StarIcon /> },
];

export default function Sidebar() {
  const { workspaces: wsList, current: ws, setWorkspace, projects, currentProject, setProject, createWorkspace, createProject } = useWorkspace();
  const { role: workspaceRole } = useWorkspaceRole(ws?._id);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [wsDropOpen, setWsDropOpen] = useState(false);
  const [wbDetailOpen, setWbDetailOpen] = useState(false);  // workspace detail popup
  const [selectedWbForDetail, setSelectedWbForDetail] = useState(null);

  const [wsModal, setWsModal] = useState(false);
  const [projModal, setProjModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [projName, setProjName] = useState('');
  const [loading, setLoading] = useState(false);
  // Project rename
  const [renameProj, setRenameProj] = useState(null);
  const [renameProjName, setRenameProjName] = useState('');
  const [renameProjLoading, setRenameProjLoading] = useState(false);
  // Project members
  const [membersProj, setMembersProj] = useState(null);

  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setWsDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Open workspace detail popup when user clicks a workspace option
  const openWsDetail = (w) => {
    setWsDropOpen(false);
    setSelectedWbForDetail(w);
    // Switch the store to this workspace so projects are fetched
    if (ws?._id !== w._id) setWorkspace(w._id);
    setWbDetailOpen(true);
  };

  const closeWsDetail = () => {
    setWbDetailOpen(false);
    setSelectedWbForDetail(null);
  };

  const handleCreateWs = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await createWorkspace({ name: wsName }); setWsName(''); setWsModal(false); }
    finally { setLoading(false); }
  };

  const handleCreateProj = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await createProject({ name: projName }); setProjName(''); setProjModal(false); }
    finally { setLoading(false); }
  };

  const handleRenameProj = async (e) => {
    e.preventDefault();
    if (!renameProj || !renameProjName.trim()) return;
    setRenameProjLoading(true);
    try {
      await projectsApi.update(ws._id, renameProj._id, { name: renameProjName.trim() });
      // Update project in store state by reloading
      window.location.reload();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to rename project');
    } finally { setRenameProjLoading(false); }
  };

  const handleDeleteProj = async (p) => {
    if (!confirm(`Delete project "${p.name}"? This will delete all its tasks, wiki pages, and snippets.`)) return;
    try {
      await projectsApi.delete(ws._id, p._id);
      window.location.reload();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete project');
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <>
      <aside className={s.sidebar}>
        {/* Brand */}
        <div className={s.brand}>
          <span className={s.brandName}>
            <span className={s.brandReal}>Dev</span>Collab
          </span>
        </div>

        {/* Workspace selector */}
        <div className={s.wsSection} ref={dropRef}>
          <div className={s.wsLabel}>WORKSPACE</div>
          <button className={s.wsSelector} onClick={() => setWsDropOpen(o => !o)}>
            <span className={s.wsName}>{ws?.name || 'Select workspace'}</span>
            <span className={`${s.chevron} ${wsDropOpen ? s.chevronUp : ''}`}><ChevronIcon /></span>
          </button>

          {wsDropOpen && (
            <div className={s.wsDrop}>
              {wsList.map(w => (
                <button
                  key={w._id}
                  className={`${s.wsOpt} ${ws?._id === w._id ? s.wsOptActive : ''}`}
                  onClick={() => openWsDetail(w)}
                >
                  <span className={s.wsOptDot} style={{ background: ws?._id === w._id ? 'var(--indigo)' : 'var(--text-3)' }} />
                  <span className={s.wsOptName}>{w.name}</span>
                  {ws?._id === w._id && <span className={s.wsOptCheck}>✓</span>}
                </button>
              ))}
              <button className={s.wsOptNew} onClick={() => { setWsDropOpen(false); setWsModal(true); }}>
                + New Workspace
              </button>
            </div>
          )}
        </div>

        {/* MAIN nav */}
        <nav className={s.navSection}>
          <div className={s.sectionLabel}>MAIN</div>
          {MAIN_NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
              <span className={s.linkIcon}>{n.icon}</span>
              <span className={s.linkLabel}>{n.label}</span>
              {n.badge && <span className={s.badge}>{n.badge}</span>}
            </NavLink>
          ))}
        </nav>

        {/* PROJECTS */}
        {ws && (
          <div className={s.navSection}>
            <div className={s.sectionLabel}>PROJECTS</div>
            {projects.map((p, i) => (
              <div key={p._id} className={s.projRow}>
                <button
                  className={`${s.projBtn} ${currentProject?._id === p._id ? s.projActive : ''}`}
                  onClick={() => { setProject(p); navigate('/kanban'); }}
                >
                  <span className={s.projDot} style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                  <span className={s.projName}>{p.name}</span>
                </button>
                <div className={s.projActions}>
                  <button
                    className={s.projActBtn}
                    title="Manage members"
                    onClick={e => { e.stopPropagation(); setMembersProj(p); }}
                  >👥</button>
                  <button
                    className={s.projActBtn}
                    title="Rename project"
                    onClick={e => { e.stopPropagation(); setRenameProj(p); setRenameProjName(p.name); }}
                  >✏</button>
                  <button
                    className={`${s.projActBtn} ${s.projDelBtn}`}
                    title="Delete project"
                    onClick={e => { e.stopPropagation(); handleDeleteProj(p); }}
                  >🗑</button>
                </div>
              </div>
            ))}
            <button className={s.newProjBtn} onClick={() => setProjModal(true)}>
              + New Project
            </button>
          </div>
        )}

        {/* SETTINGS */}
        <div className={s.navSection}>
          <div className={s.sectionLabel}>SETTINGS</div>
          {SETTINGS_NAV.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}>
              <span className={s.linkIcon}>{n.icon}</span>
              <span className={s.linkLabel}>{n.label}</span>
            </NavLink>
          ))}
        </div>

        <div className={s.spacer} />

        {/* User footer */}
        <div className={s.userFoot}>
          <Avatar name={user?.name || 'U'} src={user?.avatar} size={30} />
          <div className={s.userInfo}>
            <button
              className={s.userNameBtn}
              onClick={() => navigate('/profile')}
              title="Edit profile"
            >
              {firstName}
            </button>
            <span className={s.userRole}>{ws?.name || 'No workspace'} · {user?.role || 'Member'}</span>
          </div>
          <button className={s.logoutBtn} onClick={logout} title="Sign out">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* ── Workspace Detail Popup ── */}
      {wbDetailOpen && (
        <WorkspaceDetailPopup
          workspace={selectedWbForDetail || ws}
          projects={projects}
          user={user}
          onClose={closeWsDetail}
          onNewProject={() => { closeWsDetail(); setProjModal(true); }}
          onSelectProject={(p) => { setProject(p); closeWsDetail(); navigate('/kanban'); }}
          onSettings={() => { closeWsDetail(); navigate('/members'); }}
        />
      )}

      {/* Create Workspace modal */}
      {wsModal && (
        <div className={s.modalOverlay} onClick={() => setWsModal(false)}>
          <div className={s.miniModal} onClick={e => e.stopPropagation()}>
            <h3 className={s.miniModalTitle}>Create Workspace</h3>
            <form onSubmit={handleCreateWs} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Workspace name" placeholder="DevFusion Team" value={wsName}
                onChange={e => setWsName(e.target.value)} required />
              <Button type="submit" variant="cyan" size="md" loading={loading}>Create Workspace</Button>
            </form>
          </div>
        </div>
      )}

      {/* Create Project modal */}
      {projModal && (
        <div className={s.modalOverlay} onClick={() => setProjModal(false)}>
          <div className={s.miniModal} onClick={e => e.stopPropagation()}>
            <h3 className={s.miniModalTitle}>Create Project</h3>
            <form onSubmit={handleCreateProj} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Project name" placeholder="Auth System" value={projName}
                onChange={e => setProjName(e.target.value)} required />
              <Button type="submit" variant="primary" size="md" loading={loading}>Create Project</Button>
            </form>
          </div>
        </div>
      )}

      {/* Project Members modal */}
      <ProjectMembersModal
        open={!!membersProj}
        onClose={() => setMembersProj(null)}
        workspace={ws}
        project={membersProj}
        currentUserId={user?.id || user?._id}
        workspaceRole={workspaceRole}
      />

      {/* Rename Project modal */}
      {renameProj && (
        <div className={s.modalOverlay} onClick={() => setRenameProj(null)}>
          <div className={s.miniModal} onClick={e => e.stopPropagation()}>
            <h3 className={s.miniModalTitle}>Rename Project</h3>
            <form onSubmit={handleRenameProj} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="New name" value={renameProjName}
                onChange={e => setRenameProjName(e.target.value)} required />
              <Button type="submit" variant="cyan" size="md" loading={renameProjLoading}>Rename</Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


/* ─────────────────────────────────────────────────────
   Workspace Detail Popup
───────────────────────────────────────────────────── */
function WorkspaceDetailPopup({ workspace, projects, user, onClose, onNewProject, onSelectProject, onSettings }) {
  const [memberCount, setMemberCount] = useState(null);
  const [projectStats, setProjectStats] = useState({});  // projectId -> { taskCount, members[] }
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!workspace) return;
    // Fetch workspace members count
    wsApi.members(workspace._id)
      .then(({ data }) => setMemberCount((data.members ?? data).length))
      .catch(() => setMemberCount(projects.length));

    // Fetch task counts per project using the API lib (handles auth token automatically)
    projects.forEach(async (p) => {
      try {
        const [taskRes, memRes] = await Promise.all([
          tasksApi.list(workspace._id, p._id),
          projectsApi.members(workspace._id, p._id).catch(() => ({ data: { members: [] } })),
        ]);
        const taskList = taskRes.data.tasks ?? taskRes.data;
        const memberList = memRes.data.members ?? [];
        setProjectStats(prev => ({
          ...prev,
          [p._id]: {
            taskCount: taskList.length,
            doneCount: taskList.filter(t => t.status === 'DONE' || t.status === 'Done').length,
            members: memberList.slice(0, 3).map(m => m.user?.name?.split(' ')[0] || '?'),
          }
        }));
      } catch {
        setProjectStats(prev => ({ ...prev, [p._id]: { taskCount: 0, doneCount: 0, members: [] } }));
      }
    });
  }, [workspace?._id, projects.length]);

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const ownerName = user?.name || 'Owner';
  const isPro = user?.subscription?.plan === 'PRO';
  const planLabel = isPro ? 'PRO plan' : 'FREE plan';

  return (
    <div className={s.wsPopupOverlay} ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={s.wsPopup}>
        {/* Header */}
        <div className={s.wsPopupHead}>
          <div>
            <h2 className={s.wsPopupName}>{workspace?.name?.toUpperCase()}</h2>
            <p className={s.wsPopupMeta}>
              Owner: {ownerName}
              {memberCount != null && <> · {memberCount} member{memberCount !== 1 ? 's' : ''}</>}
              <> · <span className={isPro ? s.planTagPro : s.planTagFree}>{planLabel}</span></>
            </p>
          </div>
          <button className={s.wsPopupClose} onClick={onClose}>×</button>
        </div>

        {/* Projects */}
        <div className={s.wsPopupBody}>
          <div className={s.wsPopupSectionLabel}>PROJECTS</div>
          <div className={s.wsPopupGrid}>
            {projects.map((p, i) => {
              const stats = projectStats[p._id];
              const taskCount = stats?.taskCount ?? '…';
              const doneCount = stats?.doneCount ?? 0;
              const pct = stats?.taskCount > 0 ? Math.round(doneCount / stats.taskCount * 100) : 0;
              const memberNames = stats?.members ?? [];
              const color = PROJECT_COLORS[i % PROJECT_COLORS.length];

              return (
                <button
                  key={p._id}
                  className={s.wsPopupCard}
                  onClick={() => onSelectProject(p)}
                >
                  <div className={s.wsPopupCardTitle}>{p.name}</div>
                  <div className={s.wsPopupCardMeta}>
                    <span>{taskCount} tasks</span>
                    {memberNames.length > 0 && <span> · {memberNames.join(' + ')}</span>}
                  </div>
                  <div className={s.wsPopupProgress}>
                    <div
                      className={s.wsPopupProgressFill}
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}88)`
                      }}
                    />
                  </div>
                </button>
              );
            })}

            {/* New Project card */}
            <button className={s.wsPopupNewCard} onClick={onNewProject}>
              + New Project
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={s.wsPopupFooter}>
          <button className={s.wsPopupCloseBtn} onClick={onClose}>Close</button>
          <button className={s.wsPopupSettingsBtn} onClick={onSettings}>Settings</button>
        </div>
      </div>
    </div>
  );
}

function StarIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function DashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function KanbanIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/></svg>;
}
function SnipIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
}
function WikiIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
}
function AIIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function MembersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function ActivityIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function CollabIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function ChevronIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>;
}
function LogoutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
