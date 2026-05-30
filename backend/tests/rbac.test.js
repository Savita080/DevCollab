// RBAC + IDOR tests — guards the permission rules and the audit fixes.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Task from '../models/task.js';
import { createUser, createWorkspace, createProject } from './helpers.js';

describe('Workspace RBAC', () => {
    it('a VIEWER cannot delete a workspace (403)', async () => {
        const { user: owner } = await createUser();
        const { user: viewer, token } = await createUser();
        const ws = await createWorkspace(owner, { members: [{ user: viewer._id, role: 'VIEWER' }] });

        const res = await request(app).delete(`/api/workspaces/${ws._id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it('a non-member cannot read workspace members (403)', async () => {
        const { user: owner } = await createUser();
        const { token: outsiderToken } = await createUser();
        const ws = await createWorkspace(owner);

        const res = await request(app).get(`/api/workspaces/${ws._id}/members`)
            .set('Authorization', `Bearer ${outsiderToken}`);
        expect(res.status).toBe(403);
    });

    it('the OWNER can delete their workspace (200)', async () => {
        const { user: owner, token } = await createUser();
        const ws = await createWorkspace(owner);

        const res = await request(app).delete(`/api/workspaces/${ws._id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});

describe('Project RBAC', () => {
    it('a project VIEWER cannot create a task (403)', async () => {
        const { user: owner } = await createUser();
        const { user: viewer, token } = await createUser();
        const ws = await createWorkspace(owner, { members: [{ user: viewer._id, role: 'MEMBER' }] });
        const proj = await createProject(ws, owner, { members: [{ user: viewer._id, role: 'VIEWER' }] });

        const res = await request(app)
            .post(`/api/workspaces/${ws._id}/projects/${proj._id}/tasks`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Nope' });
        expect(res.status).toBe(403);
    });

    it('a project CONTRIBUTOR can create a task (201)', async () => {
        const { user: owner, token } = await createUser();
        const ws = await createWorkspace(owner);
        const proj = await createProject(ws, owner);

        const res = await request(app)
            .post(`/api/workspaces/${ws._id}/projects/${proj._id}/tasks`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Build it' });
        expect(res.status).toBe(201);
        expect(res.body.task.title).toBe('Build it');
    });
});

describe('IDOR — cross-project task access', () => {
    it('cannot edit a task that belongs to another project (404)', async () => {
        const { user: owner, token } = await createUser();
        const ws = await createWorkspace(owner);
        const projectA = await createProject(ws, owner, { name: 'A' });
        const projectB = await createProject(ws, owner, { name: 'B' });

        // A task that lives in project B.
        const taskB = await Task.create({ project: projectB._id, title: 'Secret B task', position: 1024 });

        // Try to edit it THROUGH project A's URL.
        const res = await request(app)
            .patch(`/api/workspaces/${ws._id}/projects/${projectA._id}/tasks/${taskB._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'hacked' });

        expect(res.status).toBe(404);
        const fresh = await Task.findById(taskB._id);
        expect(fresh.title).toBe('Secret B task'); // unchanged
    });

    it('ignores a mass-assigned project field on update', async () => {
        const { user: owner, token } = await createUser();
        const ws = await createWorkspace(owner);
        const projectA = await createProject(ws, owner, { name: 'A' });
        const projectB = await createProject(ws, owner, { name: 'B' });
        const taskA = await Task.create({ project: projectA._id, title: 'Task A', position: 1024 });

        await request(app)
            .patch(`/api/workspaces/${ws._id}/projects/${projectA._id}/tasks/${taskA._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'ok', project: projectB._id.toString() });

        const fresh = await Task.findById(taskA._id);
        expect(fresh.project.toString()).toBe(projectA._id.toString()); // not moved
    });
});
