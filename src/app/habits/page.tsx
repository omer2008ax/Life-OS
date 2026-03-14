"use client";

import { useState, useEffect, useCallback } from "react";
import { useHabits } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddHabitDialog } from "@/components/add-habit-dialog";
import { HabitWithStats } from "@/types";
import { format, subDays } from "date-fns";
import {
  Flame,
  Trophy,
  CheckCircle2,
  Circle,
  Trash2,
  BarChart3,
  ListChecks,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Hash,
} from "lucide-react";

// ---------- Types for stats API ----------
interface HabitStatEntry {
  id: string;
  name: string;
  color: string;
  currentStreak: number;
  longestStreak: number;
  weeklyRate: number;
  monthlyRate: number;
  totalCompletions: number;
}

interface HabitStatsData {
  heatmap: Record<string, number>;
  perHabit: HabitStatEntry[];
  overallWeeklyRate: number;
  bestStreak: { habitName: string; streak: number };
}

// ---------- Hook for stats ----------
function useHabitStats() {
  const [stats, setStats] = useState<HabitStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/habits/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      setStats(await res.json());
    } catch (e) {
      console.error("Failed to fetch habit stats:", e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

// ========== Main Page ==========
export default function HabitsPage() {
  const { t } = useSettings();
  const { habits, loading, createHabit, toggleHabit, deleteHabit } = useHabits();
  const [view, setView] = useState<"habits" | "stats">("habits");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Habits", "\u05d4\u05e8\u05d2\u05dc\u05d9\u05dd")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Build consistency, one day at a time", "\u05d1\u05e0\u05d4 \u05e2\u05e7\u05d1\u05d9\u05d5\u05ea, \u05d9\u05d5\u05dd \u05d0\u05d7\u05d3 \u05d1\u05db\u05dc \u05e4\u05e2\u05dd")}
          </p>
        </div>
        {view === "habits" && <AddHabitDialog onAdd={createHabit} />}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        <button
          onClick={() => setView("habits")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "habits"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListChecks className="h-4 w-4" />
          {t("Habits", "\u05d4\u05e8\u05d2\u05dc\u05d9\u05dd")}
        </button>
        <button
          onClick={() => setView("stats")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "stats"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          {t("Stats", "\u05e1\u05d8\u05d8\u05d9\u05e1\u05d8\u05d9\u05e7\u05d5\u05ea")}
        </button>
      </div>

      {view === "habits" ? (
        <HabitsView
          habits={habits}
          loading={loading}
          onToggle={toggleHabit}
          onDelete={deleteHabit}
        />
      ) : (
        <StatsView />
      )}
    </div>
  );
}

// ========== Habits View (original) ==========
function HabitsView({
  habits,
  loading,
  onToggle,
  onDelete,
}: {
  habits: HabitWithStats[];
  loading: boolean;
  onToggle: (id: string, date?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useSettings();

  return (
    <>
      {!loading && habits.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>{t("No habits yet.", "\u05e2\u05d3\u05d9\u05d9\u05df \u05d0\u05d9\u05df \u05d4\u05e8\u05d2\u05dc\u05d9\u05dd.")}</p>
            <p className="text-sm mt-1">
              {t(
                "Add habits to start tracking your streaks.",
                "\u05d4\u05d5\u05e1\u05e3 \u05d4\u05e8\u05d2\u05dc\u05d9\u05dd \u05db\u05d3\u05d9 \u05dc\u05d4\u05ea\u05d7\u05d9\u05dc \u05dc\u05e2\u05e7\u05d5\u05d1 \u05d0\u05d7\u05e8\u05d9 \u05e8\u05e6\u05e4\u05d9\u05dd."
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  );
}

// ========== Habit Card (original) ==========
function HabitCard({
  habit,
  onToggle,
  onDelete,
}: {
  habit: HabitWithStats;
  onToggle: (id: string, date?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useSettings();
  const today = format(new Date(), "yyyy-MM-dd");
  const completionDates = new Set(habit.completions.map((c) => c.date));

  // Last 7 days for the mini calendar
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, "yyyy-MM-dd"),
      dayLabel: format(date, "EEEEE"), // single letter
      completed: completionDates.has(format(date, "yyyy-MM-dd")),
      isToday: format(date, "yyyy-MM-dd") === today,
    };
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggle(habit.id)}
              className="flex-shrink-0 transition-transform active:scale-90"
            >
              {habit.completedToday ? (
                <CheckCircle2
                  className="h-7 w-7"
                  style={{ color: habit.color }}
                />
              ) : (
                <Circle className="h-7 w-7 text-muted-foreground/40" />
              )}
            </button>
            <div>
              <p className="font-medium">{habit.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3 text-orange-400" />
                  {habit.currentStreak}
                  {t("d streak", " \u05d9\u05de\u05d9\u05dd \u05e8\u05e6\u05e3")}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3 text-yellow-400" />
                  {t("Best:", "\u05e9\u05d9\u05d0:")} {habit.longestStreak}
                  {t("d", " \u05d9\u05de\u05d9\u05dd")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onDelete(habit.id)}
            className="text-muted-foreground/30 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* 7-day mini calendar */}
        <div className="flex gap-1.5 justify-between px-1">
          {last7Days.map((day) => (
            <button
              key={day.date}
              onClick={() => onToggle(habit.id, day.date)}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[10px] text-muted-foreground">
                {day.dayLabel}
              </span>
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                  day.completed
                    ? "text-white"
                    : day.isToday
                    ? "border border-muted-foreground/30 text-muted-foreground"
                    : "bg-muted/30 text-muted-foreground/50"
                }`}
                style={
                  day.completed ? { backgroundColor: habit.color } : undefined
                }
              >
                {format(new Date(day.date + "T12:00:00"), "d")}
              </div>
            </button>
          ))}
        </div>

        {/* Weekly rate bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(habit.weeklyRate / 7) * 100}%`,
                backgroundColor: habit.color,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {habit.weeklyRate}/7 {t("this week", "\u05d4\u05e9\u05d1\u05d5\u05e2")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== Stats View ==========
function StatsView() {
  const { t } = useSettings();
  const { stats, loading } = useHabitStats();

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-12">
        {t("Loading stats...", "\u05d8\u05d5\u05e2\u05df \u05e1\u05d8\u05d8\u05d9\u05e1\u05d8\u05d9\u05e7\u05d5\u05ea...")}
      </div>
    );
  }

  if (!stats || stats.perHabit.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>{t("No habit data yet.", "\u05e2\u05d3\u05d9\u05d9\u05df \u05d0\u05d9\u05df \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d4\u05e8\u05d2\u05dc\u05d9\u05dd.")}</p>
          <p className="text-sm mt-1">
            {t(
              "Complete some habits to see your stats.",
              "\u05d4\u05e9\u05dc\u05dd \u05d4\u05e8\u05d2\u05dc\u05d9\u05dd \u05db\u05d3\u05d9 \u05dc\u05e8\u05d0\u05d5\u05ea \u05e1\u05d8\u05d8\u05d9\u05e1\u05d8\u05d9\u05e7\u05d5\u05ea."
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <OverallSummaryCard stats={stats} />
      <HeatmapCard heatmap={stats.heatmap} />
      <div className="space-y-3">
        {stats.perHabit.map((habit) => (
          <PerHabitStatsCard key={habit.id} habit={habit} />
        ))}
      </div>
    </div>
  );
}

// ========== Overall Summary Card ==========
function OverallSummaryCard({ stats }: { stats: HabitStatsData }) {
  const { t } = useSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {t("Overview", "\u05e1\u05e7\u05d9\u05e8\u05d4 \u05db\u05dc\u05dc\u05d9\u05ea")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Total habits */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Target className="h-3.5 w-3.5" />
            </div>
            <p className="text-2xl font-bold">{stats.perHabit.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("Total Habits", "\u05e1\u05d4\u05f4\u05db \u05d4\u05e8\u05d2\u05dc\u05d9\u05dd")}
            </p>
          </div>

          {/* Weekly completion rate */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <p className="text-2xl font-bold">{stats.overallWeeklyRate}%</p>
            <p className="text-[11px] text-muted-foreground">
              {t("Weekly Rate", "\u05e7\u05e6\u05d1 \u05e9\u05d1\u05d5\u05e2\u05d9")}
            </p>
          </div>

          {/* Best streak */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Award className="h-3.5 w-3.5" />
            </div>
            <p className="text-2xl font-bold">{stats.bestStreak.streak}</p>
            <p className="text-[11px] text-muted-foreground truncate" title={stats.bestStreak.habitName}>
              {t("Best Streak", "\u05e8\u05e6\u05e3 \u05e9\u05d9\u05d0")}
            </p>
            {stats.bestStreak.habitName && (
              <p className="text-[10px] text-muted-foreground/70 truncate">
                {stats.bestStreak.habitName}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== Heatmap Card ==========
function HeatmapCard({ heatmap }: { heatmap: Record<string, number> }) {
  const { t } = useSettings();

  // Build 12 weeks (84 days) grid
  // Columns = weeks, Rows = days of week (Sun=0..Sat=6)
  const today = new Date();
  const days: { date: string; count: number; dayOfWeek: number; weekIndex: number }[] = [];

  // Find the Sunday that starts our 12-week grid
  // We go back 83 days from today and then back to the previous Sunday
  const startDate = subDays(today, 83);
  const startDow = startDate.getDay(); // 0=Sun
  const gridStart = subDays(startDate, startDow); // align to Sunday

  // Build all cells from gridStart to today
  const totalDays = Math.floor(
    (today.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  let weekIdx = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = subDays(today, totalDays - 1 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dow = d.getDay();
    if (i > 0 && dow === 0) weekIdx++;
    days.push({
      date: dateStr,
      count: heatmap[dateStr] || 0,
      dayOfWeek: dow,
      weekIndex: weekIdx,
    });
  }

  const numWeeks = weekIdx + 1;

  // Month labels: find first day of each month appearing in the grid
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = "";
  for (const d of days) {
    const month = d.date.substring(0, 7); // YYYY-MM
    if (month !== lastMonth && d.dayOfWeek === 0) {
      const monthDate = new Date(d.date + "T12:00:00");
      monthLabels.push({
        label: format(monthDate, "MMM"),
        weekIndex: d.weekIndex,
      });
      lastMonth = month;
    }
  }

  const dayLabels = [
    t("S", "\u05d0"),
    t("M", "\u05d1"),
    t("T", "\u05d2"),
    t("W", "\u05d3"),
    t("T", "\u05d4"),
    t("F", "\u05d5"),
    t("S", "\u05e9"),
  ];

  function getCellColor(count: number): string {
    if (count === 0) return "var(--color-muted)";
    if (count === 1) return "rgba(34,197,94,0.3)";
    if (count === 2) return "rgba(34,197,94,0.55)";
    return "rgba(34,197,94,0.85)";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t("Activity", "\u05e4\u05e2\u05d9\u05dc\u05d5\u05ea")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div
            className="grid gap-[2px] mb-1"
            style={{
              gridTemplateColumns: `16px repeat(${numWeeks}, 12px)`,
            }}
          >
            <div /> {/* spacer for day labels */}
            {Array.from({ length: numWeeks }, (_, wi) => {
              const ml = monthLabels.find((m) => m.weekIndex === wi);
              return (
                <div
                  key={wi}
                  className="text-[9px] text-muted-foreground leading-none"
                >
                  {ml?.label || ""}
                </div>
              );
            })}
          </div>

          {/* Grid: day labels + cells */}
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: `16px repeat(${numWeeks}, 12px)`,
              gridTemplateRows: "repeat(7, 12px)",
            }}
          >
            {Array.from({ length: 7 }, (_, dow) => {
              const cells = [];
              // Day label
              cells.push(
                <div
                  key={`label-${dow}`}
                  className="text-[9px] text-muted-foreground flex items-center justify-end pr-0.5"
                  style={{ gridRow: dow + 1, gridColumn: 1 }}
                >
                  {dow % 2 === 1 ? dayLabels[dow] : ""}
                </div>
              );
              // Cells per week
              for (let wi = 0; wi < numWeeks; wi++) {
                const cell = days.find(
                  (d) => d.weekIndex === wi && d.dayOfWeek === dow
                );
                cells.push(
                  <div
                    key={`${dow}-${wi}`}
                    className="rounded-[2px] transition-colors"
                    style={{
                      gridRow: dow + 1,
                      gridColumn: wi + 2,
                      width: 12,
                      height: 12,
                      backgroundColor: cell
                        ? getCellColor(cell.count)
                        : "transparent",
                    }}
                    title={
                      cell
                        ? `${cell.date}: ${cell.count} ${t("completed", "\u05d4\u05d5\u05e9\u05dc\u05de\u05d5")}`
                        : ""
                    }
                  />
                );
              }
              return cells;
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
            <span>{t("Less", "\u05e4\u05d7\u05d5\u05ea")}</span>
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className="rounded-[2px]"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: getCellColor(level),
                }}
              />
            ))}
            <span>{t("More", "\u05d9\u05d5\u05ea\u05e8")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== Per-Habit Stats Card ==========
function PerHabitStatsCard({ habit }: { habit: HabitStatEntry }) {
  const { t } = useSettings();
  const weeklyPct = Math.round((habit.weeklyRate / 7) * 100);
  const monthlyPct = Math.round((habit.monthlyRate / 30) * 100);
  const streakPct =
    habit.longestStreak > 0
      ? Math.round((habit.currentStreak / habit.longestStreak) * 100)
      : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: habit.color }}
          />
          <p className="font-medium">{habit.name}</p>
        </div>

        <div className="space-y-3">
          {/* Streak chart: current vs longest */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-400" />
                {t("Streak", "\u05e8\u05e6\u05e3")}
              </span>
              <span className="text-xs text-muted-foreground">
                {habit.currentStreak} / {habit.longestStreak}{" "}
                {t("days", "\u05d9\u05de\u05d9\u05dd")}
              </span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(streakPct, 100)}%`,
                  backgroundColor: habit.color,
                }}
              />
            </div>
          </div>

          {/* Weekly success rate */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("This Week", "\u05d4\u05e9\u05d1\u05d5\u05e2")}
              </span>
              <span className="text-xs text-muted-foreground">
                {habit.weeklyRate}/7 ({weeklyPct}%)
              </span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${weeklyPct}%`,
                  backgroundColor: habit.color,
                }}
              />
            </div>
          </div>

          {/* Monthly success rate */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {t("Last 30 Days", "30 \u05d9\u05de\u05d9\u05dd \u05d0\u05d7\u05e8\u05d5\u05e0\u05d9\u05dd")}
              </span>
              <span className="text-xs text-muted-foreground">
                {habit.monthlyRate}/30 ({monthlyPct}%)
              </span>
            </div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${monthlyPct}%`,
                  backgroundColor: habit.color,
                }}
              />
            </div>
          </div>

          {/* Total completions */}
          <div className="flex items-center justify-between pt-1 border-t border-muted/20">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {t("Total Completions", "\u05e1\u05d4\u05f4\u05db \u05d4\u05e9\u05dc\u05de\u05d5\u05ea")}
            </span>
            <span className="text-sm font-semibold">{habit.totalCompletions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
