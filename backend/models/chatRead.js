import mongoose from 'mongoose';

const chatReadSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    lastReadAt: { type: Date, default: Date.now },
}, { timestamps: true });

chatReadSchema.index({ user: 1, project: 1 }, { unique: true });
// getProjectMessages reads ChatRead.find({ project }); the unique index above
// leads with `user`, so it can't serve a project-only query. Add a project index.
chatReadSchema.index({ project: 1 });

const ChatRead = mongoose.model('ChatRead', chatReadSchema);
export default ChatRead;
