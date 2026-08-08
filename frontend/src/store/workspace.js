// store/workspace.js
import { create } from 'zustand';
import { workspaces, projects } from '../lib/api';

// Bumped on every setWorkspace()/refreshProjects() call. If a switch fires
// while a previous one's request is still in flight, the two responses can
// resolve out of order — without this guard, an older (slower) response can
// land after a newer one and overwrite the store with the wrong workspace's
// projects. Each call captures the token before awaiting and only applies
// its result if it's still the most recent call when the response arrives.
let switchToken = 0;

export const useWorkspace = create((set, get) => ({
  workspaces: [],
  current: null,       // active workspace
  projects: [],
  // Which workspace `projects` was fetched for. React fires child effects
  // before parent effects in the same commit, so a child that reads
  // `projects` on mount can run before `setWorkspace` (called from the
  // parent layout's effect) has updated it — compare this against
  // `current._id` before trusting `projects`.
  projectsWorkspaceId: null,
  currentProject: null,
  loading: false,

  fetchWorkspaces: async () => {
    set({ loading: true });
    const { data } = await workspaces.list();
    const list = data.workspaces ?? data;
    set({ workspaces: list, loading: false });
    const currentId = get().current?._id;
    const targetId = currentId && list.find(w => w._id === currentId) ? currentId : list[0]?._id;
    if (targetId) get().setWorkspace(targetId);
  },

  // id may be a Mongo _id or a slug — match against both.
  setWorkspace: async (id) => {
    const ws = get().workspaces.find(w => w._id === id || w.slug === id);
    // Clear the previous workspace's projects immediately — otherwise
    // components reading `currentProject`/`projects` render the old
    // workspace's data (and fire requests scoped to it) during the gap
    // before the new workspace's project list arrives.
    const isSwitchingWorkspace = get().current?._id !== ws?._id;
    set({
      current: ws,
      ...(isSwitchingWorkspace ? { projects: [], currentProject: null, projectsWorkspaceId: null } : {}),
    });
    const myToken = ++switchToken;
    const lookup = ws?._id || id;
    const { data } = await projects.list(lookup);
    if (myToken !== switchToken) return; // a newer switch superseded this one
    const list = data.projects ?? data;
    set({ projects: list, projectsWorkspaceId: ws?._id || null });
    if (list.length && !get().currentProject) set({ currentProject: list[0] });
  },

  setProject: (project) => set({ currentProject: project }),

  refreshProjects: async () => {
    const ws = get().current;
    if (!ws) return;
    const myToken = ++switchToken;
    const { data } = await projects.list(ws._id);
    if (myToken !== switchToken) return; // a newer switch superseded this one
    const list = data.projects ?? data;
    set({ projects: list, projectsWorkspaceId: ws._id });
    // If currentProject is no longer in the list, clear it
    const current = get().currentProject;
    if (current && !list.find(p => p._id === current._id)) {
      set({ currentProject: list[0] || null });
    }
  },

  reset: () => set({ workspaces: [], current: null, projects: [], projectsWorkspaceId: null, currentProject: null, loading: false }),

  createWorkspace: async (d) => {
    const { data } = await workspaces.create(d);
    const ws = data.workspace ?? data;
    set(s => ({ workspaces: [ws, ...s.workspaces], current: ws, projects: [], projectsWorkspaceId: null, currentProject: null }));
    return ws;
  },

  createProject: async (d) => {
    const wid = get().current?._id;
    const { data } = await projects.create(wid, d);
    const proj = data.project ?? data;
    set(s => ({ projects: [proj, ...s.projects], currentProject: proj }));
    return proj;
  },
}));
