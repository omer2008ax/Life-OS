import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const goalInclude = {
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
    orderBy: { sortOrder: "asc" as const },
  },
  _count: {
    select: { tasks: true, habits: true },
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: goalInclude,
  });

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json(goal);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Handle linking tasks
  if (body.linkTaskId) {
    await prisma.task.update({
      where: { id: body.linkTaskId },
      data: { goalId: id },
    });
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: goalInclude,
    });
    return NextResponse.json(goal);
  }

  // Handle unlinking tasks
  if (body.unlinkTaskId) {
    await prisma.task.update({
      where: { id: body.unlinkTaskId },
      data: { goalId: null },
    });
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: goalInclude,
    });
    return NextResponse.json(goal);
  }

  // Handle linking habits
  if (body.linkHabitId) {
    await prisma.habit.update({
      where: { id: body.linkHabitId },
      data: { goalId: id },
    });
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: goalInclude,
    });
    return NextResponse.json(goal);
  }

  // Handle unlinking habits
  if (body.unlinkHabitId) {
    await prisma.habit.update({
      where: { id: body.unlinkHabitId },
      data: { goalId: null },
    });
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: goalInclude,
    });
    return NextResponse.json(goal);
  }

  // Handle adding milestone
  if (body.addMilestone) {
    const maxOrder = await prisma.milestone.aggregate({
      where: { goalId: id },
      _max: { sortOrder: true },
    });
    await prisma.milestone.create({
      data: {
        goalId: id,
        title: body.addMilestone,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: goalInclude,
    });
    return NextResponse.json(goal);
  }

  // Handle toggling milestone
  if (body.toggleMilestoneId) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: body.toggleMilestoneId },
    });
    if (milestone) {
      await prisma.milestone.update({
        where: { id: body.toggleMilestoneId },
        data: { completed: !milestone.completed },
      });
    }
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: goalInclude,
    });
    return NextResponse.json(goal);
  }

  // Handle deleting milestone
  if (body.deleteMilestoneId) {
    await prisma.milestone.delete({
      where: { id: body.deleteMilestoneId },
    });
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: goalInclude,
    });
    return NextResponse.json(goal);
  }

  // Regular goal update
  const goal = await prisma.goal.update({
    where: { id },
    data: body,
    include: goalInclude,
  });

  return NextResponse.json(goal);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.goal.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
