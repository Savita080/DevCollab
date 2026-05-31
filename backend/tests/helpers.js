// Reusable seeding helpers for tests. Create users, workspaces, projects, and
// auth tokens without repeating boilerplate in every test file.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/user.js';
import Workspace from '../models/workspace.js';
import Project from '../models/project.js';

let counter = 0;

// Create a User directly in the DB and return { user, token }. The token is a
// valid access token the same shape protectRoute expects.
export async function createUser(overrides = {}) {
    counter += 1;
    const user = await User.create({
        name: overrides.name || `User${counter}`,
        email: overrides.email || `user${counter}@test.com`,
        password: await bcrypt.hash('password123', 10),
        ...overrides,
    });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    return { user, token };
}

// Create a workspace owned by `owner`, optionally with extra members:
//   members: [{ user, role }]  (role = OWNER|ADMIN|MEMBER|VIEWER)
export async function createWorkspace(owner, { name = 'WS', members = [] } = {}) {
    counter += 1;
    return Workspace.create({
        name: `${name}${counter}`,
        normalizedName: `${name}${counter}`.toLowerCase(),
        slug: `${name}${counter}`.toLowerCase(),
        owner: owner._id,
        members: [{ user: owner._id, role: 'OWNER' }, ...members],
    });
}

// Create a project in a workspace. members: [{ user, role }] (CONTRIBUTOR|VIEWER)
export async function createProject(workspace, creator, { name = 'Proj', members = [] } = {}) {
    counter += 1;
    return Project.create({
        workspace: workspace._id,
        name: `${name}${counter}`,
        normalizedName: `${name}${counter}`.toLowerCase(),
        slug: `${name}${counter}`.toLowerCase(),
        createdBy: creator._id,
        members: [{ user: creator._id, role: 'CONTRIBUTOR' }, ...members],
    });
}
