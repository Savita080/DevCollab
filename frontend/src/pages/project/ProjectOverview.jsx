// pages/Dashboard.jsx
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useWorkspace } from '../../store/workspace';
import { useTasks } from '../../store/tasks';
import { useUI } from '../../store/ui';
import { activity as activityApi, workspaces as wsApi, projects as projApi, ai as aiApi } from '../../lib/api';
import { useWorkspaceRole } from '../../lib/useWorkspaceRole';
import { usePresence } from '../../lib/hooks';
import { joinProject, leaveProject } from '../../lib/socket';
import { fmtRelative, taskAssigneeIds } from '../../lib/utils';
import { Avatar } from '../../components/ui/Badge';
import PresenceBar from '../../components/ui/PresenceBar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import ProjectMembersModal from '../../components/ProjectMembersModal';
import { StatCard, TaskIcon, CheckIcon, OnlineIcon, BlockerIcon } from '../../components/overview/OverviewStats';
import s from '../../styles/modules/Dashboard.module.css';

const PROJECT_COLORS = ['var(--indigo)','var(--cyan)','var(--green)','var(--amber)','var(--pink)','var(--violet)'];
const STATUS_COLORS = { 'To Do': 'var(--indigo)', 'In Progress': 'var(--amber)', 'In Review': 'var(--cyan)', 'Done': 'var(--green)' };

export default function ProjectOverview() {
  const { canEdit } = useOutletContext() || {};
  const { user } = useAuth();
  const { toast } = useUI();
  const { current: ws, currentProject, projects, createWorkspace, createProject } = useWorkspace();
  const { role: workspaceRole } = useWorkspaceRole(ws?._id);
  const { tasks, fetch: fetchTasks } = useTasks();
  const online = usePresence(currentProject?._id);
  const navigate = useNavigate();

  const [feed, setFeed] = useState([]);
  const [members, setMembers] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [standup, setStandup] = useState(null);
  const [loadingStandup, setLoadingStandup] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [wsModal, setWsModal] = useState(false);
  const [projModal, setProjModal] = useState(false);
  const [membersModal, setMembersModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ws || !currentProject) return;
    fetchTasks(ws._id, currentProject._id);
    activityApi.list(ws._id, currentProject._id, { limit: 6 })
      .then(({ data }) => setFeed(data.activities ?? data))
      .catch(() => {});
    wsApi.members(ws._id)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => {});
    projApi.members(ws._id, currentProject._id)
      .then(({ data }) => setProjectMembers(data.members ?? []))
      .catch(() => setProjectMembers([]));
  }, [ws?._id, currentProject?._id]);

  // Join project room so presence:update broadcasts reach the dashboard.
  useEffect(() => {
    const pid = currentProject?._id;
    if (!pid) return;
    joinProject(pid);
    return () => leaveProject(pid);
  }, [currentProject?._id]);

  const onlineUsers = usePresence(currentProject?._id);

  const fetchStandup = useCallback(async () => {
    if (!ws || !currentProject) return;
    setLoadingStandup(true);
    try {
      const { data } = await aiApi.standup(ws._id, currentProject._id);
      setStandup(data);
    } catch { setStandup(null); }
    finally { setLoadingStandup(false); }
  }, [ws?._id, currentProject?._id]);

  const handleCreateWs = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await createWorkspace({ name: wsName, description: wsDesc }); setWsName(''); setWsDesc(''); setWsModal(false); toast('Workspace created!', 'success'); }
    catch (err) { toast(err?.response?.data?.message || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleCreateProj = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await createProject({ name: projName, description: projDesc }); setProjName(''); setProjDesc(''); setProjModal(false); toast('Project created!', 'success'); }
    catch (err) { toast(err?.response?.data?.message || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  // Derived stats
  const activeTasks  = tasks.filter(t => t.status !== 'Done').length;
  const doneTasks    = tasks.filter(t => t.status === 'Done').length;
  const blockers     = tasks.filter(t => t.priority === 'P0' && t.status !== 'Done').length;
  const myId         = user?.id || user?._id;
  const myTasks      = tasks.filter(t => { const ids = taskAssigneeIds(t); return ids.length === 0 || ids.includes(myId?.toString()); }).slice(0, 5);

  // Sprint progress per project
  const sprintProgress = projects.map((p, i) => {
    const projectTasks = tasks.filter(t => t.project === p._id);
    const done = projectTasks.filter(t => t.status === 'Done').length;
    const total = projectTasks.length || 1;
    return { name: p.name, pct: Math.round(done / total * 100), color: PROJECT_COLORS[i % PROJECT_COLORS.length] };
  });

  const greeting = getGreeting();

  return (
    <>
      {online.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            In this project
          </span>
          <PresenceBar users={online} size={28} label="online" />
        </div>
      )}
      <div className={s.page}>
        {/* ── Header ── */}
      <div className={s.header}>
        <div>
          <h1 className={s.greeting}>
            {greeting}, <span className={s.name}>{user?.name?.split(' ')[0] || 'there'}</span>
            <span className={s.sparkle}> ✳</span>
          </h1>
          <p className={s.meta}>
            {ws?.name || 'No workspace'}
            {projects.length > 0 && <> • <strong>{projects.length} project{projects.length !== 1 ? 's' : ''} active</strong></>}
            {currentProject && <> • {currentProject.name}</>}
          </p>
        </div>
        <div className={s.headerBtns}>
          <Button variant="ghost" size="sm" onClick={() => ws && currentProject && navigate(`/workspaces/${ws.slug || ws._id}/projects/${currentProject.slug || currentProject._id}/kanban`)}>
            + New Task
          </Button>
          <Button variant="cyan" size="sm" onClick={fetchStandup}>
            + Ask Octo
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className={s.statGrid}>
        <StatCard
          icon={<TaskIcon />}
          num={activeTasks}
          label="ACTIVE TASKS"
          sub={`↑ ${activeTasks} open`}
          color="var(--indigo)"
          bg="var(--accent-soft)"
        />
        <StatCard
          icon={<CheckIcon />}
          num={doneTasks}
          label="DONE THIS WEEK"
          sub="↑ +18% velocity"
          color="var(--status-success)"
          bg="var(--accent-soft)"
        />
        <StatCard
          icon={<OnlineIcon />}
          num={members.length}
          label="TEAM MEMBERS"
          sub="● Active workspace"
          color="var(--cyan)"
          bg="var(--accent-soft)"
        />
        <StatCard
          icon={<BlockerIcon />}
          num={blockers}
          label="BLOCKERS"
          sub={blockers > 0 ? "Needs attention" : "All clear ✓"}
          color={blockers > 0 ? "var(--status-warning)" : "var(--status-success)"}
          bg="var(--accent-soft)"
        />
      </div>

      {/* ── Mid row: Activity Feed + Who's Online ── */}
      <div className={s.midGrid}>
        {/* Activity Feed */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>ACTIVITY FEED</span>
            <Link to={ws ? `/workspaces/${ws.slug || ws._id}/activity` : '#'} className={s.viewAll}>View All</Link>
          </div>
          <div className={s.feedList}>
            {feed.length === 0 && (
              <p className={s.emptyFeed}>No recent activity. Start building!</p>
            )}
            {feed.map((item, i) => (
              <div key={item._id || i} className={s.feedItem}>
                <Avatar name={item.user?.name || '?'} src={item.user?.avatar} size={30} />
                <div className={s.feedContent}>
                  <p className={s.feedMsg}>
                    <strong>{item.user?.name || 'Someone'}</strong>
                    {' '}
                    {getFeedLabel(item)}
                  </p>
                  <span className={s.feedTime}>{fmtRelative(item.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Who's Online — scoped to project members, with real presence */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>WHO'S ONLINE</span>
            <span className={s.onlinePill}>{onlineUsers.length} Active</span>
          </div>
          <div className={s.onlineList}>
            {!currentProject && <p className={s.emptyFeed}>Select a project to see who's online.</p>}
            {currentProject && projectMembers.length === 0 && <p className={s.emptyFeed}>No project members.</p>}
            {currentProject && projectMembers.slice(0, 6).map((m, i) => {
              const memberId = m.user?._id || m.user;
              const isMe = memberId === user?.id || memberId === user?._id;
              const isOnline = onlineUsers.some(u => u._id === memberId);
              return (
                <div key={memberId || i} className={s.onlineMember}>
                  <span
                    className={s.onlineDot}
                    style={{ background: isOnline ? 'var(--green)' : 'var(--text-3)', opacity: isOnline ? 1 : 0.4 }}
                  />
                  <Avatar name={m.user?.name || '?'} src={m.user?.avatar} size={28} online={isOnline} />
                  <div className={s.onlineInfo}>
                    <strong className={s.onlineName}>
                      {m.user?.name || 'Unknown'}{isMe ? ' (You)' : ''}
                    </strong>
                    <span className={s.onlineStatus}>{m.role}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom row: My Tasks + Sprint Progress + Octo Standup ── */}
      <div className={s.botGrid}>
        {/* My Tasks */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>MY TASKS</span>
            <Link to={ws && currentProject ? `/workspaces/${ws.slug || ws._id}/projects/${currentProject.slug || currentProject._id}/kanban` : '#'} className={s.viewAll}>Open Board</Link>
          </div>
          <div className={s.taskList}>
            {myTasks.length === 0 && <p className={s.emptyFeed}>No tasks assigned yet.</p>}
            {myTasks.map(t => (
              <div key={t._id} className={s.taskRow}>
                <span className={s.taskDot} style={{ background: STATUS_COLORS[t.status] || 'var(--indigo)' }} />
                <span className={s.taskName}>{t.title}</span>
                <span className={s.taskStatus} style={{ '--c': STATUS_COLORS[t.status] || 'var(--indigo)' }}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sprint Progress */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>PROJECT PROGRESS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentProject && (
                <button
                  id="project-members-btn"
                  onClick={() => setMembersModal(true)}
                  className={s.membersBtn}
                  title="Manage project members"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Members
                </button>
              )}
              <span className={s.dayBadge}>All time</span>
            </div>
          </div>
          <div className={s.progressSection}>
            {/* Overall */}
            <div className={s.progressRow}>
              <div className={s.progressMeta}>
                <span className={s.progressLabel}>Overall</span>
                <span className={s.progressPct}>
                  {sprintProgress.length > 0
                    ? Math.round(sprintProgress.reduce((a, p) => a + p.pct, 0) / sprintProgress.length)
                    : 0}%
                </span>
              </div>
              <div className={s.progressBar}>
                <div className={s.progressFill}
                  style={{
                    width: `${sprintProgress.length > 0 ? Math.round(sprintProgress.reduce((a, p) => a + p.pct, 0) / sprintProgress.length) : 0}%`,
                    background: 'linear-gradient(90deg, var(--indigo), var(--cyan))'
                  }}
                />
              </div>
            </div>
            {sprintProgress.map((p, i) => (
              <div key={projects[i]?._id || p.name} className={s.progressRow}>
                <div className={s.progressMeta}>
                  <span className={s.progressLabel}>{p.name}</span>
                  <span className={s.progressPct}>{p.pct}%</span>
                </div>
                <div className={s.progressBar}>
                  <div className={s.progressFill} style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
            {sprintProgress.length === 0 && (
              <p className={s.emptyFeed}>No projects yet. <button onClick={() => setProjModal(true)} className={s.inlineBtn}>Create one</button></p>
            )}
          </div>
        </div>

        {/* Octo's Standup */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>✦ OCTO'S STANDUP</span>
            <span className={s.autoBadge}>Auto-generated</span>
          </div>
          {!standup && !loadingStandup && (
            <div className={s.standupEmpty}>
              <p>AI-powered daily standup for your team.</p>
              <Button variant="ghost" size="sm" onClick={fetchStandup} style={{ marginTop: 12 }}>
                Generate Standup
              </Button>
            </div>
          )}
          {loadingStandup && (
            <div className={s.standupLoading}>
              <div className={s.loadDot} />
              <div className={s.loadDot} />
              <div className={s.loadDot} />
              <span>Octo is thinking…</span>
            </div>
          )}
          {standup && !loadingStandup && (
            <div className={s.standupBody}>
              {standup.done && (
                <div className={s.standupSection}>
                  <span className={s.standupTag} style={{ color: 'var(--status-success)' }}>DONE</span>
                  <p className={s.standupText}>{standup.done}</p>
                </div>
              )}
              {standup.today && (
                <div className={s.standupSection}>
                  <span className={s.standupTag} style={{ color: 'var(--indigo)' }}>TODAY</span>
                  <p className={s.standupText}>{standup.today}</p>
                </div>
              )}
              {standup.blockers && (
                <div className={s.standupSection}>
                  <span className={s.standupTag} style={{ color: 'var(--status-warning)' }}>BLOCKED</span>
                  <p className={s.standupText}>{standup.blockers}</p>
                </div>
              )}
              {standup.summary && (
                <div className={s.standupSection}>
                  <p className={s.standupText}>{standup.summary}</p>
                </div>
              )}
              <Link to={ws && currentProject ? `/workspaces/${ws.slug || ws._id}/projects/${currentProject.slug || currentProject._id}/ai` : '#'} className={s.fullAI}>Full AI Panel →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Workspace modal */}
      <Modal open={wsModal} onClose={() => { setWsModal(false); setWsName(''); setWsDesc(''); }} title="Create Workspace" size="sm">
        <form onSubmit={handleCreateWs} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Input label="Workspace name" placeholder="DevFusion Team" value={wsName}
            onChange={e => setWsName(e.target.value)} required />
          <Textarea label="Description" placeholder="Describe your workspace (optional)" value={wsDesc}
            onChange={e => setWsDesc(e.target.value)} rows={3} />
          <div className={s.modalActions}>
            <Button type="button" variant="ghost" onClick={() => { setWsModal(false); setWsName(''); setWsDesc(''); }}>Cancel</Button>
            <Button type="submit" variant="cyan" size="md" loading={loading}>Create Workspace</Button>
          </div>
        </form>
      </Modal>

      {/* Project modal */}
      <Modal open={projModal} onClose={() => { setProjModal(false); setProjName(''); setProjDesc(''); }} title="Create Project" size="sm">
        <form onSubmit={handleCreateProj} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Input label="Project name" placeholder="Auth System" value={projName}
            onChange={e => setProjName(e.target.value)} required />
          <Textarea label="Description" placeholder="Describe your project (optional)" value={projDesc}
            onChange={e => setProjDesc(e.target.value)} rows={3} />
          <div className={s.modalActions}>
            <Button type="button" variant="ghost" onClick={() => { setProjModal(false); setProjName(''); setProjDesc(''); }}>Cancel</Button>
            <Button type="submit" variant="primary" size="md" loading={loading}>Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* Project Members modal */}
      <ProjectMembersModal
        open={membersModal}
        onClose={() => setMembersModal(false)}
        workspace={ws}
        project={currentProject}
        currentUserId={user?.id || user?._id}
        workspaceRole={workspaceRole}
      />
    </div>
    </>
  );
}

/* ── Helpers ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFeedLabel(item) {
  const a = item.action || '';
  const t = item.targetName ? `"${item.targetName}"` : '';
  const map = {
    CREATED_TASK: `created task ${t}`,
    MOVED_TASK:   `moved ${t} to ${item.toStatus || 'In Review'}`,
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
