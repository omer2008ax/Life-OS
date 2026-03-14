import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rules = await prisma.recurringTask.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const body = await req.json();
  const rule = await prisma.recurringTask.create({ data: body });
  return NextResponse.json(rule);
}
