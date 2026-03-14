import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/export?type=tasks|habits|reviews|all&format=csv
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all";

  const sections: string[] = [];

  if (type === "tasks" || type === "all") {
    const tasks = await prisma.task.findMany({ orderBy: { date: "desc" } });
    const header = "Date,Start Time,Title,Duration (min),Category,Priority,Status";
    const rows = tasks.map((t) =>
      [t.date, t.startTime, `"${t.title.replace(/"/g, '""')}"`, t.duration, t.category, t.priority, t.status].join(",")
    );
    sections.push(`--- TASKS ---\n${header}\n${rows.join("\n")}`);
  }

  if (type === "habits" || type === "all") {
    const habits = await prisma.habit.findMany({
      include: { completions: { orderBy: { date: "desc" } } },
    });
    const header = "Habit Name,Color,Date Completed";
    const rows: string[] = [];
    for (const h of habits) {
      if (h.completions.length === 0) {
        rows.push([`"${h.name}"`, h.color, ""].join(","));
      }
      for (const c of h.completions) {
        rows.push([`"${h.name}"`, h.color, c.date].join(","));
      }
    }
    sections.push(`--- HABITS ---\n${header}\n${rows.join("\n")}`);
  }

  if (type === "reviews" || type === "all") {
    const reviews = await prisma.dailyReview.findMany({ orderBy: { date: "desc" } });
    const header = "Date,Mood,Energy,Productivity,Tasks Done,Tasks Total,Habits Done,Habits Total,Screen Min,Wins,Struggles,Tomorrow Focus,Gratitude";
    const rows = reviews.map((r) =>
      [
        r.date, r.mood, r.energyLevel, r.productivityScore,
        r.tasksCompleted, r.tasksTotal, r.habitsCompleted, r.habitsTotal, r.screenMinutes,
        `"${r.wins.replace(/"/g, '""')}"`,
        `"${r.struggles.replace(/"/g, '""')}"`,
        `"${r.tomorrowFocus.replace(/"/g, '""')}"`,
        `"${r.gratitude.replace(/"/g, '""')}"`,
      ].join(",")
    );
    sections.push(`--- DAILY REVIEWS ---\n${header}\n${rows.join("\n")}`);
  }

  const csv = sections.join("\n\n");
  const filename = `lifeos-export-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
