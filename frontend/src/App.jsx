// App.jsx — hierarchical routing: /workspaces (master) → /workspaces/:wsId/* → .../projects/:projectId/*
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import { listenServiceWorkerNav } from './lib/webpush';

import PaywallModal from './components/PaywallModal';
import ToastStack from './components/ui/Toast';
import NotificationPopupStack from './components/ui/NotificationPopup';
import ConfirmDialog from './components/ui/ConfirmDialog';

import LandingPage  from './pages/LandingPage';
import Login        from './pages/Login';
import Register     from './pages/Register';
import AcceptInvite from './pages/AcceptInvite';
import Profile      from './pages/Profile';
import Subscribe    from './pages/Subscribe';
import About        from './pages/About';
import Contact      from './pages/Contact';

// Workspace tier
import Workspaces        from './pages/workspace/Workspaces';
import WorkspaceLayout   from './pages/workspace/WorkspaceLayout';
import WorkspaceOverview from './pages/workspace/WorkspaceOverview';
import WorkspaceProjects from './pages/workspace/WorkspaceProjects';
import WorkspaceChat     from './pages/workspace/WorkspaceChat';
import WorkspaceMembers  from './pages/workspace/WorkspaceMembers';
import WorkspaceActivity from './pages/workspace/WorkspaceActivity';
import WorkspaceSettings from './pages/workspace/WorkspaceSettings';
import WorkspaceBilling  from './pages/workspace/WorkspaceBilling';

// Project tier
import ProjectLayout      from './pages/project/ProjectLayout';
import ProjectOverview    from './pages/project/ProjectOverview';
import ProjectKanban      from './pages/project/ProjectKanban';
import ProjectChat        from './pages/project/ProjectChat';
import ProjectWiki        from './pages/project/ProjectWiki';
import ProjectSnippets    from './pages/project/ProjectSnippets';
import ProjectArtifacts   from './pages/project/ProjectArtifacts';
import ProjectWhiteboards from './pages/project/ProjectWhiteboards';
import ProjectAI          from './pages/project/ProjectAI';
import ProjectActivity    from './pages/project/ProjectActivity';
import ProjectMembers     from './pages/project/ProjectMembers';
import ProjectSettings    from './pages/project/ProjectSettings';

function Guard({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="app-loading"><span>RC</span></div>;
  return token ? children : <Navigate to="/login" replace />;
}

function ProtectedRoot({ children }) {
  return (
    <Guard>
      {children}
      <PaywallModal />
      <ToastStack />
      <NotificationPopupStack />
      <ConfirmDialog />
    </Guard>
  );
}

function ServiceWorkerNav() {
  const navigate = useNavigate();
  useEffect(() => { listenServiceWorkerNav(navigate); }, []);
  return null;
}

export default function App() {
  const { init } = useAuth();
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <ServiceWorkerNav />
      <PaywallModal />
      <Routes>
        {/* Public */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/about"    element={<About />} />
        <Route path="/contact"  element={<Contact />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite/accept/:token" element={<AcceptInvite />} />

        {/* Authenticated user-only pages (no workspace chrome) */}
        <Route
          path="/profile"
          element={
            <ProtectedRoot>
              <Profile />
            </ProtectedRoot>
          }
        />
        <Route
          path="/subscribe"
          element={
            <ProtectedRoot>
              <Subscribe />
            </ProtectedRoot>
          }
        />

        {/* Master workspaces dashboard (no chrome) */}
        <Route
          path="/workspaces"
          element={
            <ProtectedRoot>
              <Workspaces />
            </ProtectedRoot>
          }
        />

        {/* Workspace tier */}
        <Route
          path="/workspaces/:workspaceId"
          element={
            <Guard>
              <WorkspaceLayout />
              <PaywallModal />
            </Guard>
          }
        >
          <Route index element={<WorkspaceOverview />} />
          <Route path="projects" element={<WorkspaceProjects />} />
          <Route path="chat"     element={<WorkspaceChat />} />
          <Route path="members"  element={<WorkspaceMembers />} />
          <Route path="activity" element={<WorkspaceActivity />} />
          <Route path="settings" element={<WorkspaceSettings />} />
          <Route path="billing"  element={<WorkspaceBilling />} />

          {/* Project tier — nested under workspace */}
          <Route path="projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<ProjectOverview />} />
            <Route path="kanban"      element={<ProjectKanban />} />
            <Route path="chat"        element={<ProjectChat />} />
            <Route path="wiki"        element={<ProjectWiki />} />
            <Route path="snippets"    element={<ProjectSnippets />} />
            <Route path="artifacts"   element={<ProjectArtifacts />} />
            <Route path="whiteboards" element={<ProjectWhiteboards />} />
            <Route path="ai"          element={<ProjectAI />} />
            <Route path="activity"    element={<ProjectActivity />} />
            <Route path="members"     element={<ProjectMembers />} />
            <Route path="settings"    element={<ProjectSettings />} />
          </Route>
        </Route>

        {/* Legacy routes → workspaces master */}
        <Route path="/dashboard" element={<Navigate to="/workspaces" replace />} />
        <Route path="/kanban"    element={<Navigate to="/workspaces" replace />} />
        <Route path="/snippets"  element={<Navigate to="/workspaces" replace />} />
        <Route path="/wiki"      element={<Navigate to="/workspaces" replace />} />
        <Route path="/activity"  element={<Navigate to="/workspaces" replace />} />
        <Route path="/collab"    element={<Navigate to="/workspaces" replace />} />
        <Route path="/ai"        element={<Navigate to="/workspaces" replace />} />
        <Route path="/members"   element={<Navigate to="/workspaces" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
