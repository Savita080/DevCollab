import Workspace from '../models/workspace.js';
import User from '../models/user.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/email.js';
import { notifyUser } from '../utils/notify.js';
import { logWorkspaceActivity } from '../utils/activityLogger.js';
import { WS_ACTIONS, OBJECT_TYPES } from '../utils/activityActions.js';
import { generateUniqueSlug, normalizeName } from '../utils/slug.js';


export const createWorkspace = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Workspace name is required" });
        }

        const normalized = normalizeName(name);

        // Per-owner duplicate check — same user can't own two "Acme"s.
        const existing = await Workspace.findOne({ owner: req.userId, normalizedName: normalized });
        if (existing) {
            return res.status(409).json({
                message: `You already have a workspace named "${existing.name}".`,
                code: 'DUPLICATE_NAME'
            });
        }

        // Slug is globally unique. Auto-suffix with random base36 on collision.
        const slug = await generateUniqueSlug(Workspace, name);

        const newWorkspace = await Workspace.create({
            name: name.trim(),
            normalizedName: normalized,
            slug,
            owner: req.userId,
            members: [{
                user: req.userId,
                role: 'OWNER'
            }]
        });

        const owner = await User.findById(req.userId).select('name');
        await logWorkspaceActivity({
            workspace: newWorkspace._id,
            user: req.userId,
            action: WS_ACTIONS.WORKSPACE_CREATED,
            objectType: OBJECT_TYPES.WORKSPACE,
            targetId: newWorkspace._id,
            targetName: newWorkspace.name,
            metadata: { ownerName: owner?.name || 'Owner' },
        });

        res.status(201).json({
            message: "Workspace created successfully",
            workspace: newWorkspace
        });

    } catch (error) {
        // E11000 with our compound (owner, normalizedName) index → race that slipped past the
        // pre-check. Surface as the same 409 the controller would have returned.
        if (error.code === 11000) {
            const key = error.keyPattern || {};
            if (key.owner && key.normalizedName) {
                return res.status(409).json({
                    message: "You already have a workspace with this name.",
                    code: 'DUPLICATE_NAME'
                });
            }
            // Slug collision shouldn't happen now that generateUniqueSlug retries, but be safe.
            return res.status(500).json({ message: "Slug collision — please try again." });
        }
        console.error("Error creating workspace:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getUserWorkspaces = async (req, res) => {
    try {
        // Find all workspaces where the "members" array contains an object with this user's ID
        const workspaces = await Workspace.find({ 
            "members.user": req.userId 
        });

        res.status(200).json({ workspaces });
    } catch (error) {
        console.error("Error fetching workspaces:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



// Update Workspace Name (OWNER ONLY)
export const updateWorkspace = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Workspace name is required" });
        }

        const normalized = normalizeName(name);

        // Per-owner duplicate check — exclude self so renaming to the same name is a no-op, not an error.
        const collision = await Workspace.findOne({
            owner: req.workspace.owner,
            normalizedName: normalized,
            _id: { $ne: req.workspace._id }
        });
        if (collision) {
            return res.status(409).json({
                message: `You already have a workspace named "${collision.name}".`,
                code: 'DUPLICATE_NAME'
            });
        }

        // Capture the OLD normalized name before mutating so we can tell whether
        // the name actually changed (the slug should only move when it did).
        const nameChanged = req.workspace.normalizedName !== normalized;

        req.workspace.name = name.trim();
        req.workspace.normalizedName = normalized;
        // Regenerate slug only if normalized name changed — preserves URLs through cosmetic edits.
        if (nameChanged || !req.workspace.slug) {
            req.workspace.slug = await generateUniqueSlug(Workspace, name, { excludeId: req.workspace._id });
        }

        await req.workspace.save();

        res.status(200).json({
            message: "Workspace updated successfully",
            workspace: req.workspace
        });

    } catch (error) {
        if (error.code === 11000) {
            const key = error.keyPattern || {};
            if (key.owner && key.normalizedName) {
                return res.status(409).json({
                    message: "You already have a workspace with this name.",
                    code: 'DUPLICATE_NAME'
                });
            }
        }
        console.error("Error updating workspace:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Delete Workspace (OWNER ONLY)
export const deleteWorkspace = async (req, res) => {
    try {
        // Because the middleware already fetched the workspace, we just delete it
        await req.workspace.deleteOne();
        
        res.status(200).json({ message: "Workspace deleted successfully" });
    } catch (error) {
        console.error("Error deleting workspace:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 1. Generate an Invite (ADMIN or OWNER only)
export const generateInvite = async (req, res) => {
    try {
        const { email, role } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Generate a random 40-character token
        const token = crypto.randomBytes(20).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours

        // Add the invite to the workspace array
        req.workspace.invites.push({
            email,
            token,
            role: role || 'MEMBER',
            expiresAt
        });

        await req.workspace.save();

        // Get the frontend URL from env (fallback to localhost for dev)
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
        const inviteLink = `${frontendUrl}/invite/accept/${token}`;

        // Send actual email via Brevo
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You've been invited to join ${req.workspace.name}!</h2>
                <p>You have been invited to collaborate on DevCollab as a <strong>${role || 'MEMBER'}</strong>.</p>
                <br/>
                <a href="${inviteLink}" style="padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
                <br/><br/>
                <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="color: #666; font-size: 14px; word-break: break-all;">${inviteLink}</p>
            </div>
        `;
        
        // We do NOT await this. It fires in the background so the API responds instantly.
        sendEmail(email, `Invitation to join ${req.workspace.name}`, htmlContent);

        res.status(200).json({
            message: "Invite generated successfully",
            inviteLink
        });

    } catch (error) {
        console.error("Error generating invite:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 2. Accept an Invite (Logged-in users only)
export const acceptInvite = async (req, res) => {
    try {
        const { token } = req.params;

        // Find a workspace that contains this exact token in its invites array
        const workspace = await Workspace.findOne({ "invites.token": token });

        if (!workspace) {
            return res.status(400).json({ message: "Invalid or expired invite link" });
        }

        // Find the specific invite inside the array
        const inviteIndex = workspace.invites.findIndex(i => i.token === token);
        const invite = workspace.invites[inviteIndex];

        // Check if it expired
        if (new Date() > invite.expiresAt) {
            // Remove the expired invite and save
            workspace.invites.splice(inviteIndex, 1);
            await workspace.save();
            return res.status(400).json({ message: "This invite link has expired" });
        }

        // Bind the invite to the email it was issued to — a leaked/forwarded link
        // can't be redeemed by a different account (prevents role escalation).
        if (invite.email) {
            const accepter = await User.findById(req.userId).select('email');
            if (!accepter || accepter.email.toLowerCase() !== invite.email.toLowerCase()) {
                return res.status(403).json({ message: "This invite was issued to a different email address." });
            }
        }

        // Check if the user is already a member
        const isAlreadyMember = workspace.members.some(m => m.user.toString() === req.userId);
        if (isAlreadyMember) {
            return res.status(400).json({ message: "You are already a member of this workspace" });
        }

        // Add the user to the workspace members!
        workspace.members.push({
            user: req.userId, // From our protectRoute middleware
            role: invite.role
        });

        // Delete the invite so it can't be used again
        workspace.invites.splice(inviteIndex, 1);
        await workspace.save();

        const joiner = await User.findById(req.userId).select('name');
        await logWorkspaceActivity({
            workspace: workspace._id,
            user: req.userId,
            action: WS_ACTIONS.MEMBER_JOINED,
            objectType: OBJECT_TYPES.MEMBER,
            targetId: req.userId,
            targetName: joiner?.name || 'Member',
            metadata: { role: invite.role, affectedUserId: req.userId.toString() },
        });

        res.status(200).json({
            message: "Successfully joined the workspace!",
            workspaceId: workspace._id
        });

    } catch (error) {
        console.error("Error accepting invite:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getWorkspaceMembers = async (req, res) => {
    try {
        // req.workspace is already populated with members from the middleware, but we might want full user details
        const workspace = await Workspace.findById(req.workspace._id).populate('members.user', 'name email avatar');
        res.status(200).json({ members: workspace.members });
    } catch (error) {
        console.error("Error fetching members:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateMemberRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const memberIndex = req.workspace.members.findIndex(m => m.user.toString() === userId);
        if (memberIndex === -1) return res.status(404).json({ message: "Member not found" });

        const prevRole = req.workspace.members[memberIndex].role;
        req.workspace.members[memberIndex].role = role;
        await req.workspace.save();

        // Notify the affected user if role actually changed
        if (prevRole !== role) {
            const affected = await User.findById(userId).select('name');
            await logWorkspaceActivity({
                workspace: req.workspace._id,
                user: req.userId,
                action: WS_ACTIONS.MEMBER_ROLE_CHANGED,
                objectType: OBJECT_TYPES.MEMBER,
                targetId: userId,
                targetName: affected?.name || 'Member',
                metadata: {
                    previousRole: prevRole,
                    newRole: role,
                    affectedUserId: userId,
                },
            });

            const sender = await User.findById(req.userId).select('name');
            const senderName = sender?.name || 'An admin';
            notifyUser(req.io, {
                recipient: userId,
                sender: req.userId,
                type: 'ROLE_CHANGE',
                content: `${senderName} changed your role in "${req.workspace.name}" from ${prevRole} to ${role}`,
                link: `/workspaces/${req.workspace._id}`,
            }).catch(err => console.error('[role-change notify] failed:', err.message));
        }

        res.status(200).json({ message: "Role updated successfully", members: req.workspace.members });
    } catch (error) {
        console.error("Error updating role:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Prevent removing the OWNER
        const member = req.workspace.members.find(m => m.user.toString() === userId);
        if (!member) return res.status(404).json({ message: "Member not found" });
        if (member.role === 'OWNER') return res.status(400).json({ message: "Cannot remove the workspace owner" });

        const affected = await User.findById(userId).select('name');
        const isSelf = userId === req.userId;

        req.workspace.members = req.workspace.members.filter(m => m.user.toString() !== userId);
        await req.workspace.save();

        await logWorkspaceActivity({
            workspace: req.workspace._id,
            user: req.userId,
            action: isSelf ? WS_ACTIONS.MEMBER_LEFT : WS_ACTIONS.MEMBER_REMOVED,
            objectType: OBJECT_TYPES.MEMBER,
            targetId: userId,
            targetName: affected?.name || 'Member',
            metadata: { affectedUserId: userId, role: member.role },
        });

        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        console.error("Error removing member:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const transferOwnership = async (req, res) => {
    try {
        const { newOwnerId } = req.body;

        if (!newOwnerId) {
            return res.status(400).json({ message: "newOwnerId is required" });
        }

        // Ensure the new owner exists in the workspace
        const newOwnerIndex = req.workspace.members.findIndex(m => m.user.toString() === newOwnerId);
        if (newOwnerIndex === -1) {
            return res.status(404).json({ message: "The specified user is not a member of this workspace" });
        }

        // Find the current owner (the requester)
        const currentOwnerIndex = req.workspace.members.findIndex(m => m.user.toString() === req.userId);
        
        // Safety check (handled by requireRole middleware, but good to have)
        if (currentOwnerIndex === -1 || req.workspace.members[currentOwnerIndex].role !== 'OWNER') {
            return res.status(403).json({ message: "Only the current owner can transfer ownership" });
        }

        // Block transfer if the new owner already has a workspace with this name —
        // would violate the (owner, normalizedName) compound unique index.
        const collision = await Workspace.findOne({
            owner: newOwnerId,
            normalizedName: req.workspace.normalizedName,
            _id: { $ne: req.workspace._id }
        });
        if (collision) {
            return res.status(409).json({
                message: `Transfer blocked — the new owner already has a workspace named "${collision.name}". Rename one first.`,
                code: 'DUPLICATE_NAME'
            });
        }

        // Transfer the title
        req.workspace.members[currentOwnerIndex].role = 'ADMIN'; // Demote current owner to ADMIN
        req.workspace.members[newOwnerIndex].role = 'OWNER'; // Promote new user to OWNER
        req.workspace.owner = newOwnerId; // Top-level owner pointer drives the uniqueness index

        await req.workspace.save();

        const newOwner = await User.findById(newOwnerId).select('name');
        await logWorkspaceActivity({
            workspace: req.workspace._id,
            user: req.userId,
            action: WS_ACTIONS.OWNERSHIP_TRANSFERRED,
            objectType: OBJECT_TYPES.WORKSPACE,
            targetId: req.workspace._id,
            targetName: req.workspace.name,
            metadata: {
                previousOwnerId: req.userId.toString(),
                newOwnerId: newOwnerId.toString(),
                newOwnerName: newOwner?.name || 'Member',
            },
        });

        // Notify the new owner
        const sender = await User.findById(req.userId).select('name');
        const senderName = sender?.name || 'The previous owner';
        notifyUser(req.io, {
            recipient: newOwnerId,
            sender: req.userId,
            type: 'ROLE_CHANGE',
            content: `${senderName} transferred ownership of "${req.workspace.name}" to you`,
            link: `/workspaces/${req.workspace._id}`,
        }).catch(err => console.error('[ownership notify] failed:', err.message));

        res.status(200).json({
            message: "Ownership transferred successfully",
            members: req.workspace.members
        });

    } catch (error) {
        console.error("Error transferring ownership:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
