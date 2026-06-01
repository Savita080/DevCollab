self.addEventListener('push', event => {
    if (!event.data) return;
    const { title, body, icon, badge, data } = event.data.json();
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: icon || '/favicon.png',
            badge: badge || '/favicon.png',
            data,
            vibrate: [100, 50, 100],
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const link = event.notification.data?.link || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // If app is already open, focus it and navigate
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.postMessage({ type: 'NAVIGATE', link });
                    return;
                }
            }
            // Otherwise open a new tab
            clients.openWindow(self.location.origin + link);
        })
    );
});
