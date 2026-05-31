// Plan-limit tests — FREE plan caps. The plan lives on the workspace OWNER's
// user record; checkLimit reads it.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createUser, createWorkspace, createProject } from './helpers.js';

describe('Plan limits — projects (FREE cap = 3)', () => {
    it('blocks creating a 4th project on FREE (403)', async () => {
        const { user: owner, token } = await createUser(); // defaults to FREE plan
        const ws = await createWorkspace(owner);
        // Seed 3 existing projects directly (the cap).
        await createProject(ws, owner, { name: 'P1' });
        await createProject(ws, owner, { name: 'P2' });
        await createProject(ws, owner, { name: 'P3' });

        const res = await request(app)
            .post(`/api/workspaces/${ws._id}/projects`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Fourth' });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Plan limit reached');
    });

    it('allows creating projects under the cap (201)', async () => {
        const { user: owner, token } = await createUser();
        const ws = await createWorkspace(owner);

        const res = await request(app)
            .post(`/api/workspaces/${ws._id}/projects`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'First' });

        expect(res.status).toBe(201);
    });

    it('PRO owner can exceed the FREE project cap (201)', async () => {
        const { user: owner, token } = await createUser({
            subscription: { plan: 'PRO' },
        });
        const ws = await createWorkspace(owner);
        await createProject(ws, owner, { name: 'P1' });
        await createProject(ws, owner, { name: 'P2' });
        await createProject(ws, owner, { name: 'P3' });

        const res = await request(app)
            .post(`/api/workspaces/${ws._id}/projects`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Fourth' });

        expect(res.status).toBe(201);
    });
});
