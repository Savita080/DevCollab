import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import User from '../models/user.js';
import { notifyUser } from '../utils/notify.js';
import { logWorkspaceActivity, logProjectActivity } from '../utils/activityLogger.js';
import { WS_ACTIONS, PROJ_ACTIONS, OBJECT_TYPES } from '../utils/activityActions.js';
import { generateUniqueSlug, normalizeName } from '../utils/slug.js';

export const createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const workspaceId = req.params.workspaceId;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Project name is required" });
        }

        const normalized = normalizeName(name);

        // Per-workspace duplicate check.
        const existing = await Project.findOne({ workspace: workspaceId, normalizedName: normalized });
        if (existing) {
            return res.status(409).json({
                message: `A project named "${existing.name}" already exists in this workspace.`,
                code: 'DUPLICATE_NAME'
            });
        }

        const slug = await generateUniqueSlug(Project, name, { extraFilter: { workspace: workspaceId } });

        const newProject = await Project.create({
            workspace: workspaceId,
            name: name.trim(),
            normalizedName: normalized,
            slug,
            description,
            createdBy: req.userId,
            members: [{
                user: req.userId,
                role: 'CONTRIBUTOR'
            }]
        });

        const creator = await User.findById(req.userId).select('name');
        const wsPayload = {
            workspace: workspaceId,
            project: newProject._id,
            user: req.userId,
            objectType: OBJECT_TYPES.PROJECT,
            targetId: newProject._id,
            targetName: name,
            metadata: { creatorName: creator?.name },
        };
        await logWorkspaceActivity({ ...wsPayload, action: WS_ACTIONS.PROJECT_CREATED });
        await logWorkspaceActivity({
            ...wsPayload,
            action: WS_ACTIONS.PROJECT_MEMBER_JOINED,
            objectType: OBJECT_TYPES.MEMBER,
            targetId: req.userId,
            targetName: creator?.name || 'Member',
            metadata: { role: 'CONTRIBUTOR', projectName: name, affectedUserId: req.userId.toString() },
        });
        await logProjectActivity({ ...wsPayload, action: PROJ_ACTIONS.PROJECT_CREATED });

        res.status(201).json({
            message: "Project created successfully",
            project: newProject
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A project with this name already exists in this workspace.",
                code: 'DUPLICATE_NAME'
            });
        }
        console.error("Error creating project:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId)
            .populate('createdBy', 'name email avatar')
            .lean();
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.status(200).json({ project });
    } catch (error) {
        console.error("Error fetching project:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWorkspaceProjects = async (req, res) => {
    try {
        const workspaceId = req.params.workspaceId;
        const userId = req.userId;

        // Every workspace member sees every project card; gating happens when they
        // try to OPEN a project (handled by ProjectLayout/AccessRestricted on the FE
        // and requireProjectRole on the BE). Each card gets a hasAccess flag so the
        // frontend can show a lock badge for projects this user can't enter.
        const projects = await Project.find({ workspace: workspaceId }).lean();

        const projectsWithAccess = projects.map(p => {
            const isMember = p.members?.some(m => m.user.toString() === userId.toString());
            return {
                ...p,
                hasAccess: !!isMember || req.memberRole === 'OWNER' || req.memberRole === 'ADMIN',
            };
        });

        res.status(200).json({ projects: projectsWithAccess });
    } catch (error) {
        console.error("Error fetching projects:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateProject = async (req, res) => {
    try {
        const { projectId, workspaceId } = req.params;
        const { name, description } = req.body;

        const before = await Project.findById(projectId);
        if (!before) {
            return res.status(404).json({ message: "Project not found" });
        }

        const updates = { description };

        if (name !== undefined && name.trim()) {
            const normalized = normalizeName(name);
            // Per-workspace dup check, excluding self
            const collision = await Project.findOne({
                workspace: workspaceId,
                normalizedName: normalized,
                _id: { $ne: projectId }
            });
            if (collision) {
                return res.status(409).json({
                    message: `A project named "${collision.name}" already exists in this workspace.`,
                    code: 'DUPLICATE_NAME'
                });
            }
            updates.name = name.trim();
            updates.normalizedName = normalized;
            // Regenerate slug if normalized name actually changed
            if (normalized !== before.normalizedName) {
                updates.slug = await generateUniqueSlug(Project, name, {
                    extraFilter: { workspace: workspaceId },
                    excludeId: projectId
                });
            }
        }

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            updates,
            { new: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        const base = {
            workspace: workspaceId,
            project: projectId,
            user: req.userId,
            objectType: OBJECT_TYPES.PROJECT,
            targetId: projectId,
            targetName: updatedProject.name,
        };

        if (name !== undefined && name !== before.name) {
            await logWorkspaceActivity({
                ...base,
                action: WS_ACTIONS.PROJECT_RENAMED,
                metadata: { previousName: before.name, newName: updatedProject.name },
            });
        }
        if (description !== undefined && description !== before.description) {
            await logWorkspaceActivity({
                ...base,
                action: WS_ACTIONS.PROJECT_DESCRIPTION_UPDATED,
                targetName: updatedProject.name,
            });
        }

        res.status(200).json({
            message: "Project updated successfully",
            project: updatedProject
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A project with this name already exists in this workspace.",
                code: 'DUPLICATE_NAME'
            });
        }
        console.error("Error updating project:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { projectId, workspaceId } = req.params;
        const deletedProject = await Project.findByIdAndDelete(projectId);

        if (!deletedProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        await logWorkspaceActivity({
            workspace: workspaceId,
            project: projectId,
            user: req.userId,
            action: WS_ACTIONS.PROJECT_DELETED,
            objectType: OBJECT_TYPES.PROJECT,
            targetId: projectId,
            targetName: deletedProject.name,
        });

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Error deleting project:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getProjectMembers = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId).populate('members.user', 'name email avatar');
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.status(200).json({ members: project.members });
    } catch (error) {
        console.error("Error fetching project members:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const addProjectMember = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, role } = req.body;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Check if user is already a member (subdocument comparison)
        const alreadyMember = project.members.some(m => m.user.toString() === userId);
        if (alreadyMember) {
            return res.status(400).json({ message: "User is already a member of this project" });
        }

        project.members.push({
            user: userId,
            role: role || 'VIEWER'
        });
        await project.save();

        const addedUser = await User.findById(userId).select('name');
        const memberRole = role || 'VIEWER';
        const base = {
            workspace: req.params.workspaceId,
            project: projectId,
            user: req.userId,
            objectType: OBJECT_TYPES.MEMBER,
            targetId: userId,
            targetName: addedUser?.name || 'Member',
            metadata: { role: memberRole, affectedUserId: userId, projectName: project.name },
        };
        await logProjectActivity({ ...base, action: PROJ_ACTIONS.MEMBER_ADDED });
        await logWorkspaceActivity({ ...base, action: WS_ACTIONS.PROJECT_MEMBER_JOINED });

        // Notify the newly added user
        const sender = await User.findById(req.userId).select('name');
        const senderName = sender?.name || 'Someone';
        notifyUser(req.io, {
            recipient: userId,
            sender: req.userId,
            type: 'PROJECT_ASSIGN',
            content: `${senderName} added you to "${project.name}" as ${role || 'VIEWER'}`,
            link: `/workspaces/${req.params.workspaceId}/projects/${req.params.projectId}`,
        }).catch(err => console.error('[project-add notify] failed:', err.message));

        res.status(201).json({ message: "Member added to project", members: project.members });
    } catch (error) {
        console.error("Error adding project member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateProjectMemberRole = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ message: "Role is required" });
        }

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const memberIndex = project.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) return res.status(404).json({ message: "Member not found in this project" });

        const prevRole = project.members[memberIndex].role;
        if (prevRole === role) {
            const unchanged = await Project.findById(projectId).populate('members.user', 'name email avatar');
            return res.status(200).json({ message: "Role unchanged", members: unchanged.members });
        }

        project.members[memberIndex].role = role;
        await project.save();

        const affected = await User.findById(userId).select('name');
        await logProjectActivity({
            workspace: req.params.workspaceId,
            project: projectId,
            user: req.userId,
            action: PROJ_ACTIONS.MEMBER_ROLE_CHANGED,
            objectType: OBJECT_TYPES.MEMBER,
            targetId: userId,
            targetName: affected?.name || 'Member',
            metadata: { previousRole: prevRole, newRole: role, affectedUserId: userId },
        });

        const populated = await Project.findById(projectId).populate('members.user', 'name email avatar');
        res.status(200).json({ message: "Role updated successfully", members: populated.members });
    } catch (error) {
        console.error("Error updating project member role:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const removeProjectMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const memberExists = project.members.some(m => m.user.toString() === userId);
        if (!memberExists) return res.status(404).json({ message: "Member not found in this project" });

        // The project creator can only be removed by themselves or a workspace OWNER/ADMIN.
        if (project.createdBy && project.createdBy.toString() === userId) {
            const isWsAdmin = req.memberRole === 'OWNER' || req.memberRole === 'ADMIN';
            const isSelf = userId === req.userId;
            if (!isWsAdmin && !isSelf) {
                return res.status(403).json({ message: "Only the project creator or a workspace admin can remove the creator from this project." });
            }
        }

        const removedMember = project.members.find(m => m.user.toString() === userId);
        const isSelf = userId === req.userId;
        const affected = await User.findById(userId).select('name');

        project.members = project.members.filter(m => m.user.toString() !== userId);
        await project.save();

        const base = {
            workspace: req.params.workspaceId,
            project: projectId,
            user: req.userId,
            objectType: OBJECT_TYPES.MEMBER,
            targetId: userId,
            targetName: affected?.name || 'Member',
            metadata: {
                role: removedMember?.role,
                affectedUserId: userId,
                projectName: project.name,
            },
        };
        await logProjectActivity({
            ...base,
            action: isSelf ? PROJ_ACTIONS.MEMBER_EXITED : PROJ_ACTIONS.MEMBER_REMOVED,
        });
        await logWorkspaceActivity({
            ...base,
            action: WS_ACTIONS.PROJECT_MEMBER_LEFT,
        });

        res.status(200).json({ message: "Member removed from project", members: project.members });
    } catch (error) {
        console.error("Error removing project member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
