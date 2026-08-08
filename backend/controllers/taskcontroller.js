import Task from '../models/task.js';
import User from '../models/user.js';
import { notifyUser } from '../utils/notify.js';
import { logProjectActivity } from '../utils/activityLogger.js';
import { PROJ_ACTIONS, OBJECT_TYPES } from '../utils/activityActions.js';

// Normalize an incoming assignee payload into a clean array of id strings.
// Accepts `assignees` (array — preferred) OR legacy `assignee` (single). Dedupes
// and drops falsy values.
function normalizeAssignees(body) {
    const raw = Array.isArray(body.assignees)
        ? body.assignees
        : (body.assignee !== undefined ? [body.assignee] : []);
    return [...new Set(raw.map(a => (a && a._id) ? a._id.toString() : (a ? a.toString() : null)).filter(Boolean))];
}

// Keep only well-formed { url } entries (max 10), dropping any other
// client-supplied fields we don't recognize.
function sanitizeAttachments(raw) {
    return Array.isArray(raw)
        ? raw
            .filter(a => a && typeof a.url === 'string' && a.url.startsWith('http'))
            .slice(0, 10)
            .map(a => ({
                url: a.url,
                kind: a.kind === 'file' ? 'file' : 'image',
                name: a.name || '',
                size: a.size,
                mimeType: a.mimeType,
                width: a.width,
                height: a.height,
            }))
        : [];
}

export const createTask = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, status, priority, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Task title is required" });
        }

        const assignees = normalizeAssignees(req.body);
        const attachments = sanitizeAttachments(req.body.attachments);

        const lastTask = await Task.findOne({ project: projectId, status: status || 'TODO' })
            .sort('-position')
            .exec();

        const position = lastTask ? lastTask.position + 1024 : 1024;

        const newTask = await Task.create({
            project: projectId,
            title,
            description,
            status: status || 'TODO',
            priority: priority || 'P2',
            assignees,
            assignee: assignees[0] || null, // mirror first for back-compat
            createdBy: req.userId,
            dueDate: dueDate || null,
            attachments,
            position
        });

        // Notify every assignee (except the creator)
        if (assignees.length) {
            const sender = await User.findById(req.userId).select('name');
            const senderName = sender?.name || 'Someone';
            for (const uid of assignees) {
                notifyUser(req.io, {
                    recipient: uid,
                    sender: req.userId,
                    type: 'PROJECT_ASSIGN',
                    content: `${senderName} assigned you to "${title}"`,
                    link: `/workspaces/${req.params.workspaceId}/projects/${projectId}/kanban`,
                }).catch(err => console.error('[task-assign notify] failed:', err.message));
            }
        }

        // Return the task with creator + assignees populated for immediate UI use.
        const populated = await Task.findById(newTask._id)
            .populate('assignees', 'name avatar')
            .populate('createdBy', 'name avatar');

        req.io.to(projectId).emit('task_created', populated);

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: projectId,
            user: req.userId,
            action: PROJ_ACTIONS.TASK_CREATED,
            objectType: OBJECT_TYPES.KANBAN,
            targetId: newTask._id,
            targetName: title,
        });

        res.status(201).json({
            message: "Task created successfully",
            task: populated
        });
    } catch (error) {
        console.error("Error creating task:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tasks = await Task.find({ project: projectId })
            .populate('assignees', 'name avatar')
            .populate('createdBy', 'name avatar')
            .sort('position');
        res.status(200).json({ tasks });
    } catch (error) {
        console.error("Error fetching tasks:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Fields a client is allowed to change on a task. Prevents mass-assignment of
// `project`, `position`, `createdBy`, timestamps, etc. via a crafted request body.
// `assignees` is handled separately below (not via this allowlist).
const TASK_UPDATABLE = ['title', 'description', 'status', 'priority', 'dueDate', 'labels', 'attachments'];

export const updateTask = async (req, res) => {
    try {
        const { taskId, projectId } = req.params;

        // Scope to the project in the URL so a contributor on project A can't
        // edit a task that lives in project B by guessing its id (IDOR).
        const before = await Task.findOne({ _id: taskId, project: projectId }).select('assignees assignee title');
        if (!before) {
            return res.status(404).json({ message: "Task not found" });
        }

        const updates = {};
        for (const key of TASK_UPDATABLE) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (updates.attachments !== undefined) {
            updates.attachments = sanitizeAttachments(updates.attachments);
        }

        // Assignees: accept `assignees[]` or legacy `assignee`. Only touch them
        // if the client actually sent one of those keys.
        let newAssignees = null;
        if (req.body.assignees !== undefined || req.body.assignee !== undefined) {
            newAssignees = normalizeAssignees(req.body);
            updates.assignees = newAssignees;
            updates.assignee = newAssignees[0] || null; // mirror first for back-compat
        }

        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { $set: updates },
            { new: true }
        ).populate('assignees', 'name avatar').populate('createdBy', 'name avatar');

        // Notify assignees who were newly added (not previously on the task).
        if (newAssignees) {
            const prevSet = new Set((before.assignees || []).map(a => a.toString()));
            const added = newAssignees.filter(uid => !prevSet.has(uid));
            if (added.length) {
                const sender = await User.findById(req.userId).select('name');
                const senderName = sender?.name || 'Someone';
                for (const uid of added) {
                    notifyUser(req.io, {
                        recipient: uid,
                        sender: req.userId,
                        type: 'PROJECT_ASSIGN',
                        content: `${senderName} assigned you to "${updatedTask.title}"`,
                        link: `/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}/kanban`,
                    }).catch(err => console.error('[task-reassign notify] failed:', err.message));
                }
            }
        }

        req.io.to(req.params.projectId).emit('task_updated', updatedTask);

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: req.params.projectId,
            user: req.userId,
            action: PROJ_ACTIONS.TASK_UPDATED,
            objectType: OBJECT_TYPES.KANBAN,
            targetId: updatedTask._id,
            targetName: updatedTask.title,
            metadata: { fields: Object.keys(updates) },
        });

        res.status(200).json({
            message: "Task updated successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Error updating task:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { taskId, projectId } = req.params;
        const deletedTask = await Task.findOneAndDelete({ _id: taskId, project: projectId });

        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        req.io.to(req.params.projectId).emit('task_deleted', taskId);

        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: req.params.projectId,
            user: req.userId,
            action: PROJ_ACTIONS.TASK_DELETED,
            objectType: OBJECT_TYPES.KANBAN,
            targetId: deletedTask._id,
            targetName: deletedTask.title,
        });

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
