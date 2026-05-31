// IDOR tests for the remaining resources (snippets, wiki, whiteboards) plus
// comment-route authorization. Guards the audit fixes against regression.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import CodeSnippet from '../models/codeSnippet.js';
import WikiPage from '../models/wikiPage.js';
import Whiteboard from '../models/whiteboard.js';
import Task from '../models/task.js';
import { createUser, createWorkspace, createProject } from './helpers.js';

// Seed an owner with a workspace + two projects (A and B). Returns everything
// a cross-project IDOR test needs.
async function twoProjects() {
    const { user: owner, token } = await createUser();
    const ws = await createWorkspace(owner);
    const projectA = await createProject(ws, owner, { name: 'A' });
    const projectB = await createProject(ws, owner, { name: 'B' });
    return { owner, token, ws, projectA, projectB };
}

describe('IDOR — snippets', () => {
    it('cannot edit a snippet from another project (404)', async () => {
        const { token, ws, projectA, projectB } = await twoProjects();
        const snippetB = await CodeSnippet.create({ project: projectB._id, title: 'B snip', language: 'js', code: 'x' });

        const res = await request(app)
            .patch(`/api/workspaces/${ws._id}/projects/${projectA._id}/snippets/${snippetB._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'hacked' });

        expect(res.status).toBe(404);
        const fresh = await CodeSnippet.findById(snippetB._id);
        expect(fresh.title).toBe('B snip');
    });

    it('cannot delete a snippet from another project (404)', async () => {
        const { token, ws, projectA, projectB } = await twoProjects();
        const snippetB = await CodeSnippet.create({ project: projectB._id, title: 'B snip', language: 'js', code: 'x' });

        const res = await request(app)
            .delete(`/api/workspaces/${ws._id}/projects/${projectA._id}/snippets/${snippetB._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(await CodeSnippet.findById(snippetB._id)).not.toBeNull();
    });
});

describe('IDOR — wiki pages', () => {
    it('cannot edit a wiki page from another project (404)', async () => {
        const { token, ws, projectA, projectB } = await twoProjects();
        const pageB = await WikiPage.create({ project: projectB._id, title: 'B page', content: 'secret' });

        const res = await request(app)
            .patch(`/api/workspaces/${ws._id}/projects/${projectA._id}/wiki/${pageB._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'hacked' });

        expect(res.status).toBe(404);
        const fresh = await WikiPage.findById(pageB._id);
        expect(fresh.title).toBe('B page');
    });

    it('cannot delete a wiki page from another project (404)', async () => {
        const { token, ws, projectA, projectB } = await twoProjects();
        const pageB = await WikiPage.create({ project: projectB._id, title: 'B page' });

        const res = await request(app)
            .delete(`/api/workspaces/${ws._id}/projects/${projectA._id}/wiki/${pageB._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(await WikiPage.findById(pageB._id)).not.toBeNull();
    });
});

describe('IDOR — whiteboards', () => {
    it('cannot rename a whiteboard from another project (404)', async () => {
        const { token, ws, projectA, projectB } = await twoProjects();
        const boardB = await Whiteboard.create({ project: projectB._id, name: 'B board' });

        const res = await request(app)
            .patch(`/api/workspaces/${ws._id}/projects/${projectA._id}/whiteboards/${boardB._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'hacked' });

        expect(res.status).toBe(404);
        const fresh = await Whiteboard.findById(boardB._id);
        expect(fresh.name).toBe('B board');
    });

    it('cannot delete a whiteboard from another project (404)', async () => {
        const { token, ws, projectA, projectB } = await twoProjects();
        const boardB = await Whiteboard.create({ project: projectB._id, name: 'B board' });

        const res = await request(app)
            .delete(`/api/workspaces/${ws._id}/projects/${projectA._id}/whiteboards/${boardB._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(await Whiteboard.findById(boardB._id)).not.toBeNull();
    });
});

describe('Comment route authorization', () => {
    it('a non-member cannot read a task\'s comments (403/404)', async () => {
        // Owner has a project with a task; an outsider tries to read its comments.
        const { user: owner } = await createUser();
        const ws = await createWorkspace(owner);
        const proj = await createProject(ws, owner);
        const task = await Task.create({ project: proj._id, title: 'T', position: 1024 });

        const { token: outsiderToken } = await createUser();
        const res = await request(app)
            .get(`/api/tasks/${task._id}/comments`)
            .set('Authorization', `Bearer ${outsiderToken}`);

        expect([403, 404]).toContain(res.status);
    });

    it('a non-member cannot post a comment (403/404)', async () => {
        const { user: owner } = await createUser();
        const ws = await createWorkspace(owner);
        const proj = await createProject(ws, owner);
        const task = await Task.create({ project: proj._id, title: 'T', position: 1024 });

        const { token: outsiderToken } = await createUser();
        const res = await request(app)
            .post(`/api/tasks/${task._id}/comments`)
            .set('Authorization', `Bearer ${outsiderToken}`)
            .send({ content: 'sneaky' });

        expect([403, 404]).toContain(res.status);
    });

    it('a project member can read comments (200)', async () => {
        const { user: owner, token } = await createUser();
        const ws = await createWorkspace(owner);
        const proj = await createProject(ws, owner);
        const task = await Task.create({ project: proj._id, title: 'T', position: 1024 });

        const res = await request(app)
            .get(`/api/tasks/${task._id}/comments`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });
});
