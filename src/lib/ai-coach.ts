import { prisma } from "@/lib/db";
import { format } from "date-fns";
import {
  getWindowBucketId,
  fetchEvents,
  aggregateByApp,
  CATEGORY_CONFIG,
} from "@/lib/activitywatch";

const SYSTEM_PROMPT = `You are a discipline coach inside a productivity app called Life OS.
You have access to the user's schedule, habits, and screen time data.
Your job is to help the user stay on track.

IMPORTANT RULES:
1. ALWAYS respond in the SAME LANGUAGE the user writes in. If they write in Hebrew, respond in Hebrew. If in English, respond in English.
2. Keep responses to 2-3 sentences maximum. Be concise and direct.
3. Be supportive but firm. Don't accept excuses easily.
4. When the user lacks motivation, pick ONE of these strategies:
   - Reduce friction: "Just start with 5 minutes"
   - Suggest an alternative: "If you can't do X, try Y"
   - Show reality: Reference their actual screen time or task data
5. Reference their real data (tasks, habits, screen time) when relevant.
6. If the user is doing well, acknowledge briefly and encourage more.
7. Never repeat yourself. Each response should be unique and contextual.
8. Do NOT just repeat "5 minutes" over and over. Vary your approach.`;

// Gather context about the user's current state
async function gatherContext(): Promise<string> {
  const today = format(new Date(), "yyyy-MM-dd");
  const now = format(new Date(), "HH:mm");

  // Tasks
  const tasks = await prisma.task.findMany({
    where: { date: today },
    orderBy: { sortOrder: "asc" },
  });

  const completed = tasks.filter((t) => t.status === "completed");
  const skipped = tasks.filter((t) => t.status === "skipped");
  const pending = tasks.filter((t) => t.status === "pending");
  const currentTask = pending.find((t) => t.startTime <= now);
  const nextTask = pending.find((t) => t.startTime > now);

  // Habits
  const habits = await prisma.habit.findMany({
    include: { completions: { where: { date: today } } },
  });

  const completedHabits = habits.filter((h) => h.completions.length > 0);
  const pendingHabits = habits.filter((h) => h.completions.length === 0);

  // Screen time (try ActivityWatch)
  let screenTimeSummary = "Screen time data unavailable (ActivityWatch not running).";
  try {
    const bucketId = await getWindowBucketId();
    if (bucketId) {
      const events = await fetchEvents(bucketId, `${today}T00:00:00`, `${today}T23:59:59`);
      const apps = aggregateByApp(events);

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

      const byCategory: Record<string, number> = {};
      for (const app of apps) {
        const cat = classify(app.appName);
        byCategory[cat] = (byCategory[cat] || 0) + app.totalSeconds;
      }

      const formatMin = (s: number) => `${Math.round(s / 60)}min`;
      const lines = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, sec]) => {
          const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.uncategorized;
          return `  ${config.label}: ${formatMin(sec)}`;
        });

      screenTimeSummary = `Screen time today:\n${lines.join("\n")}`;
    }
  } catch {
    // AW not available
  }

  // Build context string
  const parts: string[] = [];
  parts.push(`Current time: ${now}`);
  parts.push(`Date: ${today}`);
  parts.push("");

  parts.push(`=== TASKS TODAY ===`);
  parts.push(`Total: ${tasks.length} | Completed: ${completed.length} | Skipped: ${skipped.length} | Pending: ${pending.length}`);
  if (currentTask) {
    parts.push(`Current scheduled task: "${currentTask.title}" (${currentTask.startTime}, ${currentTask.duration}min, ${currentTask.category})`);
  }
  if (nextTask) {
    parts.push(`Next task: "${nextTask.title}" at ${nextTask.startTime}`);
  }
  if (completed.length > 0) {
    parts.push(`Completed: ${completed.map((t) => t.title).join(", ")}`);
  }
  if (skipped.length > 0) {
    parts.push(`Skipped: ${skipped.map((t) => t.title).join(", ")}`);
  }
  parts.push("");

  parts.push(`=== HABITS TODAY ===`);
  if (completedHabits.length > 0) {
    parts.push(`Done: ${completedHabits.map((h) => h.name).join(", ")}`);
  }
  if (pendingHabits.length > 0) {
    parts.push(`Not done yet: ${pendingHabits.map((h) => h.name).join(", ")}`);
  }
  parts.push("");

  parts.push(`=== SCREEN TIME ===`);
  parts.push(screenTimeSummary);

  // Daily review (if exists for today or yesterday)
  try {
    const review = await prisma.dailyReview.findUnique({ where: { date: today } });
    if (review) {
      parts.push("");
      parts.push(`=== TODAY'S REVIEW ===`);
      parts.push(`Mood: ${review.mood}/5 | Energy: ${review.energyLevel}/5 | Self-rated productivity: ${review.productivityScore}/5`);
      if (review.wins) parts.push(`Wins: ${review.wins}`);
      if (review.struggles) parts.push(`Struggles: ${review.struggles}`);
      if (review.tomorrowFocus) parts.push(`Tomorrow focus: ${review.tomorrowFocus}`);
    } else {
      // Check yesterday's review for context
      const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
      const yReview = await prisma.dailyReview.findUnique({ where: { date: yesterday } });
      if (yReview) {
        parts.push("");
        parts.push(`=== YESTERDAY'S REVIEW ===`);
        parts.push(`Mood: ${yReview.mood}/5 | Energy: ${yReview.energyLevel}/5`);
        if (yReview.tomorrowFocus) parts.push(`Yesterday's plan for today: ${yReview.tomorrowFocus}`);
        if (yReview.struggles) parts.push(`Yesterday's struggles: ${yReview.struggles}`);
      }
    }
  } catch { /* no review data */ }

  return parts.join("\n");
}

export async function chat(userMessage: string): Promise<string> {
  const today = format(new Date(), "yyyy-MM-dd");

  // Save user message
  await prisma.chatMessage.create({
    data: { role: "user", content: userMessage, date: today },
  });

  // Get recent chat history (last 20 messages today)
  const recentMessages = await prisma.chatMessage.findMany({
    where: { date: today },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  // Gather live context
  const context = await gatherContext();

  // Build conversation history for Gemini
  const history = recentMessages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" as const : "model" as const,
    parts: [{ text: m.content }],
  }));

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `${SYSTEM_PROMPT}\n\n--- USER'S CURRENT DATA ---\n${context}`,
    });

    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(userMessage);
    const assistantMessage = result.response.text() || "I couldn't generate a response.";

    // Save assistant message
    await prisma.chatMessage.create({
      data: { role: "assistant", content: assistantMessage, date: today },
    });

    return assistantMessage;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Coach error:", errMsg);
    if (errMsg.includes("API_KEY")) {
      return "המאמן לא מוגדר. צריך להגדיר GEMINI_API_KEY.";
    }
    if (errMsg.includes("429") || errMsg.includes("Too Many Requests") || errMsg.includes("quota")) {
      return "⏳ יותר מדי בקשות. נסה שוב בעוד דקה.";
    }
    return "לא ניתן להתחבר למאמן. נסה שוב מאוחר יותר.";
  }
}
