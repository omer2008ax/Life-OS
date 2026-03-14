import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const habit = await prisma.habit.update({
    where: { id },
    data: body,
    include: { completions: true },
  });

  return NextResponse.json(habit);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.habit.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
