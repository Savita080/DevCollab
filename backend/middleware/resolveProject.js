// Resolves the :projectId URL param so callers can pass either an ObjectId
// or a project slug. Project slugs are unique per workspace, so this needs
// req.params.workspaceId to already be a canonical ObjectId — which it is,
// because resolveWorkspace runs first via app.param('workspaceId', ...).

import mongoose from 'mongoose';
import Project from '../models/project.js';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export const resolveProject = async (req, res, next) => {
    try {
        const param = req.params.projectId;
        if (!param) return next();

        const workspaceId = req.params.workspaceId;

        if (mongoose.isValidObjectId(param) && OBJECT_ID_RE.test(param)) {
            // Even though the id is well-formed, it may belong to a *different*
            // workspace than the one in the URL (e.g. a stale client request,
            // or one crafted by hand). Without this check, downstream RBAC
            // (requireProjectRole) falls back to the project's real workspace
            // when checking for a super-admin bypass — silently authorizing
            // against the wrong workspace instead of 404ing.
            if (workspaceId) {
                const project = await Project.findOne({ _id: param, workspace: workspaceId }).select('_id');
                if (!project) {
                    return res.status(404).json({ message: "Project not found." });
                }
            }
            return next();
        }

        if (!workspaceId) {
            // Project slugs aren't globally unique — if there's no workspace context,
            // we can't resolve. Shouldn't happen with current routing.
            return res.status(400).json({ message: "Workspace context required to resolve project slug." });
        }

        const project = await Project.findOne({
            workspace: workspaceId,
            slug: param.toLowerCase()
        }).select('_id');
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        req.params.projectId = project._id.toString();
        next();
    } catch (error) {
        console.error("Error in resolveProject middleware:", error.message);
        res.status(500).json({ error: "Internal Server Error in project resolver" });
    }
};
