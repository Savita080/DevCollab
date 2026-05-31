import mongoose from 'mongoose';

const workspaceMessageSchema = new mongoose.Schema({
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        default: '',
    },
    // Uploaded image attachments (Cloudinary URLs). A message may be image-only.
    attachments: [{
        url: { type: String, required: true },
        width: Number,
        height: Number,
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkspaceMessage',
        default: null,
    },
    reactions: [{
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }],
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    pinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    linkPreview: {
        url: { type: String, default: null },
        title: { type: String, default: null },
        description: { type: String, default: null },
        image: { type: String, default: null },
        siteName: { type: String, default: null },
    },
}, { timestamps: true });

workspaceMessageSchema.index({ workspace: 1, createdAt: 1 });

const WorkspaceMessage = mongoose.model('WorkspaceMessage', workspaceMessageSchema);
export default WorkspaceMessage;
