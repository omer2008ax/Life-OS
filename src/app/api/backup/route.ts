import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/backup — export all data as JSON
export async function GET() {
  try {
    const [tasks, habits, habitCompletions, goals, milestones, activityRules, activityCache, chatMessages, dailyReviews, userSettings] = await Promise.all([
      prisma.task.findMany({ include: { subtasks: true } }),
      prisma.habit.findMany(),
      prisma.habitCompletion.findMany(),
      prisma.goal.findMany({ include: { milestones: true } }),
      prisma.milestone.findMany(),
      prisma.activityRule.findMany(),
      prisma.activityCache.findMany(),
      prisma.chatMessage.findMany(),
      prisma.dailyReview.findMany(),
      prisma.userSettings.findMany(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        tasks,
        habits,
        habitCompletions,
        goals,
        milestones,
        activityRules,
        activityCache,
        chatMessages,
        dailyReviews,
        userSettings,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/backup — import data from JSON
export async function POST(req: Request) {
  try {
    const backup = await req.json();
    const data = backup.data;
    if (!data) {
      return NextResponse.json({ success: false, error: "Invalid backup format" }, { status: 400 });
    }

    // Import in order (respecting foreign keys)
    if (data.goals?.length) {
      for (const goal of data.goals) {
        const { milestones: _, tasks: __, habits: ___, ...goalData } = goal;
        await prisma.goal.upsert({
          where: { id: goalData.id },
          update: goalData,
          create: goalData,
        });
      }
    }

    if (data.tasks?.length) {
      for (const task of data.tasks) {
        const { subtasks: _, ...taskData } = task;
        await prisma.task.upsert({
          where: { id: taskData.id },
          update: taskData,
          create: taskData,
        });
      }
    }

    if (data.habits?.length) {
      for (const habit of data.habits) {
        const { completions: _, ...habitData } = habit;
        await prisma.habit.upsert({
          where: { id: habitData.id },
          update: habitData,
          create: habitData,
        });
      }
    }

    if (data.habitCompletions?.length) {
      for (const hc of data.habitCompletions) {
        await prisma.habitCompletion.upsert({
          where: { id: hc.id },
          update: hc,
          create: hc,
        });
      }
    }

    if (data.milestones?.length) {
      for (const m of data.milestones) {
        await prisma.milestone.upsert({
          where: { id: m.id },
          update: m,
          create: m,
        });
      }
    }

    if (data.activityRules?.length) {
      for (const r of data.activityRules) {
        await prisma.activityRule.upsert({
          where: { id: r.id },
          update: r,
          create: r,
        });
      }
    }

    if (data.dailyReviews?.length) {
      for (const r of data.dailyReviews) {
        await prisma.dailyReview.upsert({
          where: { id: r.id },
          update: r,
          create: r,
        });
      }
    }

    return NextResponse.json({ success: true, message: "Data imported successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
