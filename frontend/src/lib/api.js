// lib/api.js — single axios instance, all endpoints
import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
});

// Auth header injection
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('rc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// 401 handler — silently refresh access token, retry original request once
api.interceptors.response.use(
  r => r,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('rc_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            (import.meta.env.VITE_API_URL || '') + '/api/auth/refresh',
            { refreshToken }
          );
          localStorage.setItem('rc_token', data.token);
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        } catch {
          // refresh failed — fall through to logout
        }
      }
      localStorage.removeItem('rc_token');
      localStorage.removeItem('rc_refresh_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // 403 handlers
    if (err.response?.status === 403) {
      const data = err.response.data;
      if (data?.error === 'Plan limit reached' || data?.error === 'AI quota exceeded') {
        window.dispatchEvent(new CustomEvent('paywall', { detail: data }));
      } else if (data?.message?.includes('not a member of this project')) {
        // User lost access to this project — refresh project list to drop it from sidebar
        window.dispatchEvent(new CustomEvent('project-access-denied', { detail: data }));
      }
    }

    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────
export const auth = {
  register:      d  => api.post('/auth/register', d),
  login:         d  => api.post('/auth/login', d),
  googleLogin:   d  => api.post('/auth/google', d),
  refresh:       d  => api.post('/auth/refresh', d),
  logout:        d  => api.post('/auth/logout', d),
  me:            () => api.get('/auth/me'),
  updateProfile: d  => api.patch('/auth/me', d),
};

// ── Workspaces ────────────────────────────────────────
export const workspaces = {
  list:              ()           => api.get('/workspaces'),
  create:            d            => api.post('/workspaces', d),
  get:               id           => api.get(`/workspaces/${id}`),
  update:            (id, d)      => api.patch(`/workspaces/${id}`, d),
  delete:            id           => api.delete(`/workspaces/${id}`),
  invite:            (id, d)      => api.post(`/workspaces/${id}/invite`, d),
  acceptInvite:      token        => api.post(`/workspaces/invite/accept/${token}`),
  members:           id           => api.get(`/workspaces/${id}/members`),
  updateRole:        (id, uid, d) => api.patch(`/workspaces/${id}/members/${uid}/role`, d),
  removeMember:      (id, uid)    => api.delete(`/workspaces/${id}/members/${uid}`),
  transferOwnership: (id, d)      => api.patch(`/workspaces/${id}/transfer-ownership`, d),
};

// ── Projects ──────────────────────────────────────────
// Mounted at: /api/workspaces/:workspaceId/projects
export const projects = {
  list:        wid          => api.get(`/workspaces/${wid}/projects`),
  create:      (wid, d)     => api.post(`/workspaces/${wid}/projects`, d),
  get:         (wid, id)    => api.get(`/workspaces/${wid}/projects/${id}`),
  update:      (wid, id, d) => api.patch(`/workspaces/${wid}/projects/${id}`, d),
  delete:      (wid, id)    => api.delete(`/workspaces/${wid}/projects/${id}`),
  members:     (wid, pid)       => api.get(`/workspaces/${wid}/projects/${pid}/members`),
  addMember:   (wid, pid, d)    => api.post(`/workspaces/${wid}/projects/${pid}/members`, d),
  updateMemberRole: (wid, pid, uid, d) => api.patch(`/workspaces/${wid}/projects/${pid}/members/${uid}/role`, d),
  removeMember:(wid, pid, uid)  => api.delete(`/workspaces/${wid}/projects/${pid}/members/${uid}`),
};

// ── Tasks ─────────────────────────────────────────────
// Mounted at: /api/workspaces/:workspaceId/projects/:projectId/tasks
export const tasks = {
  list:   (wid, pid)        => api.get(`/workspaces/${wid}/projects/${pid}/tasks`),
  create: (wid, pid, d)     => api.post(`/workspaces/${wid}/projects/${pid}/tasks`, d),
  update: (wid, pid, id, d) => api.patch(`/workspaces/${wid}/projects/${pid}/tasks/${id}`, d),
  delete: (wid, pid, id)    => api.delete(`/workspaces/${wid}/projects/${pid}/tasks/${id}`),
  // Comments — mounted at: /api/tasks/:taskId/comments
  comments:      taskId           => api.get(`/tasks/${taskId}/comments`),
  comment:       (taskId, d)      => api.post(`/tasks/${taskId}/comments`, d),   // body: { content, projectId }
  deleteComment: (taskId, cid, d) => api.delete(`/tasks/${taskId}/comments/${cid}`, { data: d }),
  reactComment:  (taskId, cid, emoji, projectId) =>
    api.post(`/tasks/${taskId}/comments/${cid}/react`, { emoji, projectId }),
};

// ── Snippets ──────────────────────────────────────────
// Mounted at: /api/workspaces/:wId/projects/:pId/snippets
export const snippets = {
  list:   (wid, pid)        => api.get(`/workspaces/${wid}/projects/${pid}/snippets`),
  create: (wid, pid, d)     => api.post(`/workspaces/${wid}/projects/${pid}/snippets`, d),
  get:    (wid, pid, id)    => api.get(`/workspaces/${wid}/projects/${pid}/snippets/${id}`),
  update: (wid, pid, id, d) => api.patch(`/workspaces/${wid}/projects/${pid}/snippets/${id}`, d),
  delete: (wid, pid, id)    => api.delete(`/workspaces/${wid}/projects/${pid}/snippets/${id}`),
};

// ── Wiki ──────────────────────────────────────────────
// Mounted at: /api/workspaces/:wId/projects/:pId/wiki
export const wiki = {
  pages:        (wid, pid)           => api.get(`/workspaces/${wid}/projects/${pid}/wiki`),
  get:          (wid, pid, pgId)     => api.get(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}`),
  create:       (wid, pid, d)        => api.post(`/workspaces/${wid}/projects/${pid}/wiki`, d),
  update:       (wid, pid, pgId, d)  => api.patch(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}`, d),
  versions:     (wid, pid, pgId)     => api.get(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}/versions`),
  delete:       (wid, pid, pgId)     => api.delete(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}`),
  move:         (wid, pid, pgId, d)  => api.patch(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}/move`, d),
  // Folders
  folders:      (wid, pid)           => api.get(`/workspaces/${wid}/projects/${pid}/wiki/folders`),
  createFolder: (wid, pid, d)        => api.post(`/workspaces/${wid}/projects/${pid}/wiki/folders`, d),
  updateFolder: (wid, pid, fId, d)   => api.patch(`/workspaces/${wid}/projects/${pid}/wiki/folders/${fId}`, d),
  deleteFolder: (wid, pid, fId)      => api.delete(`/workspaces/${wid}/projects/${pid}/wiki/folders/${fId}`),
};
// ── Whiteboards ───────────────────────────────────────
// Mounted at: /api/workspaces/:wId/projects/:pId/whiteboards
export const whiteboards = {
  list:   (wid, pid)     => api.get(`/workspaces/${wid}/projects/${pid}/whiteboards`),
  create: (wid, pid, d)  => api.post(`/workspaces/${wid}/projects/${pid}/whiteboards`, d),
  update: (wid, pid, id, d) => api.patch(`/workspaces/${wid}/projects/${pid}/whiteboards/${id}`, d),
  delete: (wid, pid, id) => api.delete(`/workspaces/${wid}/projects/${pid}/whiteboards/${id}`),
};

// ── Chat ──────────────────────────────────────────────
// Project chat mounted at: /api/workspaces/:wId/projects/:pId/chat
// Workspace chat mounted at: /api/workspaces/:wId/chat
export const chat = {
  projectMessages:   (wid, pid)    => api.get(`/workspaces/${wid}/projects/${pid}/chat`),
  sendProject:       (wid, pid, d) => api.post(`/workspaces/${wid}/projects/${pid}/chat`, d),
  reactProject:      (wid, pid, mid, emoji) =>
    api.post(`/workspaces/${wid}/projects/${pid}/chat/${mid}/react`, { emoji }),
  editProject:       (wid, pid, mid, content) =>
    api.patch(`/workspaces/${wid}/projects/${pid}/chat/${mid}`, { content }),
  deleteProject:     (wid, pid, mid) =>
    api.delete(`/workspaces/${wid}/projects/${pid}/chat/${mid}`),
  markProjectRead:   (wid, pid)    =>
    api.post(`/workspaces/${wid}/projects/${pid}/chat/read`),
  unreadCounts:      ()            => api.get('/chat/unread'),
  togglePin:         (wid, pid, mid) =>
    api.post(`/workspaces/${wid}/projects/${pid}/chat/${mid}/pin`),
  workspaceMessages: (wid)         => api.get(`/workspaces/${wid}/chat`),
  sendWorkspace:     (wid, d)      => api.post(`/workspaces/${wid}/chat`, d),
  reactWorkspace:    (wid, mid, emoji) =>
    api.post(`/workspaces/${wid}/chat/${mid}/react`, { emoji }),
};

// ── Activity ──────────────────────────────────────────
export const activity = {
  listWorkspace: (wid, params) => api.get(`/workspaces/${wid}/activity`, { params }),
  listProject:   (wid, pid, params) => api.get(`/workspaces/${wid}/projects/${pid}/activity`, { params }),
  /** @deprecated use listProject */
  list: (wid, pid, params) => api.get(`/workspaces/${wid}/projects/${pid}/activity`, { params }),
};

// ── Notifications ─────────────────────────────────────
// Backend supports: GET /notifications/unread, PATCH /notifications/mark-read (marks ALL)
export const notifications = {
  unread:          ()  => api.get('/notifications/unread'),
  markAll:         ()  => api.patch('/notifications/mark-read'),
  markOne:         (id) => api.patch(`/notifications/${id}/read`),
  vapidKey:        ()  => api.get('/notifications/vapid-public-key'),
  pushSubscribe:   (sub)      => api.post('/notifications/push/subscribe', { subscription: sub }),
  pushUnsubscribe: (endpoint) => api.post('/notifications/push/unsubscribe', { endpoint }),
};

// ── AI ────────────────────────────────────────────────
export const ai = {
  summarise: (wid, pid)     => api.post(`/ai/summarize-project`, { projectId: pid }),
  blockers:  (wid, pid)     => api.post(`/ai/bottleneck`,        { projectId: pid }),
  standup:   (wid, pid)     => api.post(`/ai/standup`,           { projectId: pid }),
  plan:      (wid, pid, d)  => api.post(`/ai/generate-tasks`,    { projectId: pid, ...d }),
  review:    d              => api.post('/ai/review-code', d),
};

// ── Uploads (Cloudinary signed direct upload) ────────────────────────
export const uploads = {
  signature: () => api.get('/uploads/signature'),
};

// ── Subscriptions (Razorpay) — per-user, no workspace context ─────────
export const subscriptions = {
  subscribe: ()  => api.post(`/subscriptions/subscribe`),
  verify:    (d) => api.post(`/subscriptions/verify`, d),
  cancel:    ()  => api.post(`/subscriptions/cancel`),
  getStatus: ()  => api.get(`/subscriptions/status`),
};

// ============================================================================
// 🛑 TEMPORARY BACKEND BYPASS FOR VERCEL PREVIEW
// Set to true to bypass backend. When real backend is ready, set to false.
// ============================================================================
export const BYPASS_BACKEND = false;

if (BYPASS_BACKEND) {
  console.warn("⚠️ BYPASS_BACKEND is ENABLED! Using mock data instead of real API.");

  const mockUser = { _id: 'u1', id: 'u1', name: 'Demo User', email: 'demo@example.com', role: 'Owner' };
  const mockWs = { _id: 'w1', name: 'Demo Workspace', owner: 'u1' };
  const mockProj1 = { _id: 'p1', name: 'Website Redesign', workspace: 'w1' };
  const mockProj2 = { _id: 'p2', name: 'Mobile App', workspace: 'w1' };

  const getMockData = (url) => {
    if (url.includes('/auth/login') || url.includes('/auth/register')) return { token: 'demo-token', user: mockUser };
    if (url.includes('/auth/me')) return { user: mockUser };
    if (url.match(/\/workspaces$/)) return { workspaces: [mockWs] };
    if (url.includes('/projects') && !url.includes('/tasks') && !url.includes('/members') && !url.includes('/activity') && !url.includes('/wiki') && !url.includes('/snippets') && !url.includes('/chat')) {
      return { projects: [mockProj1, mockProj2] };
    }
    if (url.includes('/members')) return { members: [{ user: mockUser, role: 'Owner' }] };
    if (url.includes('/tasks')) return { tasks: [
      { _id: 't1', title: 'Design Homepage', status: 'To Do', priority: 'P1', assignee: mockUser },
      { _id: 't2', title: 'Setup DB', status: 'In Progress', priority: 'P0', assignee: mockUser },
      { _id: 't3', title: 'Deploy Frontend', status: 'Done', priority: 'P2', assignee: mockUser }
    ] };
    if (url.includes('/activity')) return { activities: [
      { _id: 'a1', action: 'PROJECT_CREATED', user: mockUser, targetName: 'Website Redesign', createdAt: new Date().toISOString() },
    ] };
    if (url.includes('/standup')) return { done: 'Finished mock setup', today: 'Testing Vercel frontend', blockers: 'None', summary: 'Everything looks good!' };
    if (url.includes('/chat')) return { messages: [] };
    if (url.includes('/wiki')) return [];
    if (url.includes('/snippets')) return { snippets: [] };
    if (url.includes('/notifications')) return { notifications: [] };
    if (url.includes('/subscription')) return { plan: 'FREE', aiRequestsUsed: 0 };
    if (url.includes('/whiteboards')) return { whiteboards: [] };
    return {};
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  api.get = async (url) => { await delay(200); return { data: getMockData(url) }; };
  api.post = async (url) => { 
    await delay(300); 
    if (url.includes('login') || url.includes('register')) localStorage.setItem('rc_token', 'demo-token');
    return { data: getMockData(url) }; 
  };
  api.patch = async (url) => { await delay(200); return { data: getMockData(url) }; };
  api.delete = async (url) => { await delay(200); return { data: getMockData(url) }; };
}

export default api;
