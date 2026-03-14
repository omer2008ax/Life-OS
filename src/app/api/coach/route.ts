import { prisma } from "@/lib/db";
import { chat } from "@/lib/ai-coach";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

// GET — retrieve today's chat history
export async function GET() {
  const today = format(new Date(), "yyyy-MM-dd");

  const messages = await prisma.chatMessage.findMany({
    where: { date: today },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

// POST — send a message to the coach
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message } = body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const reply = await chat(message.trim());

  return NextResponse.json({ reply });
}

// DELETE — clear today's chat
export async function DELETE() {
  const today = format(new Date(), "yyyy-MM-dd");

  await prisma.chatMessage.deleteMany({ where: { date: today } });

  return NextResponse.json({ success: true });
}
