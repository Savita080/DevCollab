// pages/workspace/WorkspaceLayout.jsx
import { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceRole } from '../../lib/useWorkspaceRole';
import { useWorkspace } from '../../store/workspace';
import { useUI } from '../../store/ui';
import { useAuth } from '../../store/auth';
import { useChat } from '../../store/chat';
import { notifications as notifApi } from '../../lib/api';
import WorkspaceSidebar from '../../components/common/WorkspaceSidebar';
import WorkspaceTopBar from '../../components/common/WorkspaceTopBar';
import { Skeleton } from '../../components/ui/Skeleton';
import ToastStack from '../../components/ui/Toast';
import NotificationPopupStack from '../../components/ui/NotificationPopup';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import s from '../../styles/modules/WorkspaceLayout.module.css';

export default function WorkspaceLayout() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { role, members, loading, isOwner, isAdmin, canManage, canCreate } = useWorkspaceRole(workspaceId);
  const { workspaces: wsList, current, fetchWorkspaces, setWorkspace, refreshProjects } = useWorkspace();
  const { bindNotifications, unbindNotifications, setNotifications, toast } = useUI();
  const { user } = useAuth();
  const { fetchUnread, bindSocket: bindChatSocket } = useChat();

  // Initial workspace data load
  useEffect(() => {
    if (!wsList.length) fetchWorkspaces();
    bindNotifications();
    notifApi.unread()
      .then(({ data }) => setNotifications(data.notifications ?? data ?? []))
      .catch(() => {});
    return () => unbindNotifications();
  }, []);

  // Chat unread bookkeeping — runs once user is known.
  useEffect(() => {
    const uid = user?.id || user?._id;
    if (!uid) return;
    bindChatSocket(uid);
    fetchUnread();
  }, [user?.id, user?._id]);

  // Sync URL → store. workspaceId in the URL may be an _id (legacy) or a slug
  // (pretty URLs), so match against both.
  useEffect(() => {
    if (!workspaceId) return;
    if (current?._id !== workspaceId && current?.slug !== workspaceId) {
      const exists = wsList.find(w => w._id === workspaceId || w.slug === workspaceId);
      if (exists || wsList.length === 0) {
        setWorkspace(workspaceId).catch(() => {});
      } else {
        navigate('/workspaces', { replace: true });
      }
    }
  }, [workspaceId, wsList.length, current?._id, current?.slug]);

  // Listen for project access denied to refresh project list
  useEffect(() => {
    const handler = () => {
      toast("You don't have access to this project.", 'error');
      refreshProjects();
    };
    window.addEventListener('project-access-denied', handler);
    return () => window.removeEventListener('project-access-denied', handler);
  }, []);

  if (loading && !current) {
    return (
      <div className={s.layout}>
        <div className={s.sidebarSkeleton}>
          <Skeleton height={32} style={{ margin: '20px 16px' }} />
          <Skeleton height={28} count={6} style={{ margin: '6px 16px' }} />
        </div>
        <div className={s.right}>
          <div className={s.topbarSkeleton} />
          <div className={s.main}>
            <Skeleton height={32} width="40%" style={{ marginBottom: 24 }} />
            <Skeleton height={120} count={3} style={{ marginBottom: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  const contextVal = {
    workspaceId,
    workspace: current,
    role,
    members,
    isOwner,
    isAdmin,
    canManage,
    canCreate,
  };

  return (
    <>
      {projectId ? (
        <Outlet context={contextVal} />
      ) : (
        <div className={s.layout}>
          <WorkspaceSidebar role={role} />
          <div className={s.right}>
            <WorkspaceTopBar workspace={current} role={role} />
            <main className={s.main}>
              <div className={s.content}>
                <Outlet context={contextVal} />
              </div>
            </main>
          </div>
        </div>
      )}
      <ToastStack />
      <NotificationPopupStack />
      <ConfirmDialog />
    </>
  );
}
