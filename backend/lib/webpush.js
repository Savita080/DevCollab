import webpush from 'web-push';

// Web push is optional — only configure if all VAPID env vars are present.
// Without them, sendPushToUser becomes a no-op (mirrors the optional-Redis pattern).
const pushEnabled = !!(process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (pushEnabled) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn("WARNING: VAPID_* env vars missing. Web push notifications are disabled.");
}

// Send a push to all of a user's saved subscriptions.
// Silently removes subscriptions that the browser has invalidated (410 Gone).
export async function sendPushToUser(user, payload) {
    if (!pushEnabled) return;
    if (!user?.pushSubscriptions?.length) return;

    const data = JSON.stringify({
        title: payload.title || 'DevCollab',
        body: payload.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: { link: payload.link || '/' },
    });

    const results = await Promise.allSettled(
        user.pushSubscriptions.map(sub => webpush.sendNotification(sub, data))
    );

    // Collect indices of dead subscriptions (browser unsubscribed / revoked)
    const deadIndices = results
        .map((r, i) => (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode) ? i : null))
        .filter(i => i !== null);

    if (deadIndices.length) {
        deadIndices.reverse().forEach(i => user.pushSubscriptions.splice(i, 1));
        await user.save();
    }
}
