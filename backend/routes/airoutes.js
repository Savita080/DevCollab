import express from 'express';
import { reviewCode, generateStandup, summarizeProject, generateTasks, findBottlenecks } from '../controllers/aicontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { checkAIQuota } from '../middleware/planLimits.js';
import { injectWorkspaceFromProject } from '../middleware/injectWorkspaceFromProject.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// AI endpoints proxy to paid LLM services — rate limit all of them.
router.use(aiLimiter);

router.post('/review-code',       protectRoute, injectWorkspaceFromProject, requireProjectRole('CONTRIBUTOR'), checkAIQuota, reviewCode);
router.post('/standup',           protectRoute, injectWorkspaceFromProject, requireProjectRole('CONTRIBUTOR'), checkAIQuota, generateStandup);
router.post('/summarize-project', protectRoute, injectWorkspaceFromProject, requireProjectRole('CONTRIBUTOR'), checkAIQuota, summarizeProject);
router.post('/generate-tasks',    protectRoute, injectWorkspaceFromProject, requireProjectRole('CONTRIBUTOR'), checkAIQuota, generateTasks);
router.post('/bottleneck',        protectRoute, injectWorkspaceFromProject, requireProjectRole('CONTRIBUTOR'), checkAIQuota, findBottlenecks);

export default router;
