// Rate limiters. Two tiers:
//   authLimiter — strict, protects login/register/refresh from brute force.
//   aiLimiter   — protects the AI proxy endpoints (they cost money per call).
//
// Disabled under test (NODE_ENV==='test') so the suite can fire many requests.
import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
const passthrough = (req, res, next) => next();

export const authLimiter = isTest ? passthrough : rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 30,                    // 30 auth attempts / IP / window
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

export const aiLimiter = isTest ? passthrough : rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 15,                    // 15 AI calls / IP / minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many AI requests. Please slow down.' },
});
