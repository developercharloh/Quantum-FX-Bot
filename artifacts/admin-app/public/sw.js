// Quantum FX Bot — Admin Service Worker
// Handles background push notifications for login, deposit, and withdrawal events

self.addEventListener("push", (event) => {
  let payload = { title: "Quantum FX Admin", body: "New activity", icon: "/favicon.svg", tag: "qfx-admin" };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = { ...payload, ...data };
    }
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? "/favicon.svg",
      badge: "/favicon.svg",
      tag: payload.tag ?? "qfx-admin",
      renotify: true,
      requireInteraction: false,
      data: payload.data ?? {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(self.location.origin);
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
