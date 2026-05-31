// Auth tests — register/login validation and token gating.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createUser } from './helpers.js';

describe('Auth', () => {
    it('rejects register with missing fields (400)', async () => {
        const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
        expect(res.status).toBe(400);
    });

    it('registers a new user (201)', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'Alice', email: 'alice@test.com', password: 'password123' });
        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('alice@test.com');
    });

    it('rejects duplicate email (400)', async () => {
        await request(app).post('/api/auth/register')
            .send({ name: 'Bob', email: 'bob@test.com', password: 'password123' });
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'Bob2', email: 'bob@test.com', password: 'password123' });
        expect(res.status).toBe(400);
    });

    it('rejects login with missing password (400)', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
        expect(res.status).toBe(400);
    });

    it('rejects login with wrong password (400)', async () => {
        await request(app).post('/api/auth/register')
            .send({ name: 'Carol', email: 'carol@test.com', password: 'password123' });
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'carol@test.com', password: 'wrongpass' });
        expect(res.status).toBe(400);
    });

    it('logs in with correct credentials and returns a token (200)', async () => {
        await request(app).post('/api/auth/register')
            .send({ name: 'Dave', email: 'dave@test.com', password: 'password123' });
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'dave@test.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
    });
});

describe('Auth gating (protected routes)', () => {
    it('rejects a protected route with no token (401)', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('rejects a malformed token (401)', async () => {
        const res = await request(app).get('/api/auth/me')
            .set('Authorization', 'Bearer not-a-real-token');
        expect(res.status).toBe(401);
    });

    it('accepts a valid token (200)', async () => {
        const { token } = await createUser({ name: 'Eve', email: 'eve@test.com' });
        const res = await request(app).get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('eve@test.com');
    });
});
