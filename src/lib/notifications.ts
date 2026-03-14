"use client";

// Browser Notification API integration + notification settings management

export type NotificationType =
  | "task_upcoming"
  | "task_missed"
  | "habit_reminder"
  | "gaming_alert"
  | "distraction"
  | "daily_review"
  | "social_media_alert";

export interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  missedTaskAlerts: boolean;
  habitReminders: boolean;
  habitReminderTime: string; // HH:mm
  gamingAlerts: boolean;
  gamingAlertMinutes: number;
  socialMediaAlerts: boolean;
  distractionDetection: boolean;
  dailyReviewPrompt: boolean;
  dailyReviewTime: string; // HH:mm
  browserNotifications: boolean;
}

const SETTINGS_KEY = "lifeos-notification-settings";

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  taskReminders: true,
  missedTaskAlerts: true,
  habitReminders: true,
  habitReminderTime: "21:00",
  gamingAlerts: true,
  gamingAlertMinutes: 45,
  socialMediaAlerts: true,
  distractionDetection: true,
  dailyReviewPrompt: true,
  dailyReviewTime: "21:30",
  browserNotifications: false,
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Browser Notification API

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
  }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const settings = getNotificationSettings();
  if (!settings.browserNotifications) return;

  try {
    // Try service worker notifications first (works in background)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        options: {
          body: options?.body,
          icon: options?.icon || "/icon-192.svg",
          badge: "/icon-192.svg",
          tag: options?.tag,
          requireInteraction: options?.requireInteraction || false,
        },
      });
    } else {
      // Fallback to direct notification
      new Notification(title, {
        body: options?.body,
        icon: options?.icon || "/icon-192.svg",
        tag: options?.tag,
        requireInteraction: options?.requireInteraction || false,
      });
    }
  } catch {
    // Silent fail
  }
}

// Track which notifications have already triggered browser notifications
// to avoid re-sending on each poll
const sentBrowserNotifications = new Set<string>();

export function shouldSendBrowserNotification(notificationId: string): boolean {
  if (sentBrowserNotifications.has(notificationId)) return false;
  sentBrowserNotifications.add(notificationId);
  // Clean up old entries after 24 hours
  setTimeout(() => sentBrowserNotifications.delete(notificationId), 24 * 60 * 60 * 1000);
  return true;
}

// Register service worker
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // Silent fail
  }
}
