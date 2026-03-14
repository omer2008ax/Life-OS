import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format, addDays } from "date-fns";

interface ParsedTask {
  title: string;
  date: string;
  startTime: string;
  duration: number;
  category: string;
  priority: string;
}

export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const dayAfter = format(addDays(new Date(), 2), "yyyy-MM-dd");

  const systemPrompt = `You are a schedule parser. Extract tasks from the user's natural language input.

IMPORTANT: Today's date is ${today}. Tomorrow is ${tomorrow}. Day after tomorrow is ${dayAfter}.

Return a JSON array of tasks. Each task has:
- title: string (short, descriptive task name)
- date: string (YYYY-MM-DD format)
- startTime: string (HH:mm 24-hour format)
- duration: number (minutes, estimate if not specified. Default: 30 for short tasks, 60 for medium, 90 for long)
- category: string (one of: "fitness", "learning", "business", "personal")
- priority: string (one of: "high", "medium", "low")

Rules:
- If user says "tomorrow" use ${tomorrow}, "today" use ${today}
- If user says day names (Sunday, Monday, etc.) calculate the correct date
- If no time specified, space tasks 1 hour apart starting from 09:00
- If duration not specified, estimate based on task type
- Category: gym/workout/run = fitness, study/read/course = learning, work/meeting/email = business, everything else = personal
- Priority: urgent/important = high, normal = medium, optional/maybe = low
- Parse Hebrew and English equally well
- ONLY return the JSON array, nothing else. No markdown, no explanation.

Examples:
Input: "מחר יש לי פגישה ב10, חדכ ב5 ולמידה ב8"
Output: [{"title":"פגישה","date":"${tomorrow}","startTime":"10:00","duration":60,"category":"business","priority":"medium"},{"title":"חדר כושר","date":"${tomorrow}","startTime":"17:00","duration":60,"category":"fitness","priority":"medium"},{"title":"למידה","date":"${tomorrow}","startTime":"20:00","duration":60,"category":"learning","priority":"medium"}]

Input: "today: gym at 7am, work 9-5, study 8pm"
Output: [{"title":"Gym","date":"${today}","startTime":"07:00","duration":60,"category":"fitness","priority":"medium"},{"title":"Work","date":"${today}","startTime":"09:00","duration":480,"category":"business","priority":"high"},{"title":"Study","date":"${today}","startTime":"20:00","duration":60,"category":"learning","priority":"medium"}]`;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(text);
    const responseText = result.response.text().trim();

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = responseText;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed: ParsedTask[] = JSON.parse(jsonStr);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ tasks: [], message: "No tasks found in input" });
    }

    // Create all tasks in the database
    const created = [];
    for (const task of parsed) {
      const t = await prisma.task.create({
        data: {
          title: task.title,
          date: task.date,
          startTime: task.startTime,
          duration: task.duration,
          category: task.category || "personal",
          priority: task.priority || "medium",
        },
      });
      created.push(t);
    }

    return NextResponse.json({ tasks: created, count: created.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Schedule parse error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
