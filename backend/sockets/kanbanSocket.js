import Task from '../models/task.js';
import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import redis from '../config/redis.js';

// In-memory fallback so presence works even when Redis is not configured
const memSocketUser = new Map(); // socketId -> { userId, name, avatar }

// Returns true if userId is allowed to mutate tasks in the given project.
// Project CONTRIBUTOR or workspace OWNER/ADMIN qualify.
async function canEditProject(userId, projectId) {
    if (!userId || !projectId) return false;
    const project = await Project.findById(projectId).select('members workspace').lean();
    if (!project) return false;
    const member = project.members?.find(m => m.user.toString() === userId);
    if (member?.role === 'CONTRIBUTOR') return true;
    const workspace = await Workspace.findById(project.workspace).select('members').lean();
    const wsm = workspace?.members?.find(m => m.user.toString() === userId);
    return wsm?.role === 'OWNER' || wsm?.role === 'ADMIN';
}

export const setupKanbanSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] User connected: ${socket.id}`);

        // Identity is set by the io.use handshake guard (socket.userId). Join a
        // per-user room so notifications reach EVERY tab/device this user has open.
        const userId = socket.userId;
        socket.join(`user:${userId}`);

        // user_online now only carries DISPLAY data (name/avatar) for presence.
        // The userId is never taken from the client — it comes from the verified JWT.
        socket.on('user_online', async (payload) => {
            const name = payload?.name || '';
            const avatar = payload?.avatar || '';

            socket.userName = name;
            socket.userAvatar = avatar;

            memSocketUser.set(socket.id, { userId, name, avatar });
            if (redis) {
                await redis.set(`socket:${socket.id}`, userId);
                if (name) await redis.set(`user:name:${userId}`, name);
                if (avatar) await redis.set(`user:avatar:${userId}`, avatar);
            }
            // Re-broadcast presence for rooms this socket is already in, so the
            // freshly-arrived name/avatar shows up for everyone. Project rooms use
            // presence:update; scope: rooms use presence:scope_update. Skip
            // workspace_ / whiteboard: rooms (no presence tracking) and user: room.
            for (const room of socket.rooms) {
                if (room === socket.id || room === `user:${userId}` ||
                    room.startsWith('workspace_') || room.startsWith('whiteboard:')) continue;
                if (room.startsWith('scope:')) {
                    await broadcastScopePresence(io, room.slice('scope:'.length), redis);
                } else {
                    await broadcastPresence(io, room, redis);
                }
            }
        });

        // 1. JOIN ROOM: The frontend tells us which project they are looking at.
        // Guard against duplicate joins — if the socket is already in this room
        // (e.g. heartbeat re-emitting), skip the DB broadcast.
        socket.on('join_project', async (projectId) => {
            const alreadyIn = socket.rooms.has(projectId);
            socket.join(projectId);
            if (!alreadyIn) {
                console.log(`[Socket] User ${socket.id} joined project room: ${projectId}`);
                await broadcastPresence(io, projectId, redis);
            }
        });

        // 2. LEAVE ROOM: They clicked away to a different page
        socket.on('leave_project', async (projectId) => {
            socket.leave(projectId);
            console.log(`[Socket] User ${socket.id} left project room: ${projectId}`);
            await broadcastPresence(io, projectId, redis);
        });

        // Snapshot request — sends current presence only to the requesting socket
        socket.on('request_presence', async (projectId) => {
            const users = await collectPresence(io, projectId, redis);
            socket.emit('presence:update', { projectId, users });
        });

        // ── Generic SCOPED presence ────────────────────────────────────────
        // Lets a specific page (chat, whiteboard, etc.) track who is *on that
        // page* rather than who is in the whole project. Room keys are namespaced
        // `scope:<key>` so they never collide with project rooms. Reuses the same
        // collectPresence helper — identity comes from the verified socket.
        socket.on('presence:join', async (scopeKey) => {
            if (!scopeKey) return;
            const room = `scope:${scopeKey}`;
            socket.join(room);
            await broadcastScopePresence(io, scopeKey, redis);
        });

        socket.on('presence:leave', async (scopeKey) => {
            if (!scopeKey) return;
            const room = `scope:${scopeKey}`;
            socket.leave(room);
            await broadcastScopePresence(io, scopeKey, redis);
        });

        socket.on('presence:request', async (scopeKey) => {
            if (!scopeKey) return;
            const users = await collectPresence(io, `scope:${scopeKey}`, redis);
            socket.emit('presence:scope_update', { scopeKey, users });
        });

        // WORKSPACE ROOMS: for workspace-level chat broadcasts
        socket.on('join_workspace', (workspaceId) => {
            socket.join(`workspace_${workspaceId}`);
            console.log(`[Socket] User ${socket.id} joined workspace room: workspace_${workspaceId}`);
        });

        socket.on('leave_workspace', (workspaceId) => {
            socket.leave(`workspace_${workspaceId}`);
            console.log(`[Socket] User ${socket.id} left workspace room: workspace_${workspaceId}`);
        });

        // 3. TYPING INDICATOR: User is typing in chat
        socket.on('typing', ({ projectId, userName }) => {
            if (!projectId || !userName) return;
            socket.to(projectId).emit('user_typing', { userName, projectId });
        });

        socket.on('workspace_typing', ({ workspaceId, userName }) => {
            if (!workspaceId || !userName) return;
            socket.to(`workspace_${workspaceId}`).emit('workspace_user_typing', { userName, workspaceId });
        });

        // 4. MOVE TASK: The user dragged a card!
        socket.on('task_move', async (data) => {
            const { taskId, projectId, newStatus, newPosition } = data;

            // Authorization: only project CONTRIBUTORs (or ws OWNER/ADMIN) may move tasks.
            const allowed = await canEditProject(socket.userId, projectId);
            if (!allowed) {
                socket.emit('task_move_error', { taskId, reason: 'forbidden' });
                return;
            }

            // Broadcast the movement to everyone ELSE in the room immediately!
            socket.to(projectId).emit('task_moved', {
                taskId,
                status: newStatus,
                position: newPosition
            });

            try {
                // Save the new position to MongoDB
                await Task.findByIdAndUpdate(taskId, {
                    status: newStatus,
                    position: newPosition
                });
            } catch (error) {
                console.error("[Socket] Failed to save task move to DB:", error);
                // If the DB fails, tell the frontend to revert the card
                socket.emit('task_move_error', { taskId });
            }
        });

        // Snapshot rooms BEFORE the socket actually leaves them in disconnect
        socket.on('disconnecting', () => {
            socket.roomsToLeave = [...socket.rooms].filter(r => r !== socket.id);
        });

        // WHEN A USER LOGS OUT / CLOSES TAB
        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${socket.id}`);
            const rooms = socket.roomsToLeave || [];

            if (redis) {
                await redis.del(`socket:${socket.id}`);
            }
            memSocketUser.delete(socket.id);
            // Rebroadcast presence for the rooms this socket was in so others see
            // it drop off. Project rooms → presence:update, scope: → scope_update.
            for (const room of rooms) {
                if (room.startsWith('workspace_') || room.startsWith('whiteboard:') ||
                    room.startsWith('user:')) continue;
                if (room.startsWith('scope:')) {
                    await broadcastScopePresence(io, room.slice('scope:'.length), redis);
                } else {
                    await broadcastPresence(io, room, redis);
                }
            }
        });
    });
};

async function collectPresence(io, projectId, redis) {
    const room = io.sockets.adapter.rooms.get(projectId);
    if (!room) return [];
    const seen = new Set();
    const online = [];
    for (const socketId of room) {
        // 1. Try directly on the socket instance (0-latency)
        const socketInstance = io.sockets.sockets.get(socketId);
        let userId = socketInstance?.userId;
        let name = socketInstance?.userName;
        let avatar = socketInstance?.userAvatar;

        // 2. Fallback to in-memory map
        if (!userId) {
            const mem = memSocketUser.get(socketId);
            if (mem) {
                userId = mem.userId;
                name = mem.name;
                avatar = mem.avatar;
            }
        }

        // 3. Fallback to Redis only if still not found
        if (!userId && redis) {
            userId = await redis.get(`socket:${socketId}`);
            if (userId) {
                name = await redis.get(`user:name:${userId}`);
                avatar = await redis.get(`user:avatar:${userId}`);
            }
        }

        if (userId && !seen.has(userId)) {
            seen.add(userId);
            online.push({ _id: userId, name: name || 'User', avatar: avatar || '' });
        }
    }
    return online;
}

async function broadcastPresence(io, projectId, redis) {
    const users = await collectPresence(io, projectId, redis);
    io.to(projectId).emit('presence:update', { projectId, users });
}

// Broadcast presence for a namespaced scope room (chat, whiteboard, …).
async function broadcastScopePresence(io, scopeKey, redis) {
    const users = await collectPresence(io, `scope:${scopeKey}`, redis);
    io.to(`scope:${scopeKey}`).emit('presence:scope_update', { scopeKey, users });
}
