// Life OS Service Worker
// Handles background notifications and caching

const CACHE_NAME = "lifeos-v1";

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }

  if (event.data && event.data.type === "CHECK_NOTIFICATIONS") {
    event.waitUntil(checkAndNotify());
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/");
    })
  );
});

// Background periodic check (called via setInterval from client, or push)
async function checkAndNotify() {
  try {
    const response = await fetch("/api/notifications");
    if (!response.ok) return;

    const notifications = await response.json();

    for (const notif of notifications) {
      // Only show critical/warning notifications as browser notifications
      if (notif.severity === "info") continue;

      await self.registration.showNotification(notif.title, {
        body: notif.message,
        icon: "/icon-192.svg",
        badge: "/icon-192.svg",
        tag: notif.id, // Prevents duplicate notifications
        requireInteraction: notif.severity === "critical",
      });
    }
  } catch {
    // Silent fail - network may be unavailable
  }
}
