import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "week";
  const refDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
  const ref = new Date(refDate + "T12:00:00");

  let startDate: Date, endDate: Date, prevStart: Date, prevEnd: Date;

  if (period === "month") {
    startDate = startOfMonth(ref);
    endDate = endOfMonth(ref);
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    prevStart = startOfMonth(prevMonth);
    prevEnd = endOfMonth(prevMonth);
  } else {
    startDate = startOfWeek(ref, { weekStartsOn: 1 });
    endDate = endOfWeek(ref, { weekStartsOn: 1 });
    prevStart = subDays(startDate, 7);
    prevEnd = subDays(endDate, 7);
  }

  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");
  const prevStartStr = format(prevStart, "yyyy-MM-dd");
  const prevEndStr = format(prevEnd, "yyyy-MM-dd");

  // Fetch current period data
  const [tasks, prevTasks, habits, reviews, prevReviews, screenTime] = await Promise.all([
    prisma.task.findMany({ where: { date: { gte: startStr, lte: endStr } } }),
    prisma.task.findMany({ where: { date: { gte: prevStartStr, lte: prevEndStr } } }),
    prisma.habit.findMany({ include: { completions: { where: { date: { gte: startStr, lte: endStr } } } } }),
    prisma.dailyReview.findMany({ where: { date: { gte: startStr, lte: endStr } }, orderBy: { date: "asc" } }),
    prisma.dailyReview.findMany({ where: { date: { gte: prevStartStr, lte: prevEndStr } } }),
    prisma.activityCache.findMany({ where: { date: { gte: startStr, lte: endStr } } }),
  ]);

  // Tasks by day
  const tasksByDay: Record<string, { total: number; completed: number }> = {};
  for (const t of tasks) {
    if (!tasksByDay[t.date]) tasksByDay[t.date] = { total: 0, completed: 0 };
    tasksByDay[t.date].total++;
    if (t.status === "completed") tasksByDay[t.date].completed++;
  }

  const dailyTasks = Object.entries(tasksByDay)
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Task totals
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const skippedTasks = tasks.filter((t) => t.status === "skipped").length;
  const postponedTasks = tasks.filter((t) => t.status === "postponed").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Previous period tasks
  const prevCompleted = prevTasks.filter((t) => t.status === "completed").length;
  const prevTotal = prevTasks.length;
  const prevCompletionRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;

  // Category breakdown (from task durations)
  const categoryTime: Record<string, { minutes: number; count: number }> = {};
  for (const t of tasks) {
    if (!categoryTime[t.category]) categoryTime[t.category] = { minutes: 0, count: 0 };
    categoryTime[t.category].minutes += t.duration;
    categoryTime[t.category].count++;
  }

  // Habits
  const totalHabits = habits.length;
  const habitsByDay: Record<string, { completed: number; total: number }> = {};
  // Build day range
  let d = new Date(startDate);
  while (d <= endDate) {
    const ds = format(d, "yyyy-MM-dd");
    habitsByDay[ds] = { completed: 0, total: totalHabits };
    d = new Date(d.getTime() + 86400000);
  }
  for (const h of habits) {
    for (const c of h.completions) {
      if (habitsByDay[c.date]) habitsByDay[c.date].completed++;
    }
  }
  const dailyHabits = Object.entries(habitsByDay)
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalHabitCompletions = habits.reduce((sum, h) => sum + h.completions.length, 0);
  const totalPossibleHabits = Object.keys(habitsByDay).length * totalHabits;
  const habitRate = totalPossibleHabits > 0 ? Math.round((totalHabitCompletions / totalPossibleHabits) * 100) : 0;

  // Previous habit rate (fetch separately)
  const prevHabitCompletions = await prisma.habitCompletion.count({
    where: { date: { gte: prevStartStr, lte: prevEndStr } },
  });
  const prevDays = Math.round((prevEnd.getTime() - prevStart.getTime()) / 86400000) + 1;
  const prevHabitRate = totalHabits > 0 && prevDays > 0
    ? Math.round((prevHabitCompletions / (prevDays * totalHabits)) * 100) : 0;

  // Mood/energy/productivity from reviews
  const dailyMood = reviews.map((r) => ({
    date: r.date,
    mood: r.mood,
    energy: r.energyLevel,
    productivity: r.productivityScore,
  }));
  const avgMood = reviews.length > 0
    ? +(reviews.reduce((s, r) => s + r.mood, 0) / reviews.length).toFixed(1) : 0;
  const prevAvgMood = prevReviews.length > 0
    ? +(prevReviews.reduce((s, r) => s + r.mood, 0) / prevReviews.length).toFixed(1) : 0;

  // Best day
  const bestDay = dailyTasks.reduce(
    (best, d) => (d.completed > best.completed ? d : best),
    { date: "", completed: 0, total: 0 }
  );

  // Screen time by day
  const screenByDay: Record<string, number> = {};
  for (const s of screenTime) {
    screenByDay[s.date] = (screenByDay[s.date] || 0) + s.duration / 60; // minutes
  }

  // Screen by category
  const screenByCategory: Record<string, number> = {};
  for (const s of screenTime) {
    screenByCategory[s.category] = (screenByCategory[s.category] || 0) + s.duration / 60;
  }

  return NextResponse.json({
    period,
    startDate: startStr,
    endDate: endStr,
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      skipped: skippedTasks,
      postponed: postponedTasks,
      completionRate,
      daily: dailyTasks,
    },
    habits: {
      total: totalHabits,
      completionRate: habitRate,
      daily: dailyHabits,
      perHabit: habits.map((h) => ({
        id: h.id,
        name: h.name,
        color: h.color,
        completions: h.completions.length,
      })),
    },
    categories: Object.entries(categoryTime).map(([name, data]) => ({
      name,
      ...data,
    })),
    mood: { daily: dailyMood, average: avgMood },
    screenTime: {
      daily: Object.entries(screenByDay).map(([date, minutes]) => ({ date, minutes: Math.round(minutes) })),
      byCategory: Object.entries(screenByCategory).map(([category, minutes]) => ({ category, minutes: Math.round(minutes) })),
    },
    bestDay: bestDay.date ? bestDay : null,
    comparison: {
      tasks: { current: completionRate, previous: prevCompletionRate },
      habits: { current: habitRate, previous: prevHabitRate },
      mood: { current: avgMood, previous: prevAvgMood },
    },
  });
}
