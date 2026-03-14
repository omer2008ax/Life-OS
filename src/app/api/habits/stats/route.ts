import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { format, subDays, differenceInDays, parseISO, startOfWeek } from "date-fns";

export async function GET() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const cutoffDate = format(subDays(today, 83), "yyyy-MM-dd"); // 84 days including today
  const thirtyDaysAgo = format(subDays(today, 29), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd"); // Sunday

  // Fetch all habits with completions
  const habits = await prisma.habit.findMany({
    include: {
      completions: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Build heatmap: count completions per day over last 84 days
  const completionsInRange = await prisma.habitCompletion.findMany({
    where: {
      date: {
        gte: cutoffDate,
        lte: todayStr,
      },
    },
    select: {
      date: true,
    },
  });

  const heatmap: Record<string, number> = {};
  for (const c of completionsInRange) {
    heatmap[c.date] = (heatmap[c.date] || 0) + 1;
  }

  // Per-habit stats
  const perHabit = habits.map((habit) => {
    const completionDates = new Set(habit.completions.map((c) => c.date));

    // Current streak
    let currentStreak = 0;
    let checkDate = new Date();
    if (completionDates.has(todayStr)) {
      currentStreak = 1;
      checkDate = subDays(checkDate, 1);
    }
    while (completionDates.has(format(checkDate, "yyyy-MM-dd"))) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    }
    if (!completionDates.has(todayStr) && currentStreak === 0) {
      checkDate = subDays(new Date(), 1);
      while (completionDates.has(format(checkDate, "yyyy-MM-dd"))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      }
    }

    // Longest streak
    let longestStreak = 0;
    if (habit.completions.length > 0) {
      const sortedDates = [...completionDates].sort();
      let streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = differenceInDays(parseISO(sortedDates[i]), parseISO(sortedDates[i - 1]));
        if (diff === 1) {
          streak++;
        } else {
          longestStreak = Math.max(longestStreak, streak);
          streak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, streak);
    }

    // Weekly rate (Sun-Sat current week)
    const weeklyRate = habit.completions.filter(
      (c) => c.date >= weekStart && c.date <= todayStr
    ).length;

    // Monthly rate (last 30 days)
    const monthlyRate = habit.completions.filter(
      (c) => c.date >= thirtyDaysAgo && c.date <= todayStr
    ).length;

    return {
      id: habit.id,
      name: habit.name,
      color: habit.color,
      currentStreak,
      longestStreak,
      weeklyRate,
      monthlyRate,
      totalCompletions: habit.completions.length,
    };
  });

  // Overall weekly rate: total completions this week / (habits count * 7) * 100
  const totalWeeklyCompletions = perHabit.reduce((sum, h) => sum + h.weeklyRate, 0);
  const overallWeeklyRate =
    habits.length > 0
      ? Math.round((totalWeeklyCompletions / (habits.length * 7)) * 100)
      : 0;

  // Best streak across all habits
  let bestStreak = { habitName: "", streak: 0 };
  for (const h of perHabit) {
    if (h.longestStreak > bestStreak.streak) {
      bestStreak = { habitName: h.name, streak: h.longestStreak };
    }
  }

  return NextResponse.json({
    heatmap,
    perHabit,
    overallWeeklyRate,
    bestStreak,
  });
}
