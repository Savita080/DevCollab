import mongoose from 'mongoose';

const artifactSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    url: { type: String, required: true },
    key: { type: String, default: '' },
    name: { type: String, default: '' },
    kind: { type: String, enum: ['image', 'file'], default: 'file' },
    mimeType: String,
    size: Number,
    // Freeform, user-typed tags describing what the file is about — same
    // pattern as CodeSnippet.tags, not an auto-generated type/source label.
    tags: [{ type: String, trim: true, lowercase: true }],
    source: { type: String, enum: ['chat', 'task', 'direct'], required: true },
    sourceMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectMessage',
        default: null,
    },
    sourceTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
    },
}, { timestamps: true });

artifactSchema.index({ project: 1, createdAt: -1 });
artifactSchema.index({ project: 1, tags: 1 });

const Artifact = mongoose.model('Artifact', artifactSchema);
export default Artifact;
