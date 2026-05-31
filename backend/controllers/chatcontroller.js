import ProjectMessage from '../models/projectMessage.js';
import ChatRead from '../models/chatRead.js';
import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import { notifyMentions, notifyUser } from '../utils/notify.js';
import { toggleReaction } from '../utils/reactions.js';
import { extractFirstUrl, fetchLinkPreview } from '../utils/linkPreview.js';

// Populate shape used everywhere — sender + the quoted parent (sender + content).
// Reply previews need just enough to render the quote chip, not the full thread.
const REPLY_POPULATE = { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'name' } };

export const sendMessage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { content, replyTo } = req.body;

        // Sanitize attachments: keep only well-formed { url } entries (max 6).
        const attachments = Array.isArray(req.body.attachments)
            ? req.body.attachments
                .filter(a => a && typeof a.url === 'string' && a.url.startsWith('http'))
                .slice(0, 6)
                .map(a => ({ url: a.url, width: a.width, height: a.height }))
            : [];

        // A message must have text OR at least one image.
        if (!content?.trim() && attachments.length === 0) {
            return res.status(400).json({ message: "Message content or an image is required" });
        }

        // Validate replyTo belongs to the same project — prevents cross-channel quoting.
        let validReplyTo = null;
        if (replyTo) {
            const parent = await ProjectMessage.findById(replyTo).select('project').lean();
            if (parent && parent.project.toString() === projectId) validReplyTo = replyTo;
        }

        const newMessage = await ProjectMessage.create({
            project: projectId,
            sender: req.userId,
            content: content || '',
            attachments,
            replyTo: validReplyTo,
        });

        // Populate sender info + replyTo preview for the frontend UI
        const populatedMessage = await ProjectMessage.findById(newMessage._id)
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE);

        // Make it LIVE! Broadcast to everyone in the project room
        req.io.to(projectId).emit('new_group_message', populatedMessage);

        // Build the access-scoped recipient set: project members + workspace OWNER/ADMIN.
        // We don't notify random workspace users on a project-scoped @mention.
        const project = req.project || await Project.findById(projectId).select('members workspace slug').lean();
        const projMemberIds = (project?.members || []).map(m => m.user.toString());
        const workspace = await Workspace.findById(project?.workspace || req.params.workspaceId).select('members slug').lean();
        const wsAdminIds = (workspace?.members || [])
            .filter(m => m.role === 'OWNER' || m.role === 'ADMIN')
            .map(m => m.user.toString());
        const allowedUserIds = [...new Set([...projMemberIds, ...wsAdminIds])];

        // Notify @mentioned users (scoped to project members + ws admins)
        const senderName = populatedMessage.sender?.name || 'Someone';
        const snippetText = content || (attachments.length ? '📷 Photo' : '');
        const snippet = snippetText.slice(0, 80) + (snippetText.length > 80 ? '…' : '');
        const wsSlug = workspace?.slug || req.params.workspaceId;
        const projSlug = project?.slug || projectId;
        const chatLink = `/workspaces/${wsSlug}/projects/${projSlug}/chat`;
        notifyMentions(req.io, {
            content,
            sender: req.userId,
            type: 'MENTION',
            link: chatLink,
            contentBuilder: () => `${senderName} mentioned you in chat: "${snippet}"`,
            allowedUserIds,
        }).catch(err => console.error('[chat mentions] failed:', err.message));

        // Notify the user being replied to (skip if they were already @-mentioned)
        if (validReplyTo) {
            const parentSender = populatedMessage.replyTo?.sender?._id;
            if (parentSender) {
                notifyUser(req.io, {
                    recipient: parentSender,
                    sender: req.userId,
                    type: 'MENTION',
                    content: `${senderName} replied to you: "${snippet}"`,
                    link: chatLink,
                }).catch(err => console.error('[chat reply notify] failed:', err.message));
            }
        }

        res.status(201).json({ message: "Message sent", chatMessage: populatedMessage });

        // Fetch OG preview in the background for the first URL in the message.
        // We respond first so chat stays fast, then patch the message + broadcast.
        const firstUrl = extractFirstUrl(content);
        if (firstUrl) {
            fetchLinkPreview(firstUrl).then(async (preview) => {
                if (!preview) return;
                const updated = await ProjectMessage.findByIdAndUpdate(
                    newMessage._id,
                    { linkPreview: preview },
                    { new: true }
                ).populate('sender', 'name avatar').populate(REPLY_POPULATE);
                if (updated) {
                    req.io.to(projectId).emit('message_link_preview', {
                        scope: 'project',
                        messageId: updated._id,
                        linkPreview: preview,
                    });
                }
            }).catch(() => {});
        }
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const reactToProjectMessage = async (req, res) => {
    try {
        const { projectId, messageId } = req.params;
        const { emoji } = req.body;
        const reactions = await toggleReaction(ProjectMessage, messageId, emoji, req.userId);
        req.io.to(projectId).emit('message_reaction_updated', {
            scope: 'project',
            messageId,
            reactions,
        });
        res.status(200).json({ reactions });
    } catch (err) {
        console.error('Error toggling project message reaction:', err.message);
        res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
    }
};

export const editProjectMessage = async (req, res) => {
    try {
        const { projectId, messageId } = req.params;
        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ message: 'Content required' });

        const msg = await ProjectMessage.findById(messageId);
        if (!msg || msg.project.toString() !== projectId) return res.status(404).json({ message: 'Not found' });
        if (msg.deletedAt) return res.status(410).json({ message: 'Message deleted' });
        if (msg.sender.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Not your message' });

        msg.content = content;
        msg.editedAt = new Date();
        await msg.save();

        const populated = await ProjectMessage.findById(messageId)
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE);

        req.io.to(projectId).emit('message_edited', { scope: 'project', message: populated });
        res.status(200).json({ message: populated });
    } catch (err) {
        console.error('Edit message error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteProjectMessage = async (req, res) => {
    try {
        const { projectId, messageId } = req.params;
        const msg = await ProjectMessage.findById(messageId);
        if (!msg || msg.project.toString() !== projectId) return res.status(404).json({ message: 'Not found' });
        if (msg.deletedAt) return res.status(200).json({ messageId });
        if (msg.sender.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Not your message' });

        msg.deletedAt = new Date();
        await msg.save();

        req.io.to(projectId).emit('message_deleted', { scope: 'project', messageId });
        res.status(200).json({ messageId });
    } catch (err) {
        console.error('Delete message error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const searchProjectMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const q = (req.query.q || '').trim();
        if (!q) return res.status(200).json({ matches: [] });
        // Case-insensitive substring match. Mongo $text would need a text index;
        // regex is fine for hackathon-scale chat history.
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = await ProjectMessage.find({
            project: projectId,
            content: { $regex: safe, $options: 'i' },
            deletedAt: null,
        })
            .populate('sender', 'name avatar')
            .sort('-createdAt')
            .limit(20)
            .lean();
        res.status(200).json({ matches });
    } catch (err) {
        console.error('search error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const togglePinProjectMessage = async (req, res) => {
    try {
        const { projectId, messageId } = req.params;
        const msg = await ProjectMessage.findById(messageId);
        if (!msg || msg.project.toString() !== projectId) return res.status(404).json({ message: 'Not found' });
        if (msg.deletedAt) return res.status(410).json({ message: 'Message deleted' });

        msg.pinned = !msg.pinned;
        msg.pinnedAt = msg.pinned ? new Date() : null;
        msg.pinnedBy = msg.pinned ? req.userId : null;
        await msg.save();

        const populated = await ProjectMessage.findById(messageId)
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE);

        req.io.to(projectId).emit('message_pinned', { scope: 'project', message: populated });
        res.status(200).json({ message: populated });
    } catch (err) {
        console.error('togglePin error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getProjectMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const messages = await ProjectMessage.find({ project: projectId })
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE)
            .sort('createdAt'); // Oldest first (like normal chat history)

        // Per-user lastReadAt for the seen-by row.
        const reads = await ChatRead.find({ project: projectId })
            .populate('user', 'name avatar')
            .lean();

        res.status(200).json({ messages, reads });
    } catch (error) {
        console.error("Error fetching messages:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const markProjectChatRead = async (req, res) => {
    try {
        const { projectId } = req.params;
        const now = new Date();
        const record = await ChatRead.findOneAndUpdate(
            { user: req.userId, project: projectId },
            { lastReadAt: now },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).populate('user', 'name avatar');

        // Tell others (so seen-by avatars update live)
        req.io.to(projectId).emit('chat_read', {
            scope: 'project',
            projectId,
            userId: req.userId.toString(),
            user: { _id: record.user._id, name: record.user.name, avatar: record.user.avatar },
            lastReadAt: now,
        });
        res.status(200).json({ lastReadAt: now });
    } catch (err) {
        console.error('markProjectChatRead error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Returns unread counts for every project the caller is a member of, in one
// trip — used by the sidebar badges. Counts messages from OTHERS (not self)
// after the user's lastReadAt for that project.
export const getUnreadCounts = async (req, res) => {
    try {
        const userId = req.userId;
        // All projects the user is a member of (or workspace OWNER/ADMIN of)
        const wsAdmin = await Workspace.find({
            'members.user': userId,
            'members.role': { $in: ['OWNER', 'ADMIN'] },
        }).select('_id').lean();
        const wsAdminIds = wsAdmin.map(w => w._id);

        const projects = await Project.find({
            $or: [
                { 'members.user': userId },
                { workspace: { $in: wsAdminIds } },
            ],
        }).select('_id').lean();
        const projectIds = projects.map(p => p._id);
        if (!projectIds.length) return res.status(200).json({ counts: {} });

        const reads = await ChatRead.find({ user: userId, project: { $in: projectIds } })
            .select('project lastReadAt').lean();
        const readMap = new Map(reads.map(r => [r.project.toString(), r.lastReadAt]));

        // Aggregate count of messages newer than lastReadAt, by project, excluding self.
        const counts = {};
        await Promise.all(projectIds.map(async (pid) => {
            const after = readMap.get(pid.toString()) || new Date(0);
            const n = await ProjectMessage.countDocuments({
                project: pid,
                sender: { $ne: userId },
                createdAt: { $gt: after },
                deletedAt: null,
            });
            if (n > 0) counts[pid.toString()] = n;
        }));
        res.status(200).json({ counts });
    } catch (err) {
        console.error('getUnreadCounts error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
