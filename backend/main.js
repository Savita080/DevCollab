import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
import connectDB from './config/db.js';
import redis from './config/redis.js'; // Import Redis so it connects!
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
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { setupKanbanSockets } from './sockets/kanbanSocket.js';
import { setupWhiteboardSockets } from './sockets/whiteboardSocket.js';
import { resolveSlugUrl } from './middleware/resolveSlugUrl.js';
// Fail fast if security-critical env vars are missing — these are required for
// auth to work at all, and a missing JWT secret silently makes tokens forgeable.
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
    console.error(`FATAL: missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : ["http://localhost:5173"];

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

// Authenticate every socket connection from the JWT in the handshake.
// Identity is server-asserted here (socket.userId) and must NOT be taken from
// any client-emitted payload — that was the old spoofing hole.
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("unauthorized"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = String(decoded.userId);
        next();
    } catch (err) {
        next(new Error("unauthorized"));
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.io to every request so our controllers can use it!
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rewrite slugs in the URL to canonical ObjectIds before routing kicks in.
// Runs once at the app level — every downstream layer sees ObjectIds, so no
// router/controller/model has to know slugs exist.
app.use(resolveSlugUrl);

//routes
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
    res.json({ message: "DevCollab Backend Is running" });
});

// JSON 404 — keeps the error shape consistent with the rest of the API.
app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
});

// Terminal error handler — catches thrown/rejected errors from any route so
// clients always get JSON, never the default Express HTML error page.
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);
    res.status(err.status || 500).json({ error: "Internal Server Error" });
});

// Activate the WebSockets!
setupKanbanSockets(io);
setupWhiteboardSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});