import mongoose from 'mongoose';

// Per-user lastReadAt for a workspace's chat — mirrors ChatRead but scoped to
// workspaces. Drives the "seen by" row and unread badges for workspace chat.
const workspaceChatReadSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    lastReadAt: { type: Date, default: Date.now },
}, { timestamps: true });

workspaceChatReadSchema.index({ user: 1, workspace: 1 }, { unique: true });
// getWorkspaceMessages reads WorkspaceChatRead.find({ workspace }) — needs a
// workspace-leading index (the unique one above leads with `user`).
workspaceChatReadSchema.index({ workspace: 1 });

const WorkspaceChatRead = mongoose.model('WorkspaceChatRead', workspaceChatReadSchema);
export default WorkspaceChatRead;
