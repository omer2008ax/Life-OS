import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (start && end) {
    const tasks = await prisma.task.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { sortOrder: "asc" },
      include: { subtasks: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(tasks);
  }

  if (!date) {
    return NextResponse.json({ error: "date or start/end parameters required" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { date },
    orderBy: { sortOrder: "asc" },
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, date, startTime, duration, category, priority, description, tags, goalId } = body;

  if (!title || !date || !startTime || !duration || !category || !priority) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const maxOrder = await prisma.task.aggregate({
    where: { date },
    _max: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      date,
      startTime,
      duration: Number(duration),
      category,
      priority,
      description: description || "",
      tags: tags || "",
      goalId: goalId || null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(task, { status: 201 });
}
