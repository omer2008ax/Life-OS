import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const goals = await prisma.goal.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          date: true,
          category: true,
        },
      },
      habits: {
        select: {
          id: true,
          name: true,
          color: true,
          completions: {
            select: { date: true },
          },
        },
      },
      milestones: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { tasks: true, habits: true },
      },
    },
  });

  return NextResponse.json(goals);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, description, category, targetDate, milestones } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const maxOrder = await prisma.goal.aggregate({
    _max: { sortOrder: true },
  });

  const goal = await prisma.goal.create({
    data: {
      title,
      description: description ?? "",
      category: category ?? "personal",
      targetDate: targetDate || null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      milestones: milestones?.length
        ? {
            create: milestones.map((m: { title: string }, i: number) => ({
              title: m.title,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          date: true,
          category: true,
        },
      },
      habits: {
        select: {
          id: true,
          name: true,
          color: true,
          completions: {
            select: { date: true },
          },
        },
      },
      milestones: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { tasks: true, habits: true },
      },
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
