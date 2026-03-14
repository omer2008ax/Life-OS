"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AddTaskDialog } from "@/components/add-task-dialog";
import { format } from "date-fns";
import {
  CheckCircle2,
  ListTodo,
  Flame,
  Monitor,
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface DashboardData {
  tasks: { completed: number; total: number; pending: number };
  habits: {
    completed: number;
    total: number;
    habits: { name: string; color: string; completedToday: boolean }[];
  };
  screenMinutes: number;
  review: { mood: number; energy: number; productivity: number } | null;
  weeklyScore: { total: number; taskScore: number; habitScore: number; moodScore: number };
  todayFocus: string;
  inspirationalQuote: string;
  yesterdayHabits: { completed: number; total: number };
  weeklyComparison: {
    todayTasks: number;
    avgTasks: number;
    todayScreen: number;
    avgScreen: number;
  };
  currentTask: {
    id: string;
    title: string;
    startTime: string;
    duration: number;
    category: string;
    priority: string;
  } | null;
  nextTask: {
    id: string;
    title: string;
    startTime: string;
    duration: number;
    category: string;
    priority: string;
  } | null;
}

const categoryColors: Record<string, string> = {
  fitness: "bg-green-500/20 text-green-400 border-green-500/30",
  learning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  business: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  personal: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const categoryLabels: Record<string, [string, string]> = {
  fitness: ["Fitness", "כושר"],
  learning: ["Learning", "למידה"],
  business: ["Business", "עסקים"],
  personal: ["Personal", "אישי"],
};

const categoryBorderColors: Record<string, string> = {
  fitness: "border-l-green-500",
  learning: "border-l-blue-500",
  business: "border-l-purple-500",
  personal: "border-l-orange-500",
};

function getGreeting(t: (en: string, he: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 6) return t("Good night", "\u05DC\u05D9\u05DC\u05D4 \u05D8\u05D5\u05D1");
  if (hour < 12) return t("Good morning", "\u05D1\u05D5\u05E7\u05E8 \u05D8\u05D5\u05D1");
  if (hour < 17) return t("Good afternoon", "\u05E6\u05D4\u05E8\u05D9\u05D9\u05DD \u05D8\u05D5\u05D1\u05D9\u05DD");
  if (hour < 21) return t("Good evening", "\u05E2\u05E8\u05D1 \u05D8\u05D5\u05D1");
  return t("Good night", "\u05DC\u05D9\u05DC\u05D4 \u05D8\u05D5\u05D1");
}

function formatScreenTime(
  minutes: number,
  t: (en: string, he: string) => string
): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${t("m", "\u05D3")}`;
  if (m === 0) return `${h}${t("h", "\u05E9")}`;
  return `${h}${t("h", "\u05E9")} ${m}${t("m", "\u05D3")}`;
}

// --- Weekly Score Ring (pure SVG) ---
function ScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  // Color based on score
  const color =
    score >= 75
      ? "oklch(0.72 0.19 145)" // green
      : score >= 50
        ? "oklch(0.79 0.17 75)" // yellow
        : score >= 25
          ? "oklch(0.75 0.18 50)" // orange
          : "oklch(0.70 0.19 25)"; // red

  return (
    <svg width={size} height={size} className="drop-shadow-lg">
      {/* Background ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      {/* Score ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-1000 ease-out"
      />
      {/* Score text */}
      <text
        x={center}
        y={center - 6}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-3xl font-bold"
        style={{ fontSize: "2rem" }}
      >
        {score}
      </text>
      <text
        x={center}
        y={center + 20}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-muted-foreground text-xs"
        style={{ fontSize: "0.7rem" }}
      >
        / 100
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const { t } = useSettings();
  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      setData(await res.json());
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleTaskComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) fetchDashboard();
    } catch (e) {
      console.error("Failed to complete task:", e);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-32 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded mt-2" />
          </div>
          <div className="h-9 w-9 bg-muted rounded" />
        </div>
        {/* Score skeleton */}
        <div className="h-52 bg-muted rounded-xl" />
        {/* Cards skeleton */}
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
        <div className="h-20 bg-muted rounded-xl" />
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const taskProgress =
    data.tasks.total > 0
      ? Math.round((data.tasks.completed / data.tasks.total) * 100)
      : 0;
  const habitProgress =
    data.habits.total > 0
      ? Math.round((data.habits.completed / data.habits.total) * 100)
      : 0;

  const hasTasks = data.tasks.total > 0;
  const showFocus = data.todayFocus.trim().length > 0;
  const activeTask = data.currentTask || data.nextTask;

  return (
    <div className="space-y-5 pb-6">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Life OS</h1>
          <p className="text-sm text-muted-foreground">
            {getGreeting(t)} &middot; {format(today, "EEE, MMM d")}
          </p>
        </div>
        <AddTaskDialog
          onAdd={async (input) => {
            await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...input, date: dateStr }),
            });
            fetchDashboard();
          }}
          defaultDate={dateStr}
        />
      </div>

      {/* ===== Weekly Score ===== */}
      <Card className="overflow-hidden">
        <CardContent className="pt-5 pb-4 flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("Weekly Score", "\u05E6\u05D9\u05D5\u05DF \u05E9\u05D1\u05D5\u05E2\u05D9")}
          </p>
          <ScoreRing score={data.weeklyScore.total} />
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              {t("Tasks", "\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA")} {data.weeklyScore.taskScore}%
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              {t("Habits", "\u05D4\u05E8\u05D2\u05DC\u05D9\u05DD")} {data.weeklyScore.habitScore}%
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {t("Mood", "\u05DE\u05E6\u05D1 \u05E8\u05D5\u05D7")} {data.weeklyScore.moodScore}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ===== Today's Focus / Quote ===== */}
      {showFocus ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2.5">
              <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-primary uppercase tracking-wider mb-1">
                  {t("Today's Focus", "\u05D4\u05DE\u05D9\u05E7\u05D5\u05D3 \u05E9\u05DC \u05D4\u05D9\u05D5\u05DD")}
                </p>
                <p className="text-sm font-medium leading-snug">{data.todayFocus}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted bg-muted/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm italic text-muted-foreground leading-snug">
                {data.inspirationalQuote}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Today's Progress Row ===== */}
      <div className="grid grid-cols-3 gap-3">
        {/* Tasks */}
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ListTodo className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] text-muted-foreground font-medium">
                {t("Tasks", "\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA")}
              </span>
            </div>
            <p className="text-xl font-bold">
              {data.tasks.completed}
              <span className="text-sm font-normal text-muted-foreground">
                /{data.tasks.total}
              </span>
            </p>
            <Progress value={taskProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {/* Habits */}
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-[11px] text-muted-foreground font-medium">
                {t("Habits", "\u05D4\u05E8\u05D2\u05DC\u05D9\u05DD")}
              </span>
            </div>
            <p className="text-xl font-bold">
              {data.habits.completed}
              <span className="text-sm font-normal text-muted-foreground">
                /{data.habits.total}
              </span>
            </p>
            <Progress value={habitProgress} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {/* Screen Time */}
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Monitor className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] text-muted-foreground font-medium">
                {t("Screen", "\u05DE\u05E1\u05DA")}
              </span>
            </div>
            <p className="text-xl font-bold">
              {formatScreenTime(data.screenMinutes, t)}
            </p>
            <div className="h-1.5 mt-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500/60 transition-all"
                style={{
                  width: `${Math.min((data.screenMinutes / 480) * 100, 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Current / Next Task ===== */}
      {activeTask && (
        <Card
          className={`border-l-4 ${categoryBorderColors[activeTask.category] || "border-l-muted"}`}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {data.currentTask
                  ? t("NOW", "\u05E2\u05DB\u05E9\u05D9\u05D5")
                  : t("NEXT UP", "\u05D4\u05D1\u05D0 \u05D1\u05EA\u05D5\u05E8")}
              </p>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${categoryColors[activeTask.category] || ""}`}
              >
                {categoryLabels[activeTask.category] ? t(categoryLabels[activeTask.category][0], categoryLabels[activeTask.category][1]) : activeTask.category}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{activeTask.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeTask.startTime} &middot; {activeTask.duration}
                  {t("m", "\u05D3")}
                </p>
              </div>
              {data.currentTask && (
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-green-500/20 hover:text-green-400 transition-colors ms-3 shrink-0"
                  onClick={() => handleTaskComplete(activeTask.id)}
                >
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {t("Done", "\u05E1\u05D9\u05D9\u05DD")}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Today vs Average ===== */}
      <div className="grid grid-cols-2 gap-3">
        <ComparisonCard
          label={t("Tasks", "\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA")}
          today={data.weeklyComparison.todayTasks}
          avg={data.weeklyComparison.avgTasks}
          unit=""
          t={t}
        />
        <ComparisonCard
          label={t("Screen", "\u05DE\u05E1\u05DA")}
          today={data.weeklyComparison.todayScreen}
          avg={data.weeklyComparison.avgScreen}
          unit={t("m", "\u05D3")}
          invertTrend
          t={t}
        />
      </div>

      {/* ===== Yesterday's Habits ===== */}
      {data.yesterdayHabits.total > 0 && (
        <Card>
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t("Yesterday", "\u05D0\u05EA\u05DE\u05D5\u05DC")}
                </span>
              </div>
              <span className="text-sm font-medium">
                {data.yesterdayHabits.completed}/{data.yesterdayHabits.total}{" "}
                {t("habits", "\u05D4\u05E8\u05D2\u05DC\u05D9\u05DD")}
                <CheckCircle2 className="h-3 w-3 inline ms-1 text-green-400" />
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Empty State ===== */}
      {!hasTasks && !loading && (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-5 text-center">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium mb-1">
              {t("No tasks yet for today", "\u05D0\u05D9\u05DF \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05DC\u05D4\u05D9\u05D5\u05DD")}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t(
                "Add your first task to start planning your day.",
                "\u05D4\u05D5\u05E1\u05E3 \u05DE\u05E9\u05D9\u05DE\u05D4 \u05E8\u05D0\u05E9\u05D5\u05E0\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05EA\u05DB\u05E0\u05DF \u05D0\u05EA \u05D4\u05D9\u05D5\u05DD."
              )}
            </p>
            {!showFocus && (
              <p className="text-xs italic text-muted-foreground/80 mt-2 px-4">
                &ldquo;{data.inspirationalQuote}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Comparison mini-card ---
function ComparisonCard({
  label,
  today,
  avg,
  unit,
  invertTrend,
  t,
}: {
  label: string;
  today: number;
  avg: number;
  unit: string;
  invertTrend?: boolean;
  t: (en: string, he: string) => string;
}) {
  const diff = avg > 0 ? today - avg : 0;
  const isPositive = invertTrend ? diff < 0 : diff > 0;
  const isNegative = invertTrend ? diff > 0 : diff < 0;

  return (
    <Card>
      <CardContent className="pt-3 pb-3 px-3">
        <p className="text-[11px] text-muted-foreground font-medium mb-1">{label}</p>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-lg font-bold">
              {today}
              {unit}
            </span>
            <span className="text-[11px] text-muted-foreground ms-1">
              {t("vs", "\u05DC\u05E2\u05D5\u05DE\u05EA")} {avg}
              {unit} {t("avg", "\u05DE\u05DE\u05D5\u05E6\u05E2")}
            </span>
          </div>
          {diff !== 0 && (
            <span className={isPositive ? "text-green-400" : isNegative ? "text-red-400" : ""}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : isNegative ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
