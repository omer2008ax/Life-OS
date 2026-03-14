import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { date } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  // Check if already completed for this date
  const existing = await prisma.habitCompletion.findUnique({
    where: { habitId_date: { habitId: id, date } },
  });

  if (existing) {
    // Un-complete
    await prisma.habitCompletion.delete({ where: { id: existing.id } });
  } else {
    // Complete
    await prisma.habitCompletion.create({
      data: { habitId: id, date },
    });
  }

  const habit = await prisma.habit.findUnique({
    where: { id },
    include: { completions: true },
  });

  return NextResponse.json(habit);
}
