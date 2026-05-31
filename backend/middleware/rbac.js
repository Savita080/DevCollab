import Workspace from '../models/workspace.js';
import Project from '../models/project.js';

// The math logic for our hierarchy!
const ROLE_HIERARCHY = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3
};

export const requireRole = (minRole) => async (req, res, next) => {
    try {
        const workspaceId = req.params.workspaceId;
        
        if (!workspaceId) {
            return res.status(400).json({ message: "Workspace ID is required for role checking." });
        }

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found." });
        }

        const member = workspace.members.find(m => m.user.toString() === req.userId);

        if (!member) {
            return res.status(403).json({ message: "You are not a member of this workspace." });
        }

        const userRoleValue = ROLE_HIERARCHY[member.role];
        const minRoleValue = ROLE_HIERARCHY[minRole];

        if (userRoleValue < minRoleValue) {
            return res.status(403).json({ 
                message: `Insufficient permissions. You need to be at least an ${minRole} to do this.` 
            });
        }

        req.workspace = workspace;
        req.memberRole = member.role;
        
        next(); 

    } catch (error) {
        console.error("Error in RBAC middleware:", error.message);
        res.status(500).json({ error: "Internal Server Error in role checking" });
    }
};

const PROJECT_ROLE_HIERARCHY = {
    VIEWER: 0,
    CONTRIBUTOR: 1
};

export const requireProjectRole = (minRole) => async (req, res, next) => {
    try {
        const projectId = req.params.projectId || req.body?.projectId;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required for role checking." });
        }

        // Only the fields we actually need; no full hydration on this hot path.
        const project = await Project.findById(projectId).select('members workspace createdBy');
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        const member = project.members.find(m => m.user.toString() === req.userId);

        // Also allow Workspace OWNERs and ADMINs to bypass project roles (super admins).
        // Downstream middleware (checkLimit) relies on req.workspace being set, so we
        // load it here when it isn't already present.
        let isSuperAdmin = false;
        if (req.workspace && req.memberRole) {
            if (req.memberRole === 'OWNER' || req.memberRole === 'ADMIN') {
                isSuperAdmin = true;
            }
        } else {
            const workspace = await Workspace.findById(project.workspace);
            if (workspace) {
                req.workspace = workspace;
                const wsMember = workspace.members.find(m => m.user.toString() === req.userId);
                if (wsMember) {
                    req.memberRole = wsMember.role;
                    if (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN') {
                        isSuperAdmin = true;
                    }
                }
            }
        }

        if (!member && !isSuperAdmin) {
            return res.status(403).json({ message: "You are not a member of this project." });
        }

        if (!isSuperAdmin) {
            const userRoleValue = PROJECT_ROLE_HIERARCHY[member.role];
            const minRoleValue = PROJECT_ROLE_HIERARCHY[minRole];

            if (userRoleValue < minRoleValue) {
                return res.status(403).json({ 
                    message: `Insufficient project permissions. You need to be at least a ${minRole}.` 
                });
            }
        }

        req.project = project;
        req.projectRole = isSuperAdmin ? 'ADMIN' : member.role;

        next();

    } catch (error) {
        console.error("Error in Project RBAC middleware:", error.message);
        res.status(500).json({ error: "Internal Server Error in project role checking" });
    }
};

// Only the project creator (or workspace OWNER/ADMIN) may proceed.
// Used for irreversible actions like deleting the project itself or kicking the creator.
export const requireProjectCreator = async (req, res, next) => {
    try {
        const project = req.project || await Project.findById(req.params.projectId);
        if (!project) return res.status(404).json({ message: "Project not found." });

        const isWsAdmin = req.memberRole === 'OWNER' || req.memberRole === 'ADMIN';
        const isCreator = project.createdBy && project.createdBy.toString() === req.userId;

        if (!isWsAdmin && !isCreator) {
            return res.status(403).json({ message: "Only the project creator can perform this action." });
        }

        req.project = project;
        next();
    } catch (error) {
        console.error("Error in project creator check:", error.message);
        res.status(500).json({ error: "Internal Server Error in creator check" });
    }
};
