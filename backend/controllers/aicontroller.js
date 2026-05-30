import Project from '../models/project.js';
import Task from '../models/task.js';
import TaskComment from '../models/taskComment.js';
import Workspace from '../models/workspace.js';
import User from '../models/user.js';
import ActivityLog from '../models/activityLog.js';
import { logProjectActivity } from '../utils/activityLogger.js';
import { PROJ_ACTIONS, OBJECT_TYPES } from '../utils/activityActions.js';
import { refundAIQuota } from '../middleware/planLimits.js';

// Tasks now support multiple assignees (`assignees[]`), with a legacy single
// `assignee` kept for back-compat. These helpers flatten both into the shape the
// Python AI services expect (a comma-joined name string / first id).
function assigneeList(t) {
    if (Array.isArray(t.assignees) && t.assignees.length) return t.assignees;
    if (t.assignee) return [t.assignee];
    return [];
}
function assigneeNames(t) {
    const list = assigneeList(t).map(a => a?.name).filter(Boolean);
    return list.length ? list.join(', ') : null;
}
function firstAssigneeId(t) {
    const list = assigneeList(t);
    return list.length ? (list[0]?._id?.toString() || list[0]?.toString() || null) : null;
}

async function logAiServiceUse(userId, projectId, action, label) {
    try {
        const project = await Project.findById(projectId).select('workspace name');
        if (!project) return;
        await logProjectActivity({
            workspace: project.workspace,
            project: projectId,
            user: userId,
            action,
            objectType: OBJECT_TYPES.AI,
            targetId: projectId,
            targetName: label || project.name,
            metadata: { aiService: action },
        });
    } catch (e) {
        console.error('[activity] AI log failed:', e.message);
    }
}
import ProjectMessage from '../models/projectMessage.js';
import WikiPage from '../models/wikiPage.js';
import WikiPageVersion from '../models/wikiPageVersion.js';
import Whiteboard from '../models/whiteboard.js';
import Notification from '../models/notification.js';


//made optional context and weight fields and mapped to 3 urls
export const reviewCode = async (req, res) => {
    try {
        const { code, language, snippetId, context, weights } = req.body;

        const lang = (language || '').toLowerCase();

        let aiServiceUrl;
        if (lang === 'python') {
            aiServiceUrl = process.env.PY_REVIEWER_URL || 'http://localhost:8000';
        } else if (lang === 'javascript' || lang === 'typescript') {
            aiServiceUrl = process.env.JS_REVIEWER_URL || 'http://localhost:8001';
        } else if (['java', 'c++', 'go'].includes(lang)) {
            aiServiceUrl = process.env.COMB_REVIEWER_URL || 'http://localhost:8002';
        } else {
            return res.status(400).json({ error: `Unsupported language: ${language}` });
        }

        const response = await fetch(`${aiServiceUrl}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, snippetId, context, weights })
        });

        if (!response.ok) throw new Error(`AI Service responded with status: ${response.status}`);

        const data = await response.json();
        if (req.body.projectId) {
            await logAiServiceUse(req.userId, req.body.projectId, PROJ_ACTIONS.AI_CODE_REVIEWER, 'AI Code Reviewer');
        }
        res.status(200).json(data);
    } catch (error) {
        // The AI request failed — refund the quota unit checkAIQuota charged up-front.
        await refundAIQuota(req.userId);
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};

export const generateStandup = async (req, res) => {
    try {
        const { projectId } = req.body;
        const aiServiceUrl = process.env.AI_STANDUP_URL || 'http://localhost:8002';
        const userId = req.userId;

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const workspace = await Workspace.findById(project.workspace);
        if (!workspace) return res.status(404).json({ message: "Workspace not found" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const wsMember = workspace.members.find(m => m.user.toString() === userId.toString());
        const userWorkspaceRole = wsMember?.role || 'VIEWER';

        const projMember = project.members.find(m => m.user.toString() === userId.toString());
        const userProjectRole = projMember?.role || 'VIEWER';

        const tasks = await Task.find({ project: projectId, updatedAt: { $gte: since } })
            .populate('assignees', 'name')
            .populate('assignee', 'name')
            .lean();

        const tasks_moved = tasks.map(t => ({
            task_id: t._id.toString(),
            title: t.title,
            status: t.status,
            priority: t.priority,
            assignee_name: assigneeNames(t),
            updated_at: t.updatedAt,
        }));

        const logs = await ActivityLog.find({ project: projectId, createdAt: { $gte: since } })
            .populate('user', 'name')
            .lean();
        const activity_logs = logs.map(l => ({
            user_name: l.user?.name || 'Unknown',
            action: l.action,
            target_name: l.targetName || '',
            created_at: l.createdAt,
        }));

        const messages = await ProjectMessage.find({ project: projectId, createdAt: { $gte: since } })
            .populate('sender', 'name')
            .lean();
        const chat_messages = messages.map(m => ({
            sender_name: m.sender?.name || 'Unknown',
            content: m.content,
            created_at: m.createdAt,
        }));

        const pages = await WikiPage.find({ project: projectId }).select('_id title').lean();
        const pageMap = new Map(pages.map(p => [p._id.toString(), p.title]));
        const versions = await WikiPageVersion.find({
            wikiPage: { $in: pages.map(p => p._id) },
            createdAt: { $gte: since },
        }).populate('savedBy', 'name').lean();
        const wiki_changes = versions.map(v => ({
            page_title: pageMap.get(v.wikiPage.toString()) || 'Untitled',
            saved_by_name: v.savedBy?.name || 'Unknown',
            commit_message: v.commitMessage || 'Auto-saved version',
            created_at: v.createdAt,
        }));

        const boards = await Whiteboard.find({ project: projectId, updatedAt: { $gte: since } }).lean();
        const whiteboard_changes = boards.map(b => ({
            name: b.name || 'Untitled Whiteboard',
            is_new: b.createdAt >= since,
            updated_at: b.updatedAt,
        }));

        const newProjMembers = project.members.filter(m => m.joinedAt && m.joinedAt >= since);
        const newProjMemberUsers = await User.find({
            _id: { $in: newProjMembers.map(m => m.user) },
        }).select('name').lean();
        const userNameById = new Map(newProjMemberUsers.map(u => [u._id.toString(), u.name]));
        const new_members = newProjMembers.map(m => ({
            user_name: userNameById.get(m.user.toString()) || 'Unknown',
            role: m.role,
            joined_at: m.joinedAt,
        }));

        const roleNotifs = await Notification.find({
            type: 'ROLE_CHANGE',
            createdAt: { $gte: since },
        }).populate('recipient', 'name').lean();
        const role_changes = roleNotifs.map(n => ({
            user_name: n.recipient?.name || 'Unknown',
            new_role: '',
            content: n.content || '',
            created_at: n.createdAt,
        }));

        const projectPayload = {
            project_id: project._id.toString(),
            project_name: project.name,
            user_role_in_project: userProjectRole,
            tasks_moved,
            activity_logs,
            chat_messages,
            wiki_changes,
            whiteboard_changes,
            new_members,
            role_changes,
        };

        let workspace_data = null;
        if (userWorkspaceRole === 'OWNER' || userWorkspaceRole === 'ADMIN') {
            const newWsMembers = workspace.members.filter(m => m.joinedAt && m.joinedAt >= since);
            const newWsMemberUsers = await User.find({
                _id: { $in: newWsMembers.map(m => m.user) },
            }).select('name').lean();
            const wsNameById = new Map(newWsMemberUsers.map(u => [u._id.toString(), u.name]));
            workspace_data = {
                new_members: newWsMembers.map(m => ({
                    user_name: wsNameById.get(m.user.toString()) || 'Unknown',
                    role: m.role,
                    joined_at: m.joinedAt,
                })),
                role_changes,
            };
        }

        const payload = {
            user_workspace_role: userWorkspaceRole,
            user_name: user.name,
            workspace_name: workspace.name,
            projects: [projectPayload],
            workspace_data,
        };

        const response = await fetch(`${aiServiceUrl}/api/standup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`Standup service ${response.status}:`, errBody);
            throw new Error(`AI Service responded with status: ${response.status}`);
        }

        const data = await response.json();
        await logAiServiceUse(userId, projectId, PROJ_ACTIONS.AI_STANDUP, 'AI Standup Report');
        res.status(200).json(data);
    } catch (error) {
        // The AI request failed — refund the quota unit checkAIQuota charged up-front.
        await refundAIQuota(req.userId);
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};

export const summarizeProject = async (req, res) => {
    try {
        const { projectId } = req.body;
        const aiServiceUrl = process.env.AI_SUMMARY_URL || 'http://localhost:8003';

        const project = await Project.findById(projectId)
            .populate('members.user', 'name');
        if (!project) return res.status(404).json({ message: "Project not found" });

        const tasks = await Task.find({ project: projectId })
            .populate('assignees', 'name')
            .populate('assignee', 'name')
            .lean();

        const payload = {
            project_id: project._id.toString(),
            project_name: project.name,
            project_description: project.description || '',
            tasks: tasks.map(t => ({
                task_id: t._id.toString(),
                title: t.title,
                status: t.status,
                priority: t.priority,
                due_date: t.dueDate || null,
                created_at: t.createdAt,
                updated_at: t.updatedAt,
                assignee_id: firstAssigneeId(t),
                assignee_name: assigneeNames(t),
            })),
            members: project.members.map(m => ({
                user_id: m.user._id.toString(),
                name: m.user.name,
                role: m.role,
            })),
            requested_at: new Date(),
        };

        const response = await fetch(`${aiServiceUrl}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`Summary service ${response.status}:`, errBody);
            throw new Error(`AI Service responded with status: ${response.status}`);
        }

        const data = await response.json();
        await logAiServiceUse(req.userId, projectId, PROJ_ACTIONS.AI_SUMMARIZE, 'AI Project Summary');
        res.status(200).json(data);
    } catch (error) {
        // The AI request failed — refund the quota unit checkAIQuota charged up-front.
        await refundAIQuota(req.userId);
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};

// it was using wrong url and wrong endpoint , fixed that
export const generateTasks = async (req, res) => {
    try {
        const { projectId, featureDescription } = req.body;
        const aiServiceUrl = process.env.AI_BREAKDOWN_URL || 'http://localhost:8004';

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const tasks = await Task.find({ project: projectId }).lean();

        const payload = {
            projectId,
            featureDescription,
            context: {
                project_name: project.name,
                project_description: project.description || '',
                existing_tasks: tasks.map(t => t.title)
            }
        };

        const response = await fetch(`${aiServiceUrl}/api/breakdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`AI Service responded with status: ${response.status}`);

        const data = await response.json();
        if (projectId) {
            await logAiServiceUse(req.userId, projectId, PROJ_ACTIONS.AI_GENERATE_TASKS, 'AI Task Generator');
        }
        res.status(200).json(data);
    } catch (error) {
        // The AI request failed — refund the quota unit checkAIQuota charged up-front.
        await refundAIQuota(req.userId);
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};

export const findBottlenecks = async (req, res) => {
    try {
        const { projectId } = req.body;
        const aiServiceUrl = process.env.AI_BLOCKER_URL || 'http://localhost:8001';

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const tasks = await Task.find({ project: projectId })
            .populate('assignees', 'name')
            .populate('assignee', 'name')
            .lean();

        const taskIds = tasks.map(t => t._id);
        const comments = await TaskComment.find({ task: { $in: taskIds } })
            .populate('author', 'name')
            .lean();

        const commentsByTask = comments.reduce((acc, c) => {
            const key = c.task.toString();
            (acc[key] ||= []).push({
                _id: c._id.toString(),
                author_id: c.author?._id?.toString() || '',
                author_name: c.author?.name || 'Unknown',
                content: c.content,
                created_at: c.createdAt,
            });
            return acc;
        }, {});

        const toPayload = t => ({
            task_id: t._id.toString(),
            title: t.title,
            description: t.description || '',
            status: t.status,
            priority: t.priority,
            assignee_id: firstAssigneeId(t),
            assignee_name: assigneeNames(t),
            due_date: t.dueDate || null,
            labels: t.labels || [],
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            comments: commentsByTask[t._id.toString()] || [],
            depends_on: [],
        });

        const active_tasks = tasks.filter(t => t.status === 'IN_PROGRESS').map(toPayload);
        const historical_tasks = tasks.filter(t => t.status === 'DONE' || t.status === 'IN_REVIEW').map(toPayload);

        if (active_tasks.length === 0) {
            return res.status(200).json({
                project_id: project._id.toString(),
                project_name: project.name,
                total_active_tasks: 0,
                stalled_tasks_count: 0,
                results: [],
                global_bottleneck_user: null,
                analysis_timestamp: new Date(),
                duration_ms: 0,
                message: "No active (IN_PROGRESS) tasks to analyse.",
            });
        }

        const payload = {
            project_id: project._id.toString(),
            project_name: project.name,
            active_tasks,
            historical_tasks,
        };

        const response = await fetch(`${aiServiceUrl}/find-bottleneck`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`Blocker service ${response.status}:`, errBody);
            throw new Error(`AI Service responded with status: ${response.status}`);
        }

        const data = await response.json();
        await logAiServiceUse(req.userId, projectId, PROJ_ACTIONS.AI_BOTTLENECK, 'AI Bottleneck Analysis');
        res.status(200).json(data);
    } catch (error) {
        // The AI request failed — refund the quota unit checkAIQuota charged up-front.
        await refundAIQuota(req.userId);
        console.error("Error connecting to AI service:", error.message);
        res.status(500).json({ error: "Failed to communicate with AI Service" });
    }
};
