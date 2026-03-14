import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import {
  getWindowBucketId,
  fetchEvents,
  aggregateByApp,
} from "@/lib/activitywatch";

// GET /api/review?date=YYYY-MM-DD — get review for a date (or today)
// GET /api/review?history=true — get last 30 reviews
// GET /api/review?trends=true — get last 30 days of trend data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const history = searchParams.get("history");
  const trends = searchParams.get("trends");

  if (trends === "true") {
    const reviews = await prisma.dailyReview.findMany({
      orderBy: { date: "desc" },
      take: 30,
      select: {
        date: true,
        mood: true,
        energyLevel: true,
        productivityScore: true,
        tasksCompleted: true,
        tasksTotal: true,
        habitsCompleted: true,
        habitsTotal: true,
        screenMinutes: true,
      },
    });
    return NextResponse.json({ trends: reviews.reverse() });
  }

  if (history === "true") {
    const reviews = await prisma.dailyReview.findMany({
      orderBy: { date: "desc" },
      take: 30,
    });
    return NextResponse.json(reviews);
  }

  const date = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
  const review = await prisma.dailyReview.findUnique({ where: { date } });

  // Also return today's auto-stats for the form
  const stats = await gatherDayStats(date);

  return NextResponse.json({ review, stats });
}

// POST /api/review — save or update a daily review
export async function POST(req: NextRequest) {
  const body = await req.json();
  const date = body.date || format(new Date(), "yyyy-MM-dd");

  // Auto-collect stats
  const stats = await gatherDayStats(date);

  const data = {
    mood: body.mood,
    energyLevel: body.energyLevel,
    productivityScore: body.productivityScore,
    wins: body.wins || "",
    struggles: body.struggles || "",
    tomorrowFocus: body.tomorrowFocus || "",
    gratitude: body.gratitude || "",
    notes: body.notes || "",
    tasksCompleted: stats.tasksCompleted,
    tasksTotal: stats.tasksTotal,
    habitsCompleted: stats.habitsCompleted,
    habitsTotal: stats.habitsTotal,
    screenMinutes: stats.screenMinutes,
  };

  const review = await prisma.dailyReview.upsert({
    where: { date },
    create: { date, ...data },
    update: data,
  });

  return NextResponse.json(review);
}

async function gatherDayStats(date: string) {
  // Tasks
  const tasks = await prisma.task.findMany({ where: { date } });
  const tasksCompleted = tasks.filter((t) => t.status === "completed").length;
  const tasksTotal = tasks.length;

  // Habits
  const habits = await prisma.habit.findMany({
    include: { completions: { where: { date } } },
  });
  const habitsCompleted = habits.filter((h) => h.completions.length > 0).length;
  const habitsTotal = habits.length;

  // Screen time
  let screenMinutes = 0;
  try {
    const bucketId = await getWindowBucketId();
    if (bucketId) {
      const events = await fetchEvents(bucketId, `${date}T00:00:00`, `${date}T23:59:59`);
      const apps = aggregateByApp(events);
      const totalSeconds = apps.reduce((sum, a) => sum + a.totalSeconds, 0);
      screenMinutes = Math.round(totalSeconds / 60);
    }
  } catch {
    // AW not available
  }

  return { tasksCompleted, tasksTotal, habitsCompleted, habitsTotal, screenMinutes };
}
