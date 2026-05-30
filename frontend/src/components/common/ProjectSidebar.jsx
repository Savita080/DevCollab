// components/common/ProjectSidebar.jsx — project-scoped left nav (slim)
import { useState, useRef } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, LayoutGrid, KanbanSquare, MessageSquare, FileText, Code2,
  Palette, Sparkles, Activity, Users, Settings, Folder, Plus, ChevronDown, Check, LogOut,
} from 'lucide-react';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useChat } from '../../store/chat';
import { useClickOutside } from '../../lib/hooks';
import { useUI } from '../../store/ui';
import { Avatar } from '../ui/Badge';
import s from '../../styles/modules/ProjectSidebar.module.css';
import wsStyles from '../../styles/modules/WorkspaceSidebar.module.css';

const PROJECT_COLORS = [
  'var(--indigo)', 'var(--cyan)', 'var(--green)', 'var(--amber)',
  'var(--pink)', 'var(--violet)', 'var(--status-danger)', 'var(--cyan)',
];

export default function ProjectSidebar({ project, canEdit, role }) {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { projects, workspaces: wsList, current } = useWorkspace();
  const { user, logout } = useAuth();
  const { sidebarOpen } = useUI();
  const unreadMap = useChat(s => s.unread);
  
  const [projDropOpen, setProjDropOpen] = useState(false);
  const [wsDropOpen, setWsDropOpen] = useState(false);

  const wsDropRef = useRef(null);
  const projDropRef = useRef(null);

  useClickOutside(wsDropRef, () => setWsDropOpen(false));
  useClickOutside(projDropRef, () => setProjDropOpen(false));

  const toggleWsDrop = () => {
    setWsDropOpen(o => {
      const next = !o;
      if (next) setProjDropOpen(false);
      return next;
    });
  };

  const toggleProjDrop = () => {
    setProjDropOpen(o => {
      const next = !o;
      if (next) setWsDropOpen(false);
      return next;
    });
  };

  const projBase = `/workspaces/${workspaceId}/projects/${projectId}`;
  const currentWorkspaceName = current?.name || 'Loading…';
  const firstName = user?.name?.split(' ')[0] || 'User';

  const NAV = [
    { to: `${projBase}`,             label: 'Overview',    icon: LayoutGrid, end: true },
    { to: `${projBase}/kanban`,      label: 'Kanban',      icon: KanbanSquare },
    { to: `${projBase}/chat`,        label: 'Chat',        icon: MessageSquare },
    { to: `${projBase}/wiki`,        label: 'Wiki',        icon: FileText },
    { to: `${projBase}/snippets`,    label: 'Snippets',    icon: Code2 },
    { to: `${projBase}/whiteboards`, label: 'Whiteboards', icon: Palette },
    { to: `${projBase}/ai`,          label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
    { to: `${projBase}/activity`,    label: 'Activity',    icon: Activity },
  ];

  const SETTINGS_NAV = [
    { to: `${projBase}/members`,  label: 'Members',  icon: Users },
    { to: `${projBase}/settings`, label: 'Settings', icon: Settings, editorOnly: true },
  ];

  // projectId from URL may be _id (legacy) or slug (pretty URL) — match both.
  const activeProj = project || projects.find(p => p._id === projectId || p.slug === projectId);
  const projectName = activeProj?.name || 'Loading…';
  const chatUnread = activeProj?._id ? (unreadMap[activeProj._id] || 0) : 0;
  const projIdx = projects.findIndex(p => p._id === projectId || p.slug === projectId);
  const projColor = PROJECT_COLORS[projIdx >= 0 ? projIdx % PROJECT_COLORS.length : 0];

  return (
    <aside className={`${s.sidebar} ${!sidebarOpen ? s.collapsed : ''}`}>
      {/* Brand */}
      <button className={wsStyles.brand} onClick={() => navigate('/workspaces')}>
        <span className={wsStyles.brandName}>
          <span className={wsStyles.brandReal}>Dev</span>Collab
        </span>
      </button>

      {/* Workspace switcher */}
      <div className={wsStyles.wsSection} ref={wsDropRef}>
        <div className={wsStyles.wsLabel}>WORKSPACE</div>
        <button className={wsStyles.wsSelector} onClick={toggleWsDrop}>
          <span className={wsStyles.wsAvatar}>{currentWorkspaceName[0]?.toUpperCase()}</span>
          <span className={wsStyles.wsName}>{currentWorkspaceName}</span>
          <ChevronDown size={14} className={`${wsStyles.chev} ${wsDropOpen ? wsStyles.chevUp : ''}`} />
        </button>

        {wsDropOpen && (
          <div className={wsStyles.wsDrop}>
            {wsList.map(w => {
              const active = workspaceId === w._id || workspaceId === w.slug;
              return (
                <button
                  key={w._id}
                  className={`${wsStyles.wsOpt} ${active ? wsStyles.wsOptActive : ''}`}
                  onClick={() => {
                    setWsDropOpen(false);
                    navigate(`/workspaces/${w.slug || w._id}`);
                  }}
                >
                  <span className={wsStyles.wsAvatarSm}>{w.name[0]?.toUpperCase()}</span>
                  <span className={wsStyles.wsOptName}>{w.name}</span>
                  {active && <Check size={12} className={wsStyles.wsOptCheck} />}
                </button>
              );
            })}
            <button
              className={wsStyles.wsOptNew}
              onClick={() => {
                setWsDropOpen(false);
                navigate('/workspaces');
              }}
            >
              All workspaces…
            </button>
          </div>
        )}
      </div>

      {/* Project header / switcher */}
      <div className={s.projHead} ref={projDropRef}>
        <button className={s.projHeadBtn} onClick={toggleProjDrop}>
          <span className={s.projDot} style={{ background: projColor }} />
          <div className={s.projHeadText}>
            <div className={s.projLabel}>PROJECT</div>
            <div className={s.projName}>{projectName}</div>
          </div>
          <Folder size={14} className={s.projHeadChev} />
        </button>

        {projDropOpen && (
          <div className={s.projDrop}>
            {projects.map((p, i) => {
              const active = p._id === projectId || p.slug === projectId;
              return (
                <button
                  key={p._id}
                  className={`${s.projOpt} ${active ? s.projOptActive : ''}`}
                  onClick={() => {
                    setProjDropOpen(false);
                    navigate(`/workspaces/${workspaceId}/projects/${p.slug || p._id}`);
                  }}
                >
                  <span className={s.projOptDot} style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                  <span className={s.projOptName}>{p.name}</span>
                </button>
              );
            })}
            <button
              className={s.projOptNew}
              onClick={() => {
                setProjDropOpen(false);
                navigate(`/workspaces/${workspaceId}/projects`);
              }}
            >
              <Plus size={13} /> All projects
            </button>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className={s.navSection}>
        <div className={s.sectionLabel}>PROJECT</div>
        {NAV.map(n => {
          const showUnread = n.label === 'Chat' && chatUnread > 0;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
            >
              <span className={s.linkIcon}><n.icon size={16} /></span>
              <span className={s.linkLabel}>{n.label}</span>
              {showUnread && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--status-danger, #ef4444)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 10,
                  minWidth: 16,
                  textAlign: 'center',
                }}>
                  {chatUnread > 99 ? '99+' : chatUnread}
                </span>
              )}
              {n.badge && !showUnread && <span className={s.badge}>{n.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Settings */}
      <nav className={s.navSection}>
        <div className={s.sectionLabel}>SETTINGS</div>
        {SETTINGS_NAV.filter(n => !n.editorOnly || canEdit).map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
          >
            <span className={s.linkIcon}><n.icon size={16} /></span>
            <span className={s.linkLabel}>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={s.spacer} />

      {/* Footer */}
      <div className={s.foot}>
        <div className={s.footRole}>{canEdit ? 'Editor' : 'Viewer'}</div>
        <div className={s.footHint}>
          {canEdit ? 'You can create and edit content' : 'Read-only access'}
        </div>
      </div>

      {/* User footer */}
      <div className={wsStyles.userFoot}>
        <Avatar name={user?.name || 'U'} src={user?.avatar} size={32} />
        <div className={wsStyles.userInfo}>
          <button className={wsStyles.userNameBtn} onClick={() => navigate('/profile')} title="Edit profile">
            {firstName}
          </button>
          <span className={wsStyles.userRole}>{role || 'Member'}</span>
        </div>
        <button className={wsStyles.logoutBtn} onClick={logout} title="Sign out">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
