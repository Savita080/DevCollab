// lib/sentry.js — optional error tracking. Active only when SENTRY_DSN is set
// (env-guarded, like redis/webpush/objectStorage). Without a DSN everything here
// is a harmless no-op, so local/CI runs are unaffected.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
export const sentryEnabled = !!dsn;

if (sentryEnabled) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        // Sample a fraction of transactions for performance monitoring.
        tracesSampleRate: 0.1,
    });
    console.log('Sentry error tracking enabled.');
}

// Report an error to Sentry if configured; always safe to call.
export function captureError(err, context = {}) {
    if (!sentryEnabled) return;
    Sentry.captureException(err, { extra: context });
}

export default Sentry;
