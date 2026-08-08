// pages/workspace/WorkspaceOverview.jsx — workspace dashboard
import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  FolderKanban, Users, Sparkles, Activity, MessageSquare, Plus, ArrowRight, Crown, Settings,
} from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import { workspaces as wsApi, projects as projApi, activity as actApi } from '../../lib/api';
import { Avatar } from '../../components/ui/Badge';
import PresenceBar from '../../components/ui/PresenceBar';
import { useScopedPresence } from '../../lib/hooks';
import { Skeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { fmtRelative } from '../../lib/utils';
import s from '../../styles/modules/WorkspaceOverview.module.css';

const PROJECT_COLORS = ['var(--indigo)', 'var(--cyan)', 'var(--green)', 'var(--amber)', 'var(--pink)', 'var(--violet)'];

export default function WorkspaceOverview() {
  const { workspaceId, workspace, role, members, isAdmin, canCreate } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useUI();
  const { projects, projectsWorkspaceId, refreshProjects, createProject } = useWorkspace();
  const navigate = useNavigate();
  const online = useScopedPresence(workspace?._id ? `ws:${workspace._id}` : null);

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    refreshProjects();
  }, [workspaceId]);

  // Aggregate recent activity from up to 3 projects. Guarded on
  // projectsWorkspaceId matching the workspace actually in view — `projects`
  // can still hold the *previous* workspace's list for one render after
  // navigating (child effects run before the parent's setWorkspace call),
  // and without this check we'd fire activity requests for the wrong
  // workspace's projects (403s, or leaking data across workspaces).
  useEffect(() => {
    if (!workspace?._id || projectsWorkspaceId !== workspace._id) { setLoading(false); return; }
    if (!projects.length) { setLoading(false); return; }
    setLoading(true);
    const slice = projects.slice(0, 4);
    Promise.all(slice.map(p =>
      actApi.list(workspaceId, p._id, { limit: 4 })
        .then(({ data }) => ({ p, items: data.activities ?? data ?? [] }))
        .catch(() => ({ p, items: [] }))
    )).then(results => {
      const merged = [];
      results.forEach(({ p, items }) => items.forEach(it => merged.push({ ...it, _project: p })));
      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentActivity(merged.slice(0, 8));
      setLoading(false);
    });
  }, [projects.length, projectsWorkspaceId, workspace?._id, workspaceId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setNameError('');
    try {
      const proj = await createProject({ name: newName.trim(), description: description.trim() });
      setNewName('');
      setDescription('');
      setCreateOpen(false);
      toast('Project created!', 'success');
      navigate(`/workspaces/${workspaceId}/projects/${proj.slug || proj._id}`);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === 'DUPLICATE_NAME') {
        setNameError(data.message || 'A project with this name already exists in this workspace.');
      } else {
        setNameError(data?.message || 'Failed to create project.');
      }
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => { setCreateOpen(false); setNameError(''); setNewName(''); setDescription(''); };

  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className={s.page}>
      {/* Greeting hero */}
      <div className={s.hero}>
        <div className={s.heroLeft}>
          <div className={s.eyebrow}>{workspace?.name?.toUpperCase() || 'WORKSPACE'}</div>
          <h1 className={s.title}>
            {greeting}, <span className={s.name}>{firstName}</span>
          </h1>
          <p className={s.subtitle}>
            Here's what's happening across your projects today.
          </p>
        </div>
        <div className={s.heroBtns}>
          {online.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
              <PresenceBar users={online} size={28} label="online" />
            </div>
          )}
          {canCreate && (
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> New Project
            </Button>
          )}
        </div>
      </div>

      {/* Stat strip */}
      <div className={s.stats}>
        <StatCard icon={FolderKanban} num={projects.length} label="Projects" color="#6366f1" />
        <StatCard icon={Users} num={members.length} label="Members" color="#00d4ff" />
        <StatCard icon={Crown} num={members.filter(m => m.role === 'OWNER' || m.role === 'ADMIN').length} label="Admins" color="#f59e0b" />
        <StatCard icon={Sparkles} num={role || '—'} label="Your role" color="#10b981" textVal />
      </div>

      <div className={s.grid}>
        {/* Projects column */}
        <div className={s.col}>
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>PROJECTS</span>
              <Link to={`/workspaces/${workspaceId}/projects`} className={s.viewAll}>
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className={s.empty}>
                <FolderKanban size={28} className={s.emptyIcon} />
                <p>No projects yet.</p>
                {canCreate && (
                  <Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus size={12} /> Create one
                  </Button>
                )}
              </div>
            ) : (
              <div className={s.projectGrid}>
                {projects.slice(0, 6).map((p, i) => (
                  <button
                    key={p._id}
                    className={s.projCard}
                    onClick={() => navigate(`/workspaces/${workspaceId}/projects/${p.slug || p._id}`)}
                  >
                    <span className={s.projDot} style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                    <span className={s.projName}>{p.name}</span>
                    <ArrowRight size={12} className={s.projArrow} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>QUICK LINKS</span>
            </div>
            <div className={s.quickGrid}>
              <Link to={`/workspaces/${workspaceId}/chat`} className={s.quickItem}>
                <MessageSquare size={16} />
                <span>Workspace Chat</span>
              </Link>
              <Link to={`/workspaces/${workspaceId}/members`} className={s.quickItem}>
                <Users size={16} />
                <span>Members</span>
              </Link>
              <Link to={`/workspaces/${workspaceId}/activity`} className={s.quickItem}>
                <Activity size={16} />
                <span>Activity</span>
              </Link>
              {isAdmin && (
                <Link to={`/workspaces/${workspaceId}/settings`} className={s.quickItem}>
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className={s.col}>
          {/* Members */}
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>TEAM</span>
              <Link to={`/workspaces/${workspaceId}/members`} className={s.viewAll}>
                Manage <ArrowRight size={12} />
              </Link>
            </div>
            <div className={s.memberList}>
              {members.slice(0, 6).map((m, i) => (
                <div key={m.user?._id || i} className={s.memberRow}>
                  <Avatar name={m.user?.name || '?'} src={m.user?.avatar} size={30} />
                  <div className={s.memberInfo}>
                    <strong className={s.memberName}>{m.user?.name || 'Unknown'}</strong>
                    <span className={s.memberRole}>{m.role}</span>
                  </div>
                </div>
              ))}
              {members.length === 0 && <p className={s.emptyTxt}>No members loaded.</p>}
            </div>
          </div>

          {/* Activity */}
          <div className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardTitle}>RECENT ACTIVITY</span>
              <Link to={`/workspaces/${workspaceId}/activity`} className={s.viewAll}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className={s.feed}>
              {loading && <Skeleton height={48} count={3} style={{ marginBottom: 8 }} />}
              {!loading && recentActivity.length === 0 && (
                <p className={s.emptyTxt}>No recent activity yet.</p>
              )}
              {!loading && recentActivity.map((item, i) => (
                <div key={item._id || i} className={s.feedItem}>
                  <Avatar name={item.user?.name || '?'} src={item.user?.avatar} size={26} />
                  <div className={s.feedBody}>
                    <p className={s.feedMsg}>
                      <strong>{item.user?.name || 'Someone'}</strong>{' '}
                      {feedLabel(item)}
                      {' '}<span className={s.feedProj}>in {item._project?.name}</span>
                    </p>
                    <span className={s.feedTime}>{fmtRelative(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create project modal */}
      {createOpen && (
        <div className={s.modalOverlay} onClick={closeCreate}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>Create Project</h3>
            <p className={s.modalDesc}>
              Projects keep your work organized. Each project has its own kanban, wiki, snippets, and chat.
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Project name" placeholder="e.g. Auth System" value={newName}
                onChange={e => { setNewName(e.target.value); if (nameError) setNameError(''); }}
                error={nameError} required autoFocus />
              <Textarea label="Description" placeholder="Describe your project (optional)" value={description}
                onChange={e => setDescription(e.target.value)} rows={3} />
              <div className={s.modalActions}>
                <Button type="button" variant="ghost" onClick={closeCreate}>Cancel</Button>
                <Button type="submit" variant="primary" loading={creating}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, num, label, color, textVal }) {
  return (
    <div className={s.stat} style={{ '--c': color }}>
      <div className={s.statIcon}><Icon size={16} /></div>
      <div className={s.statBody}>
        <div className={`${s.statNum} ${textVal ? s.statText : ''}`}>{num}</div>
        <div className={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function feedLabel(item) {
  const a = item.action || '';
  const t = item.targetName ? `"${item.targetName}"` : '';
  const map = {
    CREATED_TASK: `created task ${t}`,
    MOVED_TASK: `moved ${t} to ${item.toStatus || 'In Review'}`,
    UPDATED_TASK: `updated task ${t}`,
    COMPLETED_TASK: `completed task ${t}`,
    CREATED_SNIPPET: `added snippet ${t}`,
    CREATED_WIKI: `created wiki page ${t}`,
    UPDATED_WIKI: `updated wiki ${t}`,
    JOINED_PROJECT: `joined project`,
    SENT_MESSAGE: `sent a message`,
  };
  return map[a] || a.toLowerCase().replace(/_/g, ' ') || 'did something';
}
