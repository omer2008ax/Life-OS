import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_RULES } from "@/lib/activitywatch";

// GET all classification rules
export async function GET() {
  // Ensure defaults exist
  const count = await prisma.activityRule.count();
  if (count === 0) {
    for (const rule of DEFAULT_RULES) {
      await prisma.activityRule.upsert({
        where: { appName: rule.appName },
        update: {},
        create: rule,
      });
    }
  }

  const rules = await prisma.activityRule.findMany({
    orderBy: { appName: "asc" },
  });

  return NextResponse.json(rules);
}

// POST — add a new rule
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { appName, category } = body;

  if (!appName || !category) {
    return NextResponse.json({ error: "appName and category are required" }, { status: 400 });
  }

  const rule = await prisma.activityRule.upsert({
    where: { appName },
    update: { category },
    create: { appName, category },
  });

  return NextResponse.json(rule, { status: 201 });
}
