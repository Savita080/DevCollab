// pages/workspace/WorkspaceProjects.jsx — list of projects in workspace
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Trash2, Edit3, Users as UsersIcon, Lock } from 'lucide-react';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { tasks as tasksApi, projects as projectsApi } from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import ProjectMembersModal from '../../components/ProjectMembersModal';
import s from '../../styles/modules/WorkspaceProjects.module.css';

const PROJECT_COLORS = ['#6366f1', '#00d4ff', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function WorkspaceProjects() {
  const { workspaceId, workspace, role: workspaceRole, isAdmin, canCreate, members } = useOutletContext();
  const { projects, projectsWorkspaceId, refreshProjects, createProject } = useWorkspace();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [stats, setStats] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');
  const [renameProj, setRenameProj] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [membersProj, setMembersProj] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPos, setMenuPos] = useState(null); // { top, right } in viewport coords
  const menuBtnRefs = useRef({}); // projectId -> button DOM node

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => { setMenuOpen(null); setMenuPos(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [menuOpen]);

  useEffect(() => { refreshProjects(); }, [workspaceId]);

  // Per-project task counts — skip projects this user has no access to (would 403).
  // Guarded on projectsWorkspaceId matching the workspace in view — `projects`
  // can briefly hold the previous workspace's list right after navigating
  // (child effects run before the parent's setWorkspace call resolves).
  useEffect(() => {
    if (!workspace?._id || projectsWorkspaceId !== workspace._id) return;
    projects.forEach(async (p) => {
      if (p.hasAccess === false) {
        setStats(prev => ({ ...prev, [p._id]: { total: 0, done: 0, pct: 0 } }));
        return;
      }
      try {
        const { data } = await tasksApi.list(workspaceId, p._id);
        const list = data.tasks ?? data ?? [];
        const total = list.length;
        const done = list.filter(t => t.status === 'Done' || t.status === 'DONE').length;
        setStats(prev => ({ ...prev, [p._id]: { total, done, pct: total ? Math.round(done / total * 100) : 0 } }));
      } catch {
        setStats(prev => ({ ...prev, [p._id]: { total: 0, done: 0, pct: 0 } }));
      }
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
    } finally { setCreating(false); }
  };

  const closeCreate = () => { setCreateOpen(false); setNameError(''); setNewName(''); setDescription(''); };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameProj || !renameName.trim()) return;
    try {
      await projectsApi.update(workspaceId, renameProj._id, { name: renameName.trim() });
      setRenameProj(null);
      toast('Renamed', 'success');
      refreshProjects();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (p) => {
    if (!(await confirm(`Delete project "${p.name}"? This will remove all its tasks, wiki pages, and snippets.`))) return;
    try {
      await projectsApi.delete(workspaceId, p._id);
      toast('Project deleted', 'success');
      refreshProjects();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    }
  };

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Projects</h1>
          <p className={s.subtitle}>{projects.length} project{projects.length !== 1 ? 's' : ''} in {workspace?.name || 'this workspace'}</p>
        </div>
        {canCreate && (
          <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New Project
          </Button>
        )}
      </div>

      {/* Search */}
      <div className={s.searchRow}>
        <div className={s.searchWrap}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.search}
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className={s.empty}>
          <h3>No projects yet.</h3>
          <p>Create your first project to get started.</p>
          {canCreate && (
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className={s.grid}>
          {filtered.map((p, i) => {
            const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
            const st = stats[p._id];
            const totalTasks = st?.total ?? '…';
            const pct = st?.pct ?? 0;
            const done = st?.done ?? 0;
            const locked = p.hasAccess === false;
            // Show actions menu to WS admins and to the project creator (so they
            // can delete a project they created even if they're not a WS admin).
            const myId = user?.id || user?._id;
            const creatorId = p.createdBy?._id || p.createdBy;
            const iAmCreator = !!(myId && creatorId && creatorId.toString() === myId.toString());
            const showMenu = isAdmin || iAmCreator;

            return (
              <div key={p._id} className={s.card} style={{ '--c': color, opacity: locked ? 0.7 : 1 }}>
                <button
                  className={s.cardBody}
                  onClick={() => navigate(`/workspaces/${workspaceId}/projects/${p.slug || p._id}`)}
                  title={locked ? 'You don\'t have access to this project. Ask a contributor to add you.' : undefined}
                >
                  <div className={s.cardHead}>
                    <span className={s.dot} style={{ background: color }} />
                    <span className={s.name}>{p.name}</span>
                    {locked && <Lock size={12} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />}
                  </div>
                  <div className={s.metaRow}>
                    <span className={s.meta}>{totalTasks} task{totalTasks === 1 ? '' : 's'}</span>
                    <span className={s.metaDot}>·</span>
                    <span className={s.meta}>{done} done</span>
                  </div>
                  <div className={s.progressBar}>
                    <div className={s.progressFill} style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className={s.pct}>{pct}% complete</div>
                </button>

                {showMenu && (
                  <div className={s.menuWrap}>
                    <button
                      ref={(el) => { if (el) menuBtnRefs.current[p._id] = el; }}
                      className={s.menuBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (menuOpen === p._id) { setMenuOpen(null); setMenuPos(null); return; }
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                        setMenuOpen(p._id);
                      }}
                      title="Project actions"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuOpen === p._id && menuPos && createPortal(
                      <div
                        className={s.menu}
                        style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <button onClick={() => { setMenuOpen(null); setMenuPos(null); setMembersProj(p); }}>
                          <UsersIcon size={13} /> Manage Members
                        </button>
                        <button onClick={() => { setMenuOpen(null); setMenuPos(null); setRenameProj(p); setRenameName(p.name); }}>
                          <Edit3 size={13} /> Rename
                        </button>
                        {(isAdmin || iAmCreator) && (
                          <button className={s.danger} onClick={() => { setMenuOpen(null); setMenuPos(null); handleDelete(p); }}>
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {canCreate && (
            <button className={s.newCard} onClick={() => setCreateOpen(true)}>
              <Plus size={20} />
              <span>New Project</span>
            </button>
          )}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className={s.modalOverlay} onClick={closeCreate}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>Create Project</h3>
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

      {/* Rename modal */}
      {renameProj && (
        <div className={s.modalOverlay} onClick={() => setRenameProj(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>Rename Project</h3>
            <form onSubmit={handleRename} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="New name" value={renameName} onChange={e => setRenameName(e.target.value)} required autoFocus />
              <div className={s.modalActions}>
                <Button type="button" variant="ghost" onClick={() => setRenameProj(null)}>Cancel</Button>
                <Button type="submit" variant="primary">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProjectMembersModal
        open={!!membersProj}
        onClose={() => setMembersProj(null)}
        workspace={workspace}
        project={membersProj}
        currentUserId={user?.id || user?._id}
        workspaceRole={workspaceRole}
      />
    </div>
  );
}
