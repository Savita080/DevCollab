import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    project: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },
    title: { 
        type: String, 
        required: [true, 'Task title is required'],
        trim: true
    },
    description: { 
        type: String, 
        default: '' 
    },
    status: { 
        type: String, 
        enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], 
        default: 'TODO' 
    },
    priority: { 
        type: String, 
        enum: ['P0', 'P1', 'P2'], 
        default: 'P2' 
    },
    // Legacy single-assignee field. Kept for backward-compat with old tasks and
    // old clients; new code reads/writes `assignees` (array). On write we mirror
    // the first assignee here so anything still reading `assignee` keeps working.
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Multiple assignees — a task can be shared across people.
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Who created the task (and when — `createdAt` comes from timestamps).
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    dueDate: {
        type: Date, 
        default: null 
    },
    position: { 
        type: Number, 
        required: true 
    },
    labels: [{
        type: String
    }],
    attachments: [{
        url: { type: String, required: true },
        kind: { type: String, enum: ['image', 'file'], default: 'image' },
        name: { type: String, default: '' },
        size: Number,
        mimeType: String,
        width: Number,
        height: Number
    }]
}, {
    timestamps: true
});

// Board loads do Task.find({ project }).sort('position'); create does
// findOne({ project, status }).sort('-position'). This compound index serves both.
taskSchema.index({ project: 1, status: 1, position: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
