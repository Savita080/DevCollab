import express from 'express';
import { 
    createWorkspace, getUserWorkspaces, updateWorkspace, deleteWorkspace, 
    generateInvite, acceptInvite, getWorkspaceMembers, updateMemberRole, removeMember,
    transferOwnership
} from '../controllers/workspacecontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { checkWorkspaceLimit, checkLimit } from '../middleware/planLimits.js';
import {
    sendWorkspaceMessage, getWorkspaceMessages, reactToWorkspaceMessage,
    editWorkspaceMessage, deleteWorkspaceMessage, togglePinWorkspaceMessage,
    searchWorkspaceMessages, markWorkspaceChatRead,
} from '../controllers/workspacechatcontroller.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';


const router = express.Router();
router.param('workspaceId', resolveWorkspace);

router.post('/', protectRoute, checkWorkspaceLimit, createWorkspace);
router.get('/', protectRoute, getUserWorkspaces);

router.patch('/:workspaceId', protectRoute, requireRole('OWNER'), updateWorkspace);
router.delete('/:workspaceId', protectRoute, requireRole('OWNER'), deleteWorkspace);
router.patch('/:workspaceId/transfer-ownership', protectRoute, requireRole('OWNER'), transferOwnership);

router.post('/:workspaceId/invite', protectRoute, requireRole('ADMIN'), checkLimit('members'), generateInvite);
router.post('/invite/accept/:token', protectRoute, acceptInvite);

router.get('/:workspaceId/members', protectRoute, requireRole('VIEWER'), getWorkspaceMembers);
router.patch('/:workspaceId/members/:userId/role', protectRoute, requireRole('ADMIN'), updateMemberRole);
router.delete('/:workspaceId/members/:userId', protectRoute, requireRole('ADMIN'), removeMember);

// Workspace Global Chat
router.post('/:workspaceId/chat', protectRoute, requireRole('VIEWER'), sendWorkspaceMessage);
router.get('/:workspaceId/chat', protectRoute, requireRole('VIEWER'), getWorkspaceMessages);
router.get('/:workspaceId/chat/search', protectRoute, requireRole('VIEWER'), searchWorkspaceMessages);
router.post('/:workspaceId/chat/read', protectRoute, requireRole('VIEWER'), markWorkspaceChatRead);
router.post('/:workspaceId/chat/:messageId/react', protectRoute, requireRole('VIEWER'), reactToWorkspaceMessage);
router.patch('/:workspaceId/chat/:messageId', protectRoute, requireRole('VIEWER'), editWorkspaceMessage);
router.delete('/:workspaceId/chat/:messageId', protectRoute, requireRole('VIEWER'), deleteWorkspaceMessage);
router.post('/:workspaceId/chat/:messageId/pin', protectRoute, requireRole('VIEWER'), togglePinWorkspaceMessage);

export default router;
