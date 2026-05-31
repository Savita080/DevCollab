// lib/useProjectRole.js — project role with Super Admin Bypass
import { useState, useEffect } from 'react';
import { projects as projApi } from './api';
import { useAuth } from '../store/auth';

export function useProjectRole(workspaceId, projectId, workspaceRole) {
  const { user } = useAuth();
  const [projectRole, setProjectRole] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  // roleLoading is a NON-blocking signal — the layout no longer gates its whole
  // render on it. It only governs role-dependent bits once resolved.
  const [roleLoading, setRoleLoading] = useState(true);
  // resolved = the members fetch has actually completed (success or fail). Until
  // then we must NOT decide "no access" for a non-ws-admin, to avoid a flash of
  // AccessRestricted while the fetch is in flight.
  const [resolved, setResolved] = useState(false);
  const [memberHasAccess, setMemberHasAccess] = useState(false);

  // Workspace OWNER/ADMIN have access immediately, before any fetch resolves.
  const wsLevel = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  useEffect(() => {
    if (!workspaceId || !projectId || !user) { setRoleLoading(false); setResolved(true); return; }

    let cancelled = false;
    setRoleLoading(true);
    setResolved(false);
    projApi.members(workspaceId, projectId)
      .then(({ data }) => {
        if (cancelled) return;
        const list = data.members ?? data;
        setProjectMembers(list);
        const uid = user.id || user._id;
        const me = list.find(m => (m.user?._id || m.user) === uid);
        setProjectRole(me?.role || null);
        setMemberHasAccess(!!me?.role);
      })
      .catch(() => {
        if (cancelled) return;
        setProjectRole(null);
        setProjectMembers([]);
        setMemberHasAccess(false);
      })
      .finally(() => {
        if (cancelled) return;
        setRoleLoading(false);
        setResolved(true);
      });
    return () => { cancelled = true; };
  }, [workspaceId, projectId, user?.id, user?._id, workspaceRole]);

  const isContributor   = projectRole === 'CONTRIBUTOR' || wsLevel;
  const isProjectViewer = projectRole === 'VIEWER' && !wsLevel;

  // Access is granted if you're a ws admin (known instantly) OR you're a project
  // member (known after fetch). While the fetch is in flight for a non-admin,
  // `resolved` is false so the layout shows content (optimistic) rather than the
  // restricted screen — the screen only appears once we KNOW there's no access.
  const hasAccess = wsLevel || memberHasAccess;

  return {
    projectRole,
    projectMembers,
    roleLoading,
    resolved,
    hasAccess,
    isContributor,
    isProjectViewer,
    canEdit: isContributor,
  };
}
