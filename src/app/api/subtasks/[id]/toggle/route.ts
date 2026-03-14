import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const subtask = await prisma.subTask.findUnique({ where: { id } });
  if (!subtask) {
    return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  }

  const updated = await prisma.subTask.update({
    where: { id },
    data: { completed: !subtask.completed },
  });

  return NextResponse.json(updated);
}
