import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import {
  getWindowBucketId,
  fetchEvents,
  aggregateByApp,
} from "@/lib/activitywatch";

export interface Notification {
  id: string;
  type: "task_upcoming" | "task_missed" | "habit_reminder" | "gaming_alert" | "distraction" | "daily_review" | "social_media_alert";
  title: string;
  titleHe: string;
  message: string;
  messageHe: string;
  severity: "info" | "warning" | "critical";
  taskId?: string;
  data?: Record<string, unknown>;
  actions?: { label: string; labelHe: string; action: string }[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Client can pass disabled types as comma-separated list
    const disabledTypesParam = searchParams.get("disabled") || "";
    const disabledTypes = new Set(disabledTypesParam.split(",").filter(Boolean));
    const habitReminderTime = searchParams.get("habitReminderTime") || "21:00";
    const dailyReviewTime = searchParams.get("dailyReviewTime") || "21:30";
    const gamingAlertMinutes = parseInt(searchParams.get("gamingAlertMinutes") || "45", 10);

    const today = format(new Date(), "yyyy-MM-dd");
    const now = format(new Date(), "HH:mm");
    const nowMinutes = timeToMinutes(now);
    const notifications: Notification[] = [];

    // --- 1. TASK NOTIFICATIONS ---
    const tasks = await prisma.task.findMany({
      where: { date: today },
      orderBy: { startTime: "asc" },
    });

    if (!disabledTypes.has("task_upcoming")) {
      for (const task of tasks) {
        if (task.status !== "pending") continue;
        const taskMinutes = timeToMinutes(task.startTime);
        const diff = taskMinutes - nowMinutes;
        if (diff > 0 && diff <= 10) {
          notifications.push({
            id: `upcoming-${task.id}`,
            type: "task_upcoming",
            title: "Coming Up",
            titleHe: "בקרוב",
            message: `"${task.title}" starts in ${diff} minute${diff === 1 ? "" : "s"}`,
            messageHe: `"${task.title}" מתחיל בעוד ${diff} דקות`,
            severity: "info",
            taskId: task.id,
          });
        }
      }
    }

    if (!disabledTypes.has("task_missed")) {
      for (const task of tasks) {
        if (task.status !== "pending") continue;
        const taskMinutes = timeToMinutes(task.startTime);
        const taskEndMinutes = taskMinutes + task.duration;
        if (nowMinutes > taskEndMinutes) {
          notifications.push({
            id: `missed-${task.id}`,
            type: "task_missed",
            title: "Missed Task",
            titleHe: "משימה שפוספסה",
            message: `"${task.title}" was scheduled for ${task.startTime} and wasn't completed`,
            messageHe: `"${task.title}" תוכנן ל-${task.startTime} ולא הושלם`,
            severity: "warning",
            taskId: task.id,
          });
        }
      }
    }

    // --- 2. HABIT REMINDERS ---
    if (!disabledTypes.has("habit_reminder") && nowMinutes >= timeToMinutes(habitReminderTime)) {
      const habits = await prisma.habit.findMany({
        include: { completions: { where: { date: today } } },
      });

      const pendingHabits = habits.filter((h) => h.completions.length === 0);
      if (pendingHabits.length > 0) {
        const names = pendingHabits.map((h) => h.name).join(", ");
        notifications.push({
          id: "habit-reminder",
          type: "habit_reminder",
          title: "Habits Incomplete",
          titleHe: "הרגלים לא הושלמו",
          message: pendingHabits.length === 1
            ? `Don't forget: "${names}"`
            : `${pendingHabits.length} habits left: ${names}`,
          messageHe: pendingHabits.length === 1
            ? `אל תשכח: "${names}"`
            : `נותרו ${pendingHabits.length} הרגלים: ${names}`,
          severity: "warning",
        });
      }
    }

    // --- 3. DAILY REVIEW PROMPT ---
    if (!disabledTypes.has("daily_review") && nowMinutes >= timeToMinutes(dailyReviewTime)) {
      const review = await prisma.dailyReview.findUnique({
        where: { date: today },
      });
      if (!review) {
        notifications.push({
          id: "daily-review",
          type: "daily_review",
          title: "Daily Review",
          titleHe: "סיכום יומי",
          message: "Time to reflect on your day. Write your daily review now.",
          messageHe: "הגיע הזמן לעשות סיכום יומי. כתוב את הסיכום שלך עכשיו.",
          severity: "info",
          actions: [
            { label: "Start Review", labelHe: "התחל סיכום", action: "/review" },
          ],
        });
      }
    }

    // --- 4. SCREEN TIME ALERTS ---
    try {
      const bucketId = await getWindowBucketId();
      if (bucketId) {
        const events = await fetchEvents(bucketId, `${today}T00:00:00`, `${today}T23:59:59`);
        const apps = aggregateByApp(events);

        // Load rules to classify
        const rules = await prisma.activityRule.findMany();
        const ruleMap = new Map(rules.map((r) => [r.appName.toLowerCase(), r.category]));

        function classify(appName: string): string {
          const exact = ruleMap.get(appName.toLowerCase());
          if (exact) return exact;
          for (const [ruleName, cat] of ruleMap) {
            if (appName.toLowerCase().includes(ruleName.toLowerCase())) return cat;
          }
          return "uncategorized";
        }

        // Aggregate by category
        const byCategory: Record<string, number> = {};
        for (const app of apps) {
          const cat = classify(app.appName);
          byCategory[cat] = (byCategory[cat] || 0) + app.totalSeconds;
        }

        // Gaming alert
        if (!disabledTypes.has("gaming_alert")) {
          const gamingSeconds = byCategory["gaming"] || 0;
          const gamingMins = Math.round(gamingSeconds / 60);
          if (gamingMins >= gamingAlertMinutes) {
            notifications.push({
              id: "gaming-alert",
              type: "gaming_alert",
              title: "Gaming Alert",
              titleHe: "התראת משחקים",
              message: `You've spent ${gamingMins} minutes gaming today. Time to refocus?`,
              messageHe: `בילית ${gamingMins} דקות במשחקים היום. זמן להתמקד מחדש?`,
              severity: "critical",
              data: { gamingMinutes: gamingMins },
            });
          }
        }

        // Social media alert (60+ minutes)
        if (!disabledTypes.has("social_media_alert")) {
          const socialMediaSeconds = byCategory["social_media"] || 0;
          const socialMediaMinutes = Math.round(socialMediaSeconds / 60);
          if (socialMediaMinutes >= 60) {
            notifications.push({
              id: "social-media-alert",
              type: "social_media_alert",
              title: "Social Media Alert",
              titleHe: "התראת רשתות חברתיות",
              message: `${socialMediaMinutes} minutes on social media today. That's over an hour.`,
              messageHe: `${socialMediaMinutes} דקות ברשתות חברתיות היום. זה יותר משעה.`,
              severity: "critical",
              data: { socialMediaMinutes },
            });
          }
        }

        // Distraction detection
        if (!disabledTypes.has("distraction")) {
          const currentTask = tasks.find(
            (t) => t.status === "pending" && t.startTime <= now
          );
          if (currentTask) {
            const fifteenAgo = new Date(Date.now() - 15 * 60 * 1000);
            const recentEvents = await fetchEvents(
              bucketId,
              fifteenAgo.toISOString(),
              new Date().toISOString()
            );
            const recentApps = aggregateByApp(recentEvents);

            if (recentApps.length > 0) {
              const topApp = recentApps[0];
              const topCategory = classify(topApp.appName);

              if (["gaming", "social_media"].includes(topCategory)) {
                const recentMinutes = Math.round(topApp.totalSeconds / 60);
                if (recentMinutes >= 5) {
                  notifications.push({
                    id: "distraction-now",
                    type: "distraction",
                    title: "Stay Focused",
                    titleHe: "הישאר ממוקד",
                    message: `You should be doing "${currentTask.title}" but you've been on ${topApp.appName} for ${recentMinutes}min`,
                    messageHe: `אתה אמור לעשות "${currentTask.title}" אבל אתה על ${topApp.appName} כבר ${recentMinutes} דקות`,
                    severity: "critical",
                    taskId: currentTask.id,
                    data: {
                      currentApp: topApp.appName,
                      plannedTask: currentTask.title,
                      plannedTaskId: currentTask.id,
                    },
                    actions: [
                      { label: "Return to task", labelHe: "חזור למשימה", action: "focus" },
                    ],
                  });
                }
              }
            }
          }
        }
      }
    } catch {
      // ActivityWatch not available
    }

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json([]);
  }
}

// POST: log notification dismissal/response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, action, response: userResponse } = body;

    // Log the intervention (we store this in console for now,
    // could be extended to a NotificationLog table later)
    console.log("[Notification Event]", {
      notificationId,
      action, // "dismissed" | "action_taken"
      userResponse, // e.g. "focus" for distraction return-to-task
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification POST error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
