// pages/Kanban.jsx
import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useWorkspace } from '../../store/workspace';
import { useTasks, TASK_COLUMNS, TASK_STATUS_COLORS } from '../../store/tasks';
import { useUI } from '../../store/ui';
import { useAuth } from '../../store/auth';
import { joinProject, leaveProject } from '../../lib/socket';
import { usePresence } from '../../lib/hooks';
import { PriorityChip, Avatar } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { fmtDate, taskAssignees } from '../../lib/utils';
import TaskDetail from '../../components/kanban/TaskDetail';
import MultiAssigneeSelect from '../../components/kanban/MultiAssigneeSelect';
import ProjectMembersModal from '../../components/ProjectMembersModal';
import { workspaces as wsApi, projects as projectsApi } from '../../lib/api';
import s from '../../styles/modules/Kanban.module.css';
import KanbanFilters, { applyFilters, EMPTY_FILTERS } from '../../components/kanban/KanbanFilters';
import KanbanCalendar from '../../components/kanban/KanbanCalendar';

export default function ProjectKanban() {
  const { canEdit, isContributor, workspaceRole } = useOutletContext() || {};
  const { current: ws, currentProject } = useWorkspace();
  const { tasks, fetch, create, move, update, loading, bindSocket, unbindSocket, setMoveRejectHandler, delete: deleteTaskStore } = useTasks();
  const { toast } = useUI();
  const { user } = useAuth();
  const online = usePresence(currentProject?._id);

  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [membersModal, setMembersModal] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState('board');
  const activeFilterCount =
  (filters.assignees?.length || 0) + (filters.priorities?.length || 0) +
  (filters.statuses?.length || 0) + (filters.tags?.length || 0) +
  (filters.deadline ? 1 : 0);

  const handleDeleteTask = async (task) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTaskStore(ws._id, currentProject._id, task._id);
      toast('Task deleted', 'info');
    } catch {
      toast('Failed to delete task', 'error');
    }
  };
  const [wsMembers, setWsMembers] = useState([]);
  const [projMembers, setProjMembers] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'P1',
    dueDate: '', labels: '', assignees: [], status: 'To Do',
  });

  useEffect(() => {
    if (!currentProject || !ws) return;
    fetch(ws._id, currentProject._id);
    joinProject(currentProject._id);
    bindSocket();
    // When the server rejects an optimistic move (e.g. viewer dragging), re-fetch truth
    // and show a friendly toast so the card snaps back instead of staying in the wrong column.
    setMoveRejectHandler(() => {
      toast('You don\'t have permission to move tasks in this project.', 'error');
      fetch(ws._id, currentProject._id);
    });
    // Workspace members feed the assignee dropdown (anyone in the workspace
    // is a valid assignee). Project members feed the @mention dropdown so
    // viewers don't see workspace folks who can't read the project.
    wsApi.members(ws._id)
      .then(({ data }) => setWsMembers(data.members ?? []))
      .catch(() => {});
    projectsApi.members(ws._id, currentProject._id)
      .then(({ data }) => setProjMembers(data.members ?? []))
      .catch(() => setProjMembers([]));
    return () => { leaveProject(currentProject._id); unbindSocket(); };
  }, [currentProject?._id, ws?._id]);

  const filteredTasks = applyFilters(tasks, filters, user?.id || user?._id);
  const columns = TASK_COLUMNS.reduce((acc, col) => ({
    ...acc,
    [col.key]: filteredTasks.filter(t => t.status === col.key),
  }), {});

  const handleDrop = async (status) => {
    if (!canEdit) return;
    if (!dragging || dragging.status === status) return;
    await move(ws._id, currentProject._id, dragging._id, status, currentProject._id);
    setDragging(null);
    setDragOver(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const labels = form.labels.split(',').map(l => l.trim()).filter(Boolean);
      const payload = { ...form, labels };
      await create(ws._id, currentProject._id, payload);
      setCreateModal(false);
      setForm({ title: '', description: '', priority: 'P1', dueDate: '', labels: '', assignees: [], status: 'To Do' });
      toast('Task created', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create task', 'error');
    }
  };

  if (!currentProject) {
    return <div className={s.empty}>Select or create a project to view the Kanban board.</div>;
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Kanban Board</h1>
          <p className={s.project}>{currentProject.name}</p>
        </div>
        <div className={s.headerRight}>
          {online.length > 0 && (
            <div className={s.presence}>
              <span className={s.presenceDot} />
              <span>{online.length} online</span>
            </div>
          )}
          {/* 👇 add this */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
            <button 
              style={{ padding: '4px 12px', fontSize: 13, background: viewMode === 'board' ? 'var(--indigo)' : 'transparent', color: viewMode === 'board' ? 'white' : 'var(--text-2)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: viewMode === 'board' ? 600 : 400 }} 
              onClick={() => setViewMode('board')}>
              Board
            </button>
            <button 
              style={{ padding: '4px 12px', fontSize: 13, background: viewMode === 'calendar' ? 'var(--indigo)' : 'transparent', color: viewMode === 'calendar' ? 'white' : 'var(--text-2)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: viewMode === 'calendar' ? 600 : 400 }} 
              onClick={() => setViewMode('calendar')}>
              Calendar
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(f => !f)}>
            Filters {activeFilterCount > 0 && <span className={s.filterBadge}>{activeFilterCount}</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMembersModal(true)}>
            Members
          </Button>
          {canEdit && (
            <Button variant="primary" size="sm" onClick={() => setCreateModal(true)}>
              + New Task
            </Button>
          )}
        </div>
      </div>

      {/* Board */}
      {showFilters && (
        <KanbanFilters
          wsMembers={projMembers}  
          allTasks={tasks}
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
      {viewMode === 'board' ? (
        <div className={s.board}>
          {TASK_COLUMNS.map(col => (
            <div
              key={col.key}
              className={`${s.column} ${dragOver === col.key ? s.dragOver : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
              onDrop={() => handleDrop(col.key)}
              onDragLeave={() => setDragOver(null)}
            >
              <div className={s.colHeader} style={{ '--c': TASK_STATUS_COLORS[col.key] }}>
                <div className={s.colDot} />
                <span className={s.colName}>{col.label}</span>
                <span className={s.colCount}>{columns[col.key]?.length ?? 0}</span>
              </div>

              <div className={s.cards}>
                {loading && (columns[col.key]?.length ?? 0) === 0 && (
                  <><SkeletonCard /><SkeletonCard /></>
                )}
                {(columns[col.key] || []).map(task => {
                  // Resolve each assignee to a display name/avatar, falling back to
                  // the workspace member list when the task only carries ids.
                  const assigneeUsers = taskAssignees(task).map(a => {
                    if (a.name) return a;
                    const m = wsMembers.find(m => m.user?._id === (a._id || a));
                    return m ? { _id: m.user._id, name: m.user.name, avatar: m.user.avatar } : a;
                  });
                  return (
                    <div
                      key={task._id}
                      className={`${s.card} ${dragging?._id === task._id ? s.dragging : ''}`}
                      draggable={canEdit}
                      onDragStart={canEdit ? () => setDragging(task) : undefined}
                      onDragEnd={canEdit ? () => setDragging(null) : undefined}
                      onClick={() => {
                        setDetailEditMode(false);
                        setDetailTask(task);
                      }}
                    >
                      <div className={s.cardHeader}>
                        <p className={s.taskTitle}>{task.title}</p>
                        {canEdit && (
                          <div className={s.cardActions}>
                            <button
                              className={s.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailEditMode(true);
                                setDetailTask(task);
                              }}
                              title="Edit Task"
                            >
                              ✎
                            </button>
                            <button
                              className={`${s.actionBtn} ${s.deleteBtn}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task);
                              }}
                              title="Delete Task"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                      {task.description && (
                        <p className={s.taskDesc}>{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</p>
                      )}
                      <div className={s.cardMeta}>
                        <PriorityChip priority={task.priority} />
                        {task.dueDate && (
                          <span className={s.due}>{fmtDate(task.dueDate)}</span>
                        )}
                      </div>
                      {task.labels?.length > 0 && (
                        <div className={s.labels}>
                          {task.labels.map(l => (
                            <span key={l} className={s.label}>{l}</span>
                          ))}
                        </div>
                      )}
                      {/* Assignees */}
                      {assigneeUsers.length > 0 && (
                        <div className={s.cardAssignee}>
                          <div style={{ display: 'flex', paddingLeft: 6 }}>
                            {assigneeUsers.slice(0, 4).map((u, i) => (
                              <div key={u._id || i} style={{ display: 'flex', marginLeft: -6, border: '2px solid var(--bg)', borderRadius: '50%', zIndex: assigneeUsers.length - i }}>
                                <Avatar name={u.name} src={u.avatar} size={20} />
                              </div>
                            ))}
                          </div>
                          <span className={s.assigneeName}>
                            {assigneeUsers.length === 1
                              ? assigneeUsers[0].name
                              : `${assigneeUsers.length} assignees`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <KanbanCalendar 
          tasks={filteredTasks} 
          onTaskClick={(task) => {
            setDetailEditMode(false);
            setDetailTask(task);
          }}
          onTaskDrop={async (taskId, newDate) => {
            await update(ws._id, currentProject._id, taskId, { dueDate: newDate });
          }}
        />
      )}

      {/* Create task modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Task">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Input label="Title" placeholder="Implement login flow" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" placeholder="What needs to be done?" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Select label="Initial Status" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            options={TASK_COLUMNS.map(c => ({ value: c.key, label: c.label }))} />
          <Select label="Priority" value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            options={['P0', 'P1', 'P2']} />
          {/* Assignees (multiple) */}
          <MultiAssigneeSelect
            members={projMembers}
            value={form.assignees}
            onChange={(next) => setForm(f => ({ ...f, assignees: next }))}
          />
          <Input label="Labels (comma separated)" placeholder="frontend, bug, auth"
            value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} />
          <Input label="Due date" type="date" value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          <Button type="submit" variant="primary" size="md">Create Task</Button>
        </form>
      </Modal>

      {/* Task detail */}
      {detailTask && (
        <TaskDetail
          task={detailTask}
          wsMembers={wsMembers}
          mentionMembers={projMembers}
          canEdit={canEdit}
          initialEditing={detailEditMode}
          onClose={() => setDetailTask(null)}
        />
      )}

      {/* Project members */}
      <ProjectMembersModal
        open={membersModal}
        onClose={() => setMembersModal(false)}
        workspace={ws}
        project={currentProject}
        currentUserId={user?.id || user?._id}
        workspaceRole={workspaceRole}
      />
    </div>
  );
}
