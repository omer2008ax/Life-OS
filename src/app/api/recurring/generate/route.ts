import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { date } = await req.json(); // YYYY-MM-DD
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const d = new Date(date + "T12:00:00");
  const dayOfWeek = d.getDay(); // 0=Sun
  const dayOfMonth = d.getDate();

  const rules = await prisma.recurringTask.findMany({ where: { active: true } });

  // Filter rules that apply to this date
  const applicable = rules.filter((r) => {
    if (r.frequency === "daily") return true;
    if (r.frequency === "weekly") {
      const days = r.daysOfWeek.split(",").map(Number);
      return days.includes(dayOfWeek);
    }
    if (r.frequency === "monthly") {
      return r.dayOfMonth === dayOfMonth;
    }
    return false;
  });

  if (applicable.length === 0) return NextResponse.json([]);

  // Check which tasks already exist for this date (by title match)
  const existingTasks = await prisma.task.findMany({
    where: { date },
    select: { title: true },
  });
  const existingTitles = new Set(existingTasks.map((t) => t.title));

  const created = [];
  for (const rule of applicable) {
    if (existingTitles.has(rule.title)) continue;

    const task = await prisma.task.create({
      data: {
        title: rule.title,
        description: rule.description,
        date,
        startTime: rule.startTime,
        duration: rule.duration,
        category: rule.category,
        priority: rule.priority,
        tags: rule.tags,
      },
    });
    created.push(task);
  }

  return NextResponse.json(created);
}
