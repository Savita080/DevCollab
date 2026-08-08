import express from 'express';
import {
    createArtifact,
    getProjectArtifacts,
    getProjectTags,
    deleteArtifact,
} from '../controllers/artifactcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';
import { resolveProject } from '../middleware/resolveProject.js';

const router = express.Router({ mergeParams: true });
router.use(resolveWorkspace, resolveProject);

router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), createArtifact);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectArtifacts);
router.get('/tags', protectRoute, requireProjectRole('VIEWER'), getProjectTags);
router.delete('/:id', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteArtifact);

export default router;
