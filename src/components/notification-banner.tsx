"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, AlertTriangle, Clock, Flame, Gamepad2, Target, BookOpen, Smartphone } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import {
  getNotificationSettings,
  sendBrowserNotification,
  shouldSendBrowserNotification,
  registerServiceWorker,
} from "@/lib/notifications";

interface NotificationAction {
  label: string;
  labelHe: string;
  action: string;
}

interface Notification {
  id: string;
  type: "task_upcoming" | "task_missed" | "habit_reminder" | "gaming_alert" | "distraction" | "daily_review" | "social_media_alert";
  title: string;
  titleHe: string;
  message: string;
  messageHe: string;
  severity: "info" | "warning" | "critical";
  taskId?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
}

const SEVERITY_STYLES = {
  info: "bg-blue-600 border-blue-700 text-white",
  warning: "bg-amber-500 border-amber-600 text-white",
  critical: "bg-red-600 border-red-700 text-white",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task_upcoming: <Clock className="h-4 w-4 flex-shrink-0" />,
  task_missed: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
  habit_reminder: <Flame className="h-4 w-4 flex-shrink-0" />,
  gaming_alert: <Gamepad2 className="h-4 w-4 flex-shrink-0" />,
  distraction: <Target className="h-4 w-4 flex-shrink-0" />,
  daily_review: <BookOpen className="h-4 w-4 flex-shrink-0" />,
  social_media_alert: <Smartphone className="h-4 w-4 flex-shrink-0" />,
};

export function NotificationBanner() {
  const { t, language } = useSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const settings = getNotificationSettings();
      if (!settings.enabled) {
        setNotifications([]);
        return;
      }

      // Build disabled types list from settings
      const disabledTypes: string[] = [];
      if (!settings.taskReminders) disabledTypes.push("task_upcoming");
      if (!settings.missedTaskAlerts) disabledTypes.push("task_missed");
      if (!settings.habitReminders) disabledTypes.push("habit_reminder");
      if (!settings.gamingAlerts) disabledTypes.push("gaming_alert");
      if (!settings.socialMediaAlerts) disabledTypes.push("social_media_alert");
      if (!settings.distractionDetection) disabledTypes.push("distraction");
      if (!settings.dailyReviewPrompt) disabledTypes.push("daily_review");

      const params = new URLSearchParams();
      if (disabledTypes.length > 0) params.set("disabled", disabledTypes.join(","));
      params.set("habitReminderTime", settings.habitReminderTime);
      params.set("dailyReviewTime", settings.dailyReviewTime);
      params.set("gamingAlertMinutes", String(settings.gamingAlertMinutes));

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data: Notification[] = await res.json();
        setNotifications(data);

        // Send browser notifications for new items
        if (settings.browserNotifications) {
          for (const notif of data) {
            if (shouldSendBrowserNotification(notif.id)) {
              sendBrowserNotification(
                language === "he" ? notif.titleHe : notif.title,
                {
                  body: language === "he" ? notif.messageHe : notif.message,
                  tag: notif.id,
                  requireInteraction: notif.severity === "critical",
                }
              );
            }
          }
        }
      }
    } catch {
      // Silent fail
    }
  }, [language]);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  const dismiss = async (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, action: "dismissed" }),
      });
    } catch {
      // Silent fail
    }
  };

  const handleAction = async (notif: Notification, action: NotificationAction) => {
    // Log the action
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationId: notif.id,
          action: "action_taken",
          response: action.action,
        }),
      });
    } catch {
      // Silent fail
    }

    // Handle navigation actions
    if (action.action.startsWith("/")) {
      window.location.href = action.action;
    }

    // Dismiss after action
    setDismissed((prev) => new Set([...prev, notif.id]));
  };

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 p-3 space-y-2 pointer-events-none">
      {visible.map((notif) => (
        <div
          key={notif.id}
          className={`pointer-events-auto mx-auto max-w-lg flex flex-col gap-1.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-lg animate-in slide-in-from-top-2 duration-300 ${SEVERITY_STYLES[notif.severity]}`}
        >
          <div className="flex items-start gap-2.5">
            {TYPE_ICONS[notif.type]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">
                {language === "he" ? notif.titleHe : notif.title}
              </p>
              <p className="text-xs opacity-80 mt-0.5 leading-snug">
                {language === "he" ? notif.messageHe : notif.message}
              </p>
            </div>
            <button
              onClick={() => dismiss(notif.id)}
              className="flex-shrink-0 p-0.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Distraction detection popup with planned vs actual */}
          {notif.type === "distraction" && notif.data && (
            <div className="mt-1 px-1 py-1.5 rounded-lg bg-black/20 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="opacity-70">{t("Planned:", "מתוכנן:")}</span>
                <span className="font-medium">{String(notif.data.plannedTask)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">{t("Actual:", "בפועל:")}</span>
                <span className="font-medium">{String(notif.data.currentApp)}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {notif.actions && notif.actions.length > 0 && (
            <div className="flex gap-2 mt-0.5">
              {notif.actions.map((action) => (
                <button
                  key={action.action}
                  onClick={() => handleAction(notif, action)}
                  className="flex-1 text-[11px] font-medium py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-center"
                >
                  {language === "he" ? action.labelHe : action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Collapse indicator for many notifications */}
      {visible.length > 3 && (
        <div className="pointer-events-auto mx-auto max-w-lg text-center">
          <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {t(
              `${visible.length} notifications`,
              `${visible.length} התראות`
            )}
          </span>
        </div>
      )}
    </div>
  );
}
