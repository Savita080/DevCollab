import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import './config/redis.js'; // Import Redis so it connects!
import app, { setIo } from './app.js';
import { setupKanbanSockets } from './sockets/kanbanSocket.js';
import { setupWhiteboardSockets } from './sockets/whiteboardSocket.js';

// Fail fast if security-critical env vars are missing — these are required for
// auth to work at all, and a missing JWT secret silently makes tokens forgeable.
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
    console.error(`FATAL: missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

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

// Make the real Socket.IO instance available to controllers (app.js uses a
// no-op stub until this is called).
setIo(io);

connectDB();

// Activate the WebSockets!
setupKanbanSockets(io);
setupWhiteboardSockets(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
