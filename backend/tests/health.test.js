import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Health check', () => {
    it('returns 200 + ok when DB is connected', async () => {
        // The test setup connects mongoose to in-memory Mongo, so DB is up.
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.db).toBe('connected');
    });
});
