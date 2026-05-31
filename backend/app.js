// app.js — builds and exports the Express app WITHOUT starting a server or
// connecting to the database. This separation lets tests import `app` and fire
// requests at it (via supertest) using an in-memory DB, while main.js handles
// the real server startup, Socket.IO, and DB connection.
import express from 'express';
import cors from 'cors';
import authroutes from './routes/authroutes.js';
import workspaceroutes from './routes/workspaceroutes.js';
import projectroutes from './routes/projectroutes.js';
import taskroutes from './routes/taskroutes.js';
import notificationroutes from './routes/notificationroutes.js';
import commentroutes from './routes/commentroutes.js';
import snippetroutes from './routes/snippetroutes.js';
import airoutes from './routes/airoutes.js';
import wikiroutes from './routes/wikiroutes.js';
import chatroutes from './routes/chatroutes.js';
import chatGlobalRoutes from './routes/chatGlobalRoutes.js';
import whiteboardroutes from './routes/whiteboardroutes.js';
import activityroutes from './routes/activityroutes.js';
import workspaceactivityroutes from './routes/workspaceactivityroutes.js';
import subscriptionroutes from './routes/subscriptionroutes.js';
import uploadroutes from './routes/uploadroutes.js';
import { resolveSlugUrl } from './middleware/resolveSlugUrl.js';

const app = express();

// Socket.IO instance is injected by main.js via setIo(). Until then (e.g. in
// tests) req.io is a no-op stub so controllers can call req.io.to(x).emit(y)
// without crashing.
let io = { to: () => ({ emit: () => {} }) };
export const setIo = (realIo) => { io = realIo; };

const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ["http://localhost:5173"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make the (real or stub) Socket.IO instance available to every controller.
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rewrite slugs in the URL to canonical ObjectIds before routing kicks in.
app.use(resolveSlugUrl);

// routes
app.use("/api/auth", authroutes);
app.use("/api/workspaces", workspaceroutes);
app.use("/api/workspaces/:workspaceId/activity", workspaceactivityroutes);
app.use("/api/workspaces/:workspaceId/projects", projectroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/tasks", taskroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/snippets", snippetroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/wiki", wikiroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/chat", chatroutes);
app.use("/api/chat", chatGlobalRoutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/whiteboards", whiteboardroutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/activity", activityroutes);
app.use("/api/tasks/:taskId/comments", commentroutes);
app.use("/api/notifications", notificationroutes);
app.use("/api/ai", airoutes);
app.use("/api/subscriptions", subscriptionroutes);
app.use("/api/uploads", uploadroutes);

app.get("/", (req, res) => {
    res.json({ message: "RealCollab Backend Is running" });
});

// JSON 404 — keeps the error shape consistent with the rest of the API.
app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
});

// Terminal error handler — always return JSON, never the default HTML page.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);
    res.status(err.status || 500).json({ error: "Internal Server Error" });
});

export default app;
