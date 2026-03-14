import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format, subDays } from "date-fns";

const QUOTES = [
  "The secret of getting ahead is getting started. - Mark Twain",
  "It does not matter how slowly you go as long as you do not stop. - Confucius",
  "Success is the sum of small efforts repeated day in and day out. - Robert Collier",
  "You don't have to be great to start, but you have to start to be great. - Zig Ziglar",
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Discipline is the bridge between goals and accomplishment. - Jim Rohn",
  "Small daily improvements over time lead to stunning results. - Robin Sharma",
  "Your future is created by what you do today, not tomorrow. - Robert Kiyosaki",
  "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
  "Motivation is what gets you started. Habit is what keeps you going. - Jim Ryun",
  "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
  "A year from now you will wish you had started today. - Karen Lamb",
  "Focus on being productive instead of busy. - Tim Ferriss",
  "What you do every day matters more than what you do once in a while. - Gretchen Rubin",
  "Progress, not perfection, is what we should be asking of ourselves. - Julia Cameron",
  "Action is the foundational key to all success. - Pablo Picasso",
  "Start where you are. Use what you have. Do what you can. - Arthur Ashe",
  "Dream big. Start small. Act now. - Robin Sharma",
  "One day or day one. You decide. - Paulo Coelho",
  "Be stronger than your excuses. - Unknown",
];

export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  // Gather all data in parallel
  const [
    todayTasks,
    todayHabits,
    todayReviewData,
    yesterdayReview,
    last7Reviews,
    yesterdayHabitsData,
    activityCache,
    last7DaysCache,
  ] = await Promise.all([
    // Today's tasks
    prisma.task.findMany({ where: { date: today } }),
    // Today's habits with completions
    prisma.habit.findMany({
      include: { completions: { where: { date: today } } },
    }),
    // Today's review
    prisma.dailyReview.findUnique({ where: { date: today } }),
    // Yesterday's review (for tomorrowFocus)
    prisma.dailyReview.findUnique({ where: { date: yesterday } }),
    // Last 7 reviews for weekly score
    prisma.dailyReview.findMany({
      orderBy: { date: "desc" },
      take: 7,
    }),
    // Yesterday's habits
    prisma.habit.findMany({
      include: { completions: { where: { date: yesterday } } },
    }),
    // Today's screen time from cache
    prisma.activityCache.findMany({ where: { date: today } }),
    // Last 7 days screen time from cache
    prisma.activityCache.findMany({
      where: {
        date: {
          gte: format(subDays(new Date(), 6), "yyyy-MM-dd"),
          lte: today,
        },
      },
    }),
  ]);

  // Tasks summary
  const tasksCompleted = todayTasks.filter((t) => t.status === "completed").length;
  const tasksTotal = todayTasks.length;
  const tasksPending = todayTasks.filter((t) => t.status === "pending").length;

  // Habits summary
  const habitsCompleted = todayHabits.filter((h) => h.completions.length > 0).length;
  const habitsTotal = todayHabits.length;
  const habits = todayHabits.map((h) => ({
    name: h.name,
    color: h.color,
    completedToday: h.completions.length > 0,
  }));

  // Screen time from cache (sum all durations for today)
  const screenSeconds = activityCache.reduce((sum, e) => sum + e.duration, 0);
  const screenMinutes = Math.round(screenSeconds / 60);

  // Review
  const review = todayReviewData
    ? {
        mood: todayReviewData.mood,
        energy: todayReviewData.energyLevel,
        productivity: todayReviewData.productivityScore,
      }
    : null;

  // Today's focus from yesterday's review
  const todayFocus = yesterdayReview?.tomorrowFocus || "";

  // Weekly score calculation
  let weeklyScore = 0;
  let taskScore = 0;
  let habitScore = 0;
  let moodScore = 0;

  if (last7Reviews.length > 0) {
    const reviewsWithTasks = last7Reviews.filter((r) => r.tasksTotal > 0);
    const reviewsWithHabits = last7Reviews.filter((r) => r.habitsTotal > 0);
    const reviewsWithMood = last7Reviews.filter((r) => r.mood > 0);

    if (reviewsWithTasks.length > 0) {
      taskScore = Math.round(
        (reviewsWithTasks.reduce((sum, r) => sum + r.tasksCompleted / r.tasksTotal, 0) /
          reviewsWithTasks.length) *
          100
      );
    }

    if (reviewsWithHabits.length > 0) {
      habitScore = Math.round(
        (reviewsWithHabits.reduce((sum, r) => sum + r.habitsCompleted / r.habitsTotal, 0) /
          reviewsWithHabits.length) *
          100
      );
    }

    if (reviewsWithMood.length > 0) {
      moodScore = Math.round(
        (reviewsWithMood.reduce((sum, r) => sum + r.mood, 0) / reviewsWithMood.length / 5) * 100
      );
    }

    const parts = [
      reviewsWithTasks.length > 0 ? taskScore : null,
      reviewsWithHabits.length > 0 ? habitScore : null,
      reviewsWithMood.length > 0 ? moodScore : null,
    ].filter((v): v is number => v !== null);

    weeklyScore = parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
  }

  // Yesterday's habits
  const yesterdayHabitsCompleted = yesterdayHabitsData.filter(
    (h) => h.completions.length > 0
  ).length;
  const yesterdayHabitsTotal = yesterdayHabitsData.length;

  // Weekly comparison: today vs 7-day average
  // Tasks average from last 7 reviews
  const avgTasks =
    last7Reviews.length > 0
      ? Math.round(last7Reviews.reduce((sum, r) => sum + r.tasksCompleted, 0) / last7Reviews.length)
      : 0;

  // Screen time average from last 7 days cache
  const screenByDay = new Map<string, number>();
  for (const entry of last7DaysCache) {
    screenByDay.set(entry.date, (screenByDay.get(entry.date) || 0) + entry.duration);
  }
  const dayScreenValues = [...screenByDay.values()];
  const avgScreenMinutes =
    dayScreenValues.length > 0
      ? Math.round(dayScreenValues.reduce((a, b) => a + b, 0) / dayScreenValues.length / 60)
      : 0;

  // Inspirational quote (deterministic per day so it stays stable)
  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const quote = QUOTES[dayOfYear % QUOTES.length];

  // Current/next task
  const now = format(new Date(), "HH:mm");
  const pendingTasks = todayTasks
    .filter((t) => t.status === "pending")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const currentTask = pendingTasks.find((t) => t.startTime <= now) || null;
  const nextTask = pendingTasks.find((t) => t.startTime > now) || null;

  return NextResponse.json({
    tasks: { completed: tasksCompleted, total: tasksTotal, pending: tasksPending },
    habits: { completed: habitsCompleted, total: habitsTotal, habits },
    screenMinutes,
    review,
    weeklyScore: {
      total: weeklyScore,
      taskScore,
      habitScore,
      moodScore,
    },
    todayFocus,
    inspirationalQuote: quote,
    yesterdayHabits: { completed: yesterdayHabitsCompleted, total: yesterdayHabitsTotal },
    weeklyComparison: {
      todayTasks: tasksCompleted,
      avgTasks,
      todayScreen: screenMinutes,
      avgScreen: avgScreenMinutes,
    },
    currentTask: currentTask
      ? {
          id: currentTask.id,
          title: currentTask.title,
          startTime: currentTask.startTime,
          duration: currentTask.duration,
          category: currentTask.category,
          priority: currentTask.priority,
        }
      : null,
    nextTask: nextTask
      ? {
          id: nextTask.id,
          title: nextTask.title,
          startTime: nextTask.startTime,
          duration: nextTask.duration,
          category: nextTask.category,
          priority: nextTask.priority,
        }
      : null,
  });
}
