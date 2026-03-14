"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Smile,
  Flame,
} from "lucide-react";
import {
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface AnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  tasks: {
    total: number;
    completed: number;
    skipped: number;
    postponed: number;
    completionRate: number;
    daily: { date: string; total: number; completed: number }[];
  };
  habits: {
    total: number;
    completionRate: number;
    daily: { date: string; completed: number; total: number }[];
    perHabit: { id: string; name: string; color: string; completions: number }[];
  };
  categories: { name: string; minutes: number; count: number }[];
  mood: {
    daily: { date: string; mood: number; energy: number; productivity: number }[];
    average: number;
  };
  screenTime: {
    daily: { date: string; minutes: number }[];
    byCategory: { category: string; minutes: number }[];
  };
  bestDay: { date: string; completed: number; total: number } | null;
  comparison: {
    tasks: { current: number; previous: number };
    habits: { current: number; previous: number };
    mood: { current: number; previous: number };
  };
}

export default function AnalyticsPage() {
  const { t } = useSettings();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [refDate, setRefDate] = useState(new Date());
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics?period=${period}&date=${format(refDate, "yyyy-MM-dd")}`
      );
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period, refDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigate = (dir: -1 | 1) => {
    setRefDate((d) =>
      period === "week"
        ? dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)
        : dir === 1 ? addMonths(d, 1) : subMonths(d, 1)
    );
  };

  const dateRange =
    period === "week"
      ? `${format(startOfWeek(refDate, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(refDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`
      : format(startOfMonth(refDate), "MMMM yyyy");

  const categoryColors: Record<string, string> = {
    fitness: "#22c55e",
    learning: "#3b82f6",
    business: "#a855f7",
    personal: "#f97316",
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("Analytics", "אנליטיקה")}</h1>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {p === "week" ? t("Week", "שבוע") : t("Month", "חודש")}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setRefDate(new Date())}
          className="text-sm font-medium hover:text-primary transition-colors"
        >
          {dateRange}
        </button>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Comparison Banner */}
          <div className="grid grid-cols-3 gap-2">
            <ComparisonCard
              label={t("Tasks", "משימות")}
              current={data.comparison.tasks.current}
              previous={data.comparison.tasks.previous}
              suffix="%"
            />
            <ComparisonCard
              label={t("Habits", "הרגלים")}
              current={data.comparison.habits.current}
              previous={data.comparison.habits.previous}
              suffix="%"
            />
            <ComparisonCard
              label={t("Mood", "מצב רוח")}
              current={data.comparison.mood.current}
              previous={data.comparison.mood.previous}
              suffix=""
              max={5}
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Target className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.tasks.completed}/{data.tasks.total}</p>
                  <p className="text-[10px] text-muted-foreground">{t("Tasks Done", "משימות שהושלמו")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.habits.completionRate}%</p>
                  <p className="text-[10px] text-muted-foreground">{t("Habit Rate", "אחוז הרגלים")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Smile className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.mood.average || "-"}/5</p>
                  <p className="text-[10px] text-muted-foreground">{t("Avg Mood", "מצב רוח ממוצע")}</p>
                </div>
              </CardContent>
            </Card>
            {data.bestDay && (
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{data.bestDay.completed}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("Best Day", "היום הכי טוב")} ({format(new Date(data.bestDay.date + "T12:00:00"), "EEE")})
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Task Completion Chart */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">{t("Task Completion", "השלמת משימות")}</h3>
              {data.tasks.daily.length > 0 ? (
                <BarChart
                  data={data.tasks.daily.map((d) => ({
                    label: format(new Date(d.date + "T12:00:00"), "EEE"),
                    value: d.completed,
                    max: d.total,
                  }))}
                  color="#22c55e"
                  bgColor="#22c55e20"
                />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">{t("No data", "אין נתונים")}</p>
              )}
            </CardContent>
          </Card>

          {/* Habit Consistency Chart */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">{t("Habit Consistency", "עקביות הרגלים")}</h3>
              {data.habits.daily.length > 0 ? (
                <BarChart
                  data={data.habits.daily.map((d) => ({
                    label: format(new Date(d.date + "T12:00:00"), "EEE"),
                    value: d.completed,
                    max: d.total,
                  }))}
                  color="#f97316"
                  bgColor="#f9731620"
                />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">{t("No data", "אין נתונים")}</p>
              )}
            </CardContent>
          </Card>

          {/* Mood & Energy */}
          {data.mood.daily.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">{t("Mood & Energy", "מצב רוח ואנרגיה")}</h3>
                <LineChart data={data.mood.daily} />
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          {data.categories.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">{t("Categories", "קטגוריות")}</h3>
                <div className="space-y-2">
                  {data.categories
                    .sort((a, b) => b.minutes - a.minutes)
                    .map((c) => {
                      const maxMin = Math.max(...data.categories.map((x) => x.minutes));
                      const pct = maxMin > 0 ? (c.minutes / maxMin) * 100 : 0;
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="capitalize">{c.name}</span>
                            <span className="text-muted-foreground">
                              {Math.round(c.minutes / 60)}h {c.minutes % 60}m · {c.count} {t("tasks", "משימות")}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: categoryColors[c.name] || "#6b7280",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-habit breakdown */}
          {data.habits.perHabit.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">{t("Per Habit", "לפי הרגל")}</h3>
                <div className="space-y-2">
                  {data.habits.perHabit
                    .sort((a, b) => b.completions - a.completions)
                    .map((h) => {
                      const maxDays = period === "week" ? 7 : 30;
                      const pct = Math.min((h.completions / maxDays) * 100, 100);
                      return (
                        <div key={h.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{h.name}</span>
                            <span className="text-muted-foreground">
                              {h.completions}/{maxDays} {t("days", "ימים")}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: h.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

// ─── Bar Chart (SVG) ───
function BarChart({
  data,
  color,
  bgColor,
}: {
  data: { label: string; value: number; max: number }[];
  color: string;
  bgColor: string;
}) {
  const maxVal = Math.max(...data.map((d) => d.max), 1);
  const barWidth = Math.min(32, 200 / data.length);
  const gap = 4;
  const w = data.length * (barWidth + gap);
  const h = 100;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full" style={{ minWidth: w }}>
        {data.map((d, i) => {
          const x = i * (barWidth + gap);
          const maxH = (d.max / maxVal) * h;
          const valH = (d.value / maxVal) * h;
          return (
            <g key={i}>
              <rect x={x} y={h - maxH} width={barWidth} height={maxH} rx={3} fill={bgColor} />
              <rect x={x} y={h - valH} width={barWidth} height={valH} rx={3} fill={color} />
              <text
                x={x + barWidth / 2}
                y={h + 14}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {d.label}
              </text>
              {d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={h - valH - 3}
                  textAnchor="middle"
                  className="fill-foreground"
                  fontSize={8}
                  fontWeight="bold"
                >
                  {d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Line Chart (SVG) ───
function LineChart({
  data,
}: {
  data: { date: string; mood: number; energy: number; productivity: number }[];
}) {
  const { t } = useSettings();
  const h = 100;
  const padding = 20;
  const w = Math.max(data.length * 40, 200);

  const line = (values: number[], max: number) => {
    return values
      .map((v, i) => {
        const x = padding + (i / Math.max(values.length - 1, 1)) * (w - 2 * padding);
        const y = h - (v / max) * (h - padding);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const moods = data.map((d) => d.mood);
  const energies = data.map((d) => d.energy);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full" style={{ minWidth: w }}>
        {/* Grid */}
        {[1, 2, 3, 4, 5].map((v) => (
          <line
            key={v}
            x1={padding}
            y1={h - (v / 5) * (h - padding)}
            x2={w - padding}
            y2={h - (v / 5) * (h - padding)}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}
        {/* Mood line */}
        <path d={line(moods, 5)} fill="none" stroke="#3b82f6" strokeWidth={2} />
        {moods.map((v, i) => (
          <circle
            key={`m${i}`}
            cx={padding + (i / Math.max(moods.length - 1, 1)) * (w - 2 * padding)}
            cy={h - (v / 5) * (h - padding)}
            r={3}
            fill="#3b82f6"
          />
        ))}
        {/* Energy line */}
        <path d={line(energies, 5)} fill="none" stroke="#f97316" strokeWidth={2} />
        {energies.map((v, i) => (
          <circle
            key={`e${i}`}
            cx={padding + (i / Math.max(energies.length - 1, 1)) * (w - 2 * padding)}
            cy={h - (v / 5) * (h - padding)}
            r={3}
            fill="#f97316"
          />
        ))}
        {/* Labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={padding + (i / Math.max(data.length - 1, 1)) * (w - 2 * padding)}
            y={h + 14}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {format(new Date(d.date + "T12:00:00"), "EEE")}
          </text>
        ))}
      </svg>
      <div className="flex gap-4 justify-center mt-1">
        <span className="flex items-center gap-1 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {t("Mood", "מצב רוח")}
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> {t("Energy", "אנרגיה")}
        </span>
      </div>
    </div>
  );
}

// ─── Comparison Card ───
function ComparisonCard({
  label,
  current,
  previous,
  suffix,
  max,
}: {
  label: string;
  current: number;
  previous: number;
  suffix: string;
  max?: number;
}) {
  const diff = current - previous;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">
          {current}{suffix}{max ? `/${max}` : ""}
        </p>
        <div
          className={`flex items-center justify-center gap-0.5 text-[10px] ${
            isUp ? "text-green-500" : isDown ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : null}
          {diff !== 0 ? `${diff > 0 ? "+" : ""}${diff}${suffix}` : "—"}
        </div>
      </CardContent>
    </Card>
  );
}
