import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const task = await prisma.task.update({
    where: { id },
    data: body,
    include: { subtasks: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const deleteSeries = searchParams.get("series") === "true";

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (deleteSeries && task.recurringTaskId) {
    // Delete the recurring rule + all generated tasks
    await prisma.task.deleteMany({ where: { recurringTaskId: task.recurringTaskId } });
    await prisma.recurringTask.delete({ where: { id: task.recurringTaskId } }).catch(() => {});
  } else {
    await prisma.task.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
}
