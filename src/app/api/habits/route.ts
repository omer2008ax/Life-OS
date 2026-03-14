import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const habits = await prisma.habit.findMany({
    include: { completions: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(habits);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, icon, color } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const habit = await prisma.habit.create({
    data: {
      name,
      icon: icon || "target",
      color: color || "#8b5cf6",
    },
    include: { completions: true },
  });

  return NextResponse.json(habit, { status: 201 });
}
