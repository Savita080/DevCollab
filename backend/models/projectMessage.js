import mongoose from 'mongoose';

const projectMessageSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
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
    // Uploaded image attachments (Cloudinary URLs). A message may be image-only
    // (empty content) or carry both text and images.
    attachments: [{
        url: { type: String, required: true },
        width: Number,
        height: Number,
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectMessage',
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

const ProjectMessage = mongoose.model('ProjectMessage', projectMessageSchema);
export default ProjectMessage;
