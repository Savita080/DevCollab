import WorkspaceMessage from '../models/workspaceMessage.js';
import WorkspaceChatRead from '../models/workspaceChatRead.js';
import Workspace from '../models/workspace.js';
import { notifyMentions, notifyUser } from '../utils/notify.js';
import { toggleReaction } from '../utils/reactions.js';
import { extractFirstUrl, fetchLinkPreview } from '../utils/linkPreview.js';

const REPLY_POPULATE = { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'name' } };
const room = (workspaceId) => `workspace_${workspaceId}`;

export const sendWorkspaceMessage = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { content, replyTo } = req.body;

        const attachments = Array.isArray(req.body.attachments)
            ? req.body.attachments
                .filter(a => a && typeof a.url === 'string' && a.url.startsWith('http'))
                .slice(0, 6)
                .map(a => ({ url: a.url, width: a.width, height: a.height }))
            : [];

        if (!content?.trim() && attachments.length === 0) {
            return res.status(400).json({ message: "Message content or an image is required" });
        }

        // Validate replyTo belongs to the same workspace
        let validReplyTo = null;
        if (replyTo) {
            const parent = await WorkspaceMessage.findById(replyTo).select('workspace').lean();
            if (parent && parent.workspace.toString() === workspaceId) validReplyTo = replyTo;
        }

        const newMessage = await WorkspaceMessage.create({
            workspace: workspaceId,
            sender: req.userId,
            content: content || '',
            attachments,
            replyTo: validReplyTo,
        });

        const populatedMessage = await WorkspaceMessage.findById(newMessage._id)
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE);

        // Broadcast to the entire workspace room
        if (req.io) {
            req.io.to(room(workspaceId)).emit('new_workspace_message', populatedMessage);
        }

        // Notify @mentioned users — scope to workspace members only.
        const senderName = populatedMessage.sender?.name || 'Someone';
        const snippetText = content || (attachments.length ? '📷 Photo' : '');
        const snippet = snippetText.slice(0, 80) + (snippetText.length > 80 ? '…' : '');
        const ws = await Workspace.findById(workspaceId).select('members slug').lean();
        const allowedUserIds = (ws?.members || []).map(m => m.user.toString());
        const chatLink = `/workspaces/${ws?.slug || req.params.workspaceId}/chat`;
        notifyMentions(req.io, {
            content,
            sender: req.userId,
            type: 'MENTION',
            link: chatLink,
            contentBuilder: () => `${senderName} mentioned you in workspace chat: "${snippet}"`,
            allowedUserIds,
        }).catch(err => console.error('[ws-chat mentions] failed:', err.message));

        if (validReplyTo) {
            const parentSender = populatedMessage.replyTo?.sender?._id;
            if (parentSender) {
                notifyUser(req.io, {
                    recipient: parentSender,
                    sender: req.userId,
                    type: 'MENTION',
                    content: `${senderName} replied to you in workspace chat: "${snippet}"`,
                    link: chatLink,
                }).catch(err => console.error('[ws-chat reply notify] failed:', err.message));
            }
        }

        res.status(201).json({ message: "Workspace message sent", data: populatedMessage, chatMessage: populatedMessage });

        // OG link preview in the background (respond first, then patch + broadcast).
        const firstUrl = extractFirstUrl(content);
        if (firstUrl) {
            fetchLinkPreview(firstUrl).then(async (preview) => {
                if (!preview) return;
                const updated = await WorkspaceMessage.findByIdAndUpdate(
                    newMessage._id,
                    { linkPreview: preview },
                    { new: true }
                ).populate('sender', 'name avatar').populate(REPLY_POPULATE);
                if (updated && req.io) {
                    req.io.to(room(workspaceId)).emit('message_link_preview', {
                        scope: 'workspace',
                        messageId: updated._id,
                        linkPreview: preview,
                    });
                }
            }).catch(() => {});
        }
    } catch (error) {
        console.error("Error sending workspace message:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const reactToWorkspaceMessage = async (req, res) => {
    try {
        const { workspaceId, messageId } = req.params;
        const { emoji } = req.body;
        const reactions = await toggleReaction(WorkspaceMessage, messageId, emoji, req.userId);
        if (req.io) {
            req.io.to(room(workspaceId)).emit('message_reaction_updated', {
                scope: 'workspace',
                messageId,
                reactions,
            });
        }
        res.status(200).json({ reactions });
    } catch (err) {
        console.error('Error toggling workspace message reaction:', err.message);
        res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
    }
};

export const editWorkspaceMessage = async (req, res) => {
    try {
        const { workspaceId, messageId } = req.params;
        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ message: 'Content required' });

        const msg = await WorkspaceMessage.findById(messageId);
        if (!msg || msg.workspace.toString() !== workspaceId) return res.status(404).json({ message: 'Not found' });
        if (msg.deletedAt) return res.status(410).json({ message: 'Message deleted' });
        if (msg.sender.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Not your message' });

        msg.content = content;
        msg.editedAt = new Date();
        await msg.save();

        const populated = await WorkspaceMessage.findById(messageId)
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE);

        if (req.io) req.io.to(room(workspaceId)).emit('message_edited', { scope: 'workspace', message: populated });
        res.status(200).json({ message: populated });
    } catch (err) {
        console.error('Edit ws message error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteWorkspaceMessage = async (req, res) => {
    try {
        const { workspaceId, messageId } = req.params;
        const msg = await WorkspaceMessage.findById(messageId);
        if (!msg || msg.workspace.toString() !== workspaceId) return res.status(404).json({ message: 'Not found' });
        if (msg.deletedAt) return res.status(200).json({ messageId });
        if (msg.sender.toString() !== req.userId.toString()) return res.status(403).json({ message: 'Not your message' });

        msg.deletedAt = new Date();
        await msg.save();

        if (req.io) req.io.to(room(workspaceId)).emit('message_deleted', { scope: 'workspace', messageId });
        res.status(200).json({ messageId });
    } catch (err) {
        console.error('Delete ws message error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const togglePinWorkspaceMessage = async (req, res) => {
    try {
        const { workspaceId, messageId } = req.params;
        const msg = await WorkspaceMessage.findById(messageId);
        if (!msg || msg.workspace.toString() !== workspaceId) return res.status(404).json({ message: 'Not found' });
        if (msg.deletedAt) return res.status(410).json({ message: 'Message deleted' });

        msg.pinned = !msg.pinned;
        msg.pinnedAt = msg.pinned ? new Date() : null;
        msg.pinnedBy = msg.pinned ? req.userId : null;
        await msg.save();

        const populated = await WorkspaceMessage.findById(messageId)
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE);

        if (req.io) req.io.to(room(workspaceId)).emit('message_pinned', { scope: 'workspace', message: populated });
        res.status(200).json({ message: populated });
    } catch (err) {
        console.error('togglePin ws error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const searchWorkspaceMessages = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const q = (req.query.q || '').trim();
        if (!q) return res.status(200).json({ matches: [] });
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = await WorkspaceMessage.find({
            workspace: workspaceId,
            content: { $regex: safe, $options: 'i' },
            deletedAt: null,
        })
            .populate('sender', 'name avatar')
            .sort('-createdAt')
            .limit(20)
            .lean();
        res.status(200).json({ matches });
    } catch (err) {
        console.error('ws search error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getWorkspaceMessages = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const messages = await WorkspaceMessage.find({ workspace: workspaceId })
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE)
            .sort('createdAt');

        const reads = await WorkspaceChatRead.find({ workspace: workspaceId })
            .populate('user', 'name avatar')
            .lean();

        res.status(200).json({ messages, reads });
    } catch (error) {
        console.error("Error fetching workspace messages:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const markWorkspaceChatRead = async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const now = new Date();
        const record = await WorkspaceChatRead.findOneAndUpdate(
            { user: req.userId, workspace: workspaceId },
            { lastReadAt: now },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).populate('user', 'name avatar');

        if (req.io) {
            req.io.to(room(workspaceId)).emit('chat_read', {
                scope: 'workspace',
                workspaceId,
                userId: req.userId.toString(),
                user: { _id: record.user._id, name: record.user.name, avatar: record.user.avatar },
                lastReadAt: now,
            });
        }
        res.status(200).json({ lastReadAt: now });
    } catch (err) {
        console.error('markWorkspaceChatRead error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
