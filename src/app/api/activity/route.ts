import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  getWindowBucketId,
  fetchEvents,
  aggregateByApp,
  DEFAULT_RULES,
  CATEGORY_CONFIG,
} from "@/lib/activitywatch";
import { format, subDays } from "date-fns";

// Ensure default rules exist in DB
async function ensureDefaultRules() {
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
}

// GET /api/activity?date=2024-01-15 or ?range=week
export async function GET(request: NextRequest) {
  await ensureDefaultRules();

  const dateParam = request.nextUrl.searchParams.get("date");
  const range = request.nextUrl.searchParams.get("range"); // "day" or "week"

  // Get classification rules from DB
  const rules = await prisma.activityRule.findMany();
  const ruleMap = new Map(rules.map((r) => [r.appName.toLowerCase(), r.category]));

  // Classify an app name
  function classify(appName: string): string {
    // Exact match (case insensitive)
    const exact = ruleMap.get(appName.toLowerCase());
    if (exact) return exact;
    // Partial match
    for (const [ruleName, cat] of ruleMap) {
      if (appName.toLowerCase().includes(ruleName.toLowerCase())) return cat;
    }
    return "uncategorized";
  }

  const bucketId = await getWindowBucketId();

  if (range === "week") {
    // Return 7 days of data
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      const dayData = await getDayData(bucketId, date, classify);
      days.push({ date, ...dayData });
    }
    return NextResponse.json({ days, categories: CATEGORY_CONFIG });
  }

  // Single day
  const date = dateParam || format(new Date(), "yyyy-MM-dd");
  const dayData = await getDayData(bucketId, date, classify);

  return NextResponse.json({ date, ...dayData, categories: CATEGORY_CONFIG });
}

async function getDayData(
  bucketId: string | null,
  date: string,
  classify: (app: string) => string
) {
  if (!bucketId) {
    // ActivityWatch not running — return empty data
    return {
      apps: [],
      byCategory: {},
      totalSeconds: 0,
      awConnected: false,
    };
  }

  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;

  const events = await fetchEvents(bucketId, start, end);
  const apps = aggregateByApp(events);

  // Classify and aggregate by category
  const byCategory: Record<string, number> = {};
  const classifiedApps = apps.map((app) => {
    const category = classify(app.appName);
    byCategory[category] = (byCategory[category] || 0) + app.totalSeconds;
    return { ...app, category };
  });

  const totalSeconds = apps.reduce((sum, a) => sum + a.totalSeconds, 0);

  return {
    apps: classifiedApps,
    byCategory,
    totalSeconds,
    awConnected: true,
  };
}
