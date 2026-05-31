// pages/project/ProjectLayout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useProjectRole } from '../../lib/useProjectRole';
import { projects as projApi } from '../../lib/api';
import { joinProject, leaveProject } from '../../lib/socket';
import { useTasks } from '../../store/tasks';
import { useWorkspace } from '../../store/workspace';
import ProjectSidebar from '../../components/common/ProjectSidebar';
import WorkspaceTopBar from '../../components/common/WorkspaceTopBar';
import AccessRestricted from '../../components/common/AccessRestricted';
import { Skeleton } from '../../components/ui/Skeleton';
import s from '../../styles/modules/WorkspaceLayout.module.css';

export default function ProjectLayout() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const wsContext = useOutletContext();
  const workspaceRole = wsContext?.role;
  const { projectRole, projectMembers, roleLoading, resolved, hasAccess, isContributor, isProjectViewer, canEdit } =
    useProjectRole(workspaceId, projectId, workspaceRole);
  const { bindSocket, unbindSocket } = useTasks();
  const { setProject: setStoreProject, projects: projList } = useWorkspace();

  // Seed the project optimistically from the already-loaded workspace projects
  // list so a switch paints real data instantly (no fetch wait). The URL token
  // may be a Mongo _id OR a slug, so match against both.
  const seedProject = () => projList.find(p => p._id === projectId || p.slug === projectId) || null;
  const [project, setProject] = useState(seedProject);
  // Only show the content skeleton when we have NOTHING to render yet.
  const [projLoading, setProjLoading] = useState(!seedProject());

  // Fetch project details as background revalidation. If we already have a seed
  // we don't flip projLoading, so the content region never blanks on switch.
  useEffect(() => {
    if (!workspaceId || !projectId) return;
    const seed = seedProject();
    if (seed) { setProject(seed); setProjLoading(false); }
    else setProjLoading(true);

    let cancelled = false;
    projApi.get(workspaceId, projectId)
      .then(({ data }) => {
        if (cancelled) return;
        const p = data.project ?? data;
        setProject(p);
        setStoreProject(p);
      })
      .catch(() => { if (!cancelled && !seed) setProject(null); })
      .finally(() => { if (!cancelled) setProjLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId, projectId]);

  // Keep store in sync if project list loads. projectId from the URL may be
  // either a Mongo _id or a slug, so match against both.
  useEffect(() => {
    const p = projList.find(p => p._id === projectId || p.slug === projectId);
    if (p && p !== project) setStoreProject(p);
  }, [projList, projectId]);

  // Join project socket room. Backend emits to room=canonical _id, so we must
  // join with _id (not the URL token, which may be a slug).
  useEffect(() => {
    const roomId = project?._id;
    if (!roomId) return;
    joinProject(roomId);
    bindSocket();
    return () => {
      leaveProject(roomId);
      unbindSocket();
    };
  }, [project?._id]);

  // Chrome (sidebar + topbar) is ALWAYS rendered and never unmounts on a project
  // switch — it's identical across projects in the same workspace, so blanking it
  // is what made switches feel slow. Only the content region shows a skeleton, and
  // only when we genuinely have nothing yet.
  const showContentSkeleton = projLoading && !project;
  // Show AccessRestricted only once the role fetch has RESOLVED and confirmed no
  // access — never during the in-flight window (avoids a flash on every switch).
  const showRestricted = resolved && !hasAccess;

  return (
    <div className={s.layout}>
      <ProjectSidebar project={project} canEdit={canEdit} role={workspaceRole} />
      <div className={s.right}>
        <WorkspaceTopBar workspace={wsContext?.workspace} role={workspaceRole} />
        <main className={s.main}>
          <div className={s.content}>
            {showRestricted ? (
              <AccessRestricted
                title="Project Access Restricted"
                message="You're not a member of this project. Ask a workspace admin or project contributor to add you."
                onBack={() => navigate(`/workspaces/${workspaceId}/projects`)}
              />
            ) : showContentSkeleton ? (
              <>
                <Skeleton height={32} width="40%" style={{ marginBottom: 24 }} />
                <Skeleton height={200} style={{ marginBottom: 16 }} />
              </>
            ) : (
              <Outlet context={{
                workspaceId,
                projectId,
                project,
                workspace: wsContext?.workspace,
                workspaceRole,
                projectRole,
                projectMembers,
                roleLoading,
                isContributor,
                isProjectViewer,
                canEdit,
                wsMembers: wsContext?.members,
              }} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
