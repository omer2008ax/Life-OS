"use client";

import { useState, useMemo } from "react";
import { useActivity, useActivityRules, ActivityWeek, ActivityDay } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_CONFIG } from "@/lib/activitywatch";
import { format } from "date-fns";
import {
  Monitor,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Target,
  Zap,
} from "lucide-react";

function formatDuration(seconds: number, t?: (en: string, he: string) => string): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const hLabel = t ? t("h", "ש") : "h";
  const mLabel = t ? t("m", "ד") : "m";
  if (h > 0) return `${h}${hLabel} ${m}${mLabel}`;
  return `${m}${mLabel}`;
}

function getCategoryLabel(key: string, t: (en: string, he: string) => string): string {
  const labels: Record<string, [string, string]> = {
    productive: ["Productive", "פרודוקטיבי"],
    learning: ["Learning", "למידה"],
    gaming: ["Gaming", "משחקים"],
    social_media: ["Social Media", "רשתות חברתיות"],
    social: ["Social", "חברתי"],
    neutral: ["Neutral", "ניטרלי"],
    uncategorized: ["Other", "אחר"],
  };
  const pair = labels[key];
  if (pair) return t(pair[0], pair[1]);
  const config = CATEGORY_CONFIG[key];
  return config?.label || key;
}

const SCREEN_TIME_GOALS_KEY = "lifeos-screen-time-goals";

interface ScreenTimeGoals {
  productiveMinutes: number;
  entertainmentMaxMinutes: number;
}

function getScreenTimeGoals(): ScreenTimeGoals {
  if (typeof window === "undefined") {
    return { productiveMinutes: 480, entertainmentMaxMinutes: 120 };
  }
  try {
    const saved = localStorage.getItem(SCREEN_TIME_GOALS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { productiveMinutes: 480, entertainmentMaxMinutes: 120 };
}

function saveScreenTimeGoals(goals: ScreenTimeGoals) {
  localStorage.setItem(SCREEN_TIME_GOALS_KEY, JSON.stringify(goals));
}

// Entertainment categories
const ENTERTAINMENT_CATEGORIES = new Set(["gaming", "social_media"]);
// Productive categories
const PRODUCTIVE_CATEGORIES = new Set(["productive", "learning"]);

export default function RealityPage() {
  const { t } = useSettings();
  const [view, setView] = useState<"day" | "week">("day");
  const { data, loading, refetch: refetchActivity } = useActivity(view);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Reality", "מציאות")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("How you actually spend your time", "איך אתה באמת מבלה את הזמן")}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={view === "day" ? "default" : "outline"}
            onClick={() => setView("day")}
          >
            {t("Today", "היום")}
          </Button>
          <Button
            size="sm"
            variant={view === "week" ? "default" : "outline"}
            onClick={() => setView("week")}
          >
            {t("Week", "שבוע")}
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {t("Loading activity data...", "טוען נתוני פעילות...")}
          </CardContent>
        </Card>
      )}

      {!loading && view === "day" && data && <DayView data={data as ActivityDay} />}
      {!loading && view === "week" && data && <WeekView data={data as ActivityWeek} />}

      {!loading && view === "day" && data && (data as ActivityDay).awConnected && (
        <ScreenTimeGoalCard data={data as ActivityDay} />
      )}

      {!loading && view === "day" && data && (data as ActivityDay).awConnected && (
        <UnclassifiedAppsSection data={data as ActivityDay} onClassified={refetchActivity} />
      )}

      <RulesSection />
    </div>
  );
}

/* ──────────────────────────────────────
   Screen Time Goal Card with Ring
   ────────────────────────────────────── */

function ScreenTimeGoalRing({
  value,
  max,
  size = 100,
  strokeWidth = 8,
  color,
  bgColor = "rgba(255,255,255,0.08)",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ScreenTimeGoalCard({ data }: { data: ActivityDay }) {
  const { t } = useSettings();
  const [goals, setGoals] = useState<ScreenTimeGoals>(getScreenTimeGoals);
  const [editing, setEditing] = useState(false);
  const [editProd, setEditProd] = useState(String(goals.productiveMinutes / 60));
  const [editEnt, setEditEnt] = useState(String(goals.entertainmentMaxMinutes / 60));

  const productiveSeconds = useMemo(() => {
    let total = 0;
    for (const [cat, secs] of Object.entries(data.byCategory)) {
      if (PRODUCTIVE_CATEGORIES.has(cat)) total += secs;
    }
    return total;
  }, [data.byCategory]);

  const entertainmentSeconds = useMemo(() => {
    let total = 0;
    for (const [cat, secs] of Object.entries(data.byCategory)) {
      if (ENTERTAINMENT_CATEGORIES.has(cat)) total += secs;
    }
    return total;
  }, [data.byCategory]);

  const productiveGoalSecs = goals.productiveMinutes * 60;
  const entertainmentGoalSecs = goals.entertainmentMaxMinutes * 60;
  const entertainmentExceeded = entertainmentSeconds > entertainmentGoalSecs;

  const handleSaveGoals = () => {
    const prodH = parseFloat(editProd) || 8;
    const entH = parseFloat(editEnt) || 2;
    const newGoals: ScreenTimeGoals = {
      productiveMinutes: Math.round(prodH * 60),
      entertainmentMaxMinutes: Math.round(entH * 60),
    };
    setGoals(newGoals);
    saveScreenTimeGoals(newGoals);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t("Screen Time Goals", "יעדי זמן מסך")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => {
              if (editing) {
                handleSaveGoals();
              } else {
                setEditProd(String(goals.productiveMinutes / 60));
                setEditEnt(String(goals.entertainmentMaxMinutes / 60));
                setEditing(true);
              }
            }}
          >
            {editing ? (
              <><Check className="h-3 w-3 mr-1" /> {t("Save", "שמור")}</>
            ) : (
              <><Pencil className="h-3 w-3 mr-1" /> {t("Edit", "ערוך")}</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm w-40">{t("Productive goal (hours)", "יעד פרודוקטיבי (שעות)")}</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={editProd}
                onChange={(e) => setEditProd(e.target.value)}
                className="w-20 h-8"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm w-40">{t("Entertainment max (hours)", "מקסימום בידור (שעות)")}</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={editEnt}
                onChange={(e) => setEditEnt(e.target.value)}
                className="w-20 h-8"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3 w-3 mr-1" /> {t("Cancel", "ביטול")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-around">
            {/* Productive ring */}
            <div className="flex flex-col items-center gap-2">
              <ScreenTimeGoalRing
                value={productiveSeconds}
                max={productiveGoalSecs}
                size={100}
                strokeWidth={8}
                color="#10b981"
              >
                <div className="text-center">
                  <div className="text-sm font-bold">{formatDuration(productiveSeconds, t)}</div>
                  <div className="text-[9px] text-muted-foreground">
                    / {formatDuration(productiveGoalSecs, t)}
                  </div>
                </div>
              </ScreenTimeGoalRing>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-green-400" />
                {t("Productive", "פרודוקטיבי")}
              </div>
            </div>

            {/* Entertainment ring */}
            <div className="flex flex-col items-center gap-2">
              <ScreenTimeGoalRing
                value={entertainmentSeconds}
                max={entertainmentGoalSecs}
                size={100}
                strokeWidth={8}
                color={entertainmentExceeded ? "#ef4444" : "#f97316"}
              >
                <div className="text-center">
                  <div className="text-sm font-bold">{formatDuration(entertainmentSeconds, t)}</div>
                  <div className="text-[9px] text-muted-foreground">
                    / {formatDuration(entertainmentGoalSecs, t)}
                  </div>
                </div>
              </ScreenTimeGoalRing>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Monitor className="h-3 w-3 text-orange-400" />
                {t("Entertainment", "בידור")}
              </div>
            </div>
          </div>
        )}

        {/* Warning banner if entertainment exceeded */}
        {!editing && entertainmentExceeded && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-400">
              {t(
                `Entertainment time exceeded by ${formatDuration(entertainmentSeconds - entertainmentGoalSecs, t)}`,
                `זמן בידור חרג ב-${formatDuration(entertainmentSeconds - entertainmentGoalSecs, t)}`
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────
   Unclassified Apps Section
   ────────────────────────────────────── */

function UnclassifiedAppsSection({ data, onClassified }: { data: ActivityDay; onClassified: () => void }) {
  const { t } = useSettings();
  const { addRule } = useActivityRules();

  const unclassifiedApps = useMemo(() => {
    return data.apps.filter((app) => app.category === "uncategorized");
  }, [data.apps]);

  const [classifyingApp, setClassifyingApp] = useState<string | null>(null);

  const categoryOptions = Object.entries(CATEGORY_CONFIG)
    .filter(([key]) => key !== "uncategorized")
    .map(([key, val]) => ({ value: key, label: `${val.emoji} ${getCategoryLabel(key, t)}` }));

  const handleClassify = async (appName: string, category: string) => {
    await addRule(appName, category);
    setClassifyingApp(null);
    onClassified();
  };

  if (unclassifiedApps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          {t("Unclassified Apps", "אפליקציות לא מסווגות")} ({unclassifiedApps.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          {t(
            "These apps appeared in your activity but have no classification rule. Click to classify them.",
            "אפליקציות אלו הופיעו בפעילות שלך אך אין להן כלל סיווג. לחץ כדי לסווג אותן."
          )}
        </p>
        <div className="space-y-2">
          {unclassifiedApps.map((app) => {
            const isClassifying = classifyingApp === app.appName;
            return (
              <div
                key={app.appName}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm truncate">{app.appName}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDuration(app.totalSeconds, t)}
                  </span>
                </div>
                {isClassifying ? (
                  <div className="flex items-center gap-1">
                    <select
                      autoFocus
                      className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleClassify(app.appName, e.target.value);
                      }}
                    >
                      <option value="" disabled>
                        {t("Select...", "בחר...")}
                      </option>
                      {categoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setClassifyingApp(null)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setClassifyingApp(app.appName)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t("Classify", "סווג")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────
   Day View
   ────────────────────────────────────── */

function DayView({ data }: { data: ActivityDay }) {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(false);

  if (!data.awConnected) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">{t("ActivityWatch is not running", "ActivityWatch לא פעיל")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("Start ActivityWatch on your Mac to see screen time data", "הפעל ActivityWatch במאק שלך כדי לראות נתוני זמן מסך")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (data.totalSeconds === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Monitor className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">{t("No screen time data for today", "אין נתוני זמן מסך להיום")}</p>
        </CardContent>
      </Card>
    );
  }

  const categories = Object.entries(data.byCategory)
    .sort((a, b) => b[1] - a[1]);

  const topApps = expanded ? data.apps : data.apps.slice(0, 5);

  return (
    <>
      {/* Total screen time */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">{t("Total Screen Time", "סה״כ זמן מסך")}</span>
            </div>
            <span className="text-2xl font-bold">{formatDuration(data.totalSeconds, t)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("By Category", "לפי קטגוריה")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stacked bar */}
          <div className="flex h-6 rounded-full overflow-hidden mb-4">
            {categories.map(([cat, seconds]) => {
              const pct = (seconds / data.totalSeconds) * 100;
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.uncategorized;
              return (
                <div
                  key={cat}
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: config.color }}
                  title={`${getCategoryLabel(cat, t)}: ${formatDuration(seconds, t)}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {categories.map(([cat, seconds]) => {
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.uncategorized;
              const pct = Math.round((seconds / data.totalSeconds) * 100);
              return (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm">
                      {config.emoji} {getCategoryLabel(cat, t)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatDuration(seconds, t)}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* App list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("Apps", "אפליקציות")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topApps.map((app, i) => {
              const config = CATEGORY_CONFIG[app.category] || CATEGORY_CONFIG.uncategorized;
              const pct = (app.totalSeconds / data.totalSeconds) * 100;
              return (
                <div key={`${app.appName}-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 shrink-0"
                        style={{ borderColor: config.color, color: config.color }}
                      >
                        {getCategoryLabel(app.category, t)}
                      </Badge>
                      <span className="text-sm truncate">{app.appName}</span>
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap ml-2">
                      {formatDuration(app.totalSeconds, t)}
                    </span>
                  </div>
                  <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {data.apps.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" /> {t("Show Less", "הצג פחות")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" /> {t("Show All", "הצג הכל")} ({data.apps.length})
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* ──────────────────────────────────────
   Week View
   ────────────────────────────────────── */

function WeekView({ data }: { data: ActivityWeek }) {
  const { t } = useSettings();

  if (!data.days || data.days.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          {t("No weekly data available", "אין נתונים שבועיים")}
        </CardContent>
      </Card>
    );
  }

  const categoryTotals: Record<string, number> = {};
  let weekTotal = 0;

  for (const day of data.days) {
    for (const [cat, seconds] of Object.entries(day.byCategory)) {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + seconds;
    }
    weekTotal += day.totalSeconds;
  }

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Find max daily total for bar chart scaling
  const maxDaily = Math.max(...data.days.map((d) => d.totalSeconds), 1);

  return (
    <>
      {/* Weekly total */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("Weekly Screen Time", "זמן מסך שבועי")}</span>
            <span className="text-2xl font-bold">{formatDuration(weekTotal, t)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("Avg", "ממוצע")} {formatDuration(Math.round(weekTotal / 7), t)} {t("/ day", "/ יום")}
          </p>
        </CardContent>
      </Card>

      {/* Daily bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("Daily Usage", "שימוש יומי")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {data.days.map((day) => {
              const height = (day.totalSeconds / maxDaily) * 100;
              const isToday =
                day.date === format(new Date(), "yyyy-MM-dd");
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {formatDuration(day.totalSeconds, t)}
                  </span>
                  <div className="w-full flex flex-col-reverse rounded-t-md overflow-hidden"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    {Object.entries(day.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, seconds]) => {
                        const catConfig = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.uncategorized;
                        const catPct = day.totalSeconds > 0 ? (seconds / day.totalSeconds) * 100 : 0;
                        return (
                          <div
                            key={cat}
                            style={{
                              height: `${catPct}%`,
                              backgroundColor: catConfig.color,
                            }}
                          />
                        );
                      })}
                  </div>
                  <span
                    className={`text-[10px] ${
                      isToday ? "text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {format(new Date(day.date + "T12:00:00"), "EEE")}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly category breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("Weekly Breakdown", "פילוח שבועי")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedCategories.map(([cat, seconds]) => {
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.uncategorized;
              const pct = weekTotal > 0 ? Math.round((seconds / weekTotal) * 100) : 0;
              return (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm">
                      {config.emoji} {getCategoryLabel(cat, t)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatDuration(seconds, t)}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ──────────────────────────────────────
   Classification Rules Section (enhanced)
   ────────────────────────────────────── */

function RulesSection() {
  const { t } = useSettings();
  const { rules, addRule, updateRule, deleteRule } = useActivityRules();
  const [showRules, setShowRules] = useState(false);
  const [newApp, setNewApp] = useState("");
  const [newCategory, setNewCategory] = useState("productive");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editApp, setEditApp] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [filterText, setFilterText] = useState("");

  const categoryOptions = Object.entries(CATEGORY_CONFIG)
    .filter(([key]) => key !== "uncategorized")
    .map(([key, val]) => ({ value: key, label: `${val.emoji} ${getCategoryLabel(key, t)}` }));

  const filteredRules = useMemo(() => {
    if (!filterText.trim()) return rules;
    const lower = filterText.toLowerCase();
    return rules.filter(
      (r) =>
        r.appName.toLowerCase().includes(lower) ||
        (CATEGORY_CONFIG[r.category]?.label || "").toLowerCase().includes(lower)
    );
  }, [rules, filterText]);

  const startEditing = (rule: { id: string; appName: string; category: string }) => {
    setEditingId(rule.id);
    setEditApp(rule.appName);
    setEditCategory(rule.category);
  };

  const saveEdit = async () => {
    if (!editingId || !editApp.trim()) return;
    await updateRule(editingId, { appName: editApp.trim(), category: editCategory });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setShowRules(!showRules)}
        >
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("Classification Rules", "כללי סיווג")} ({rules.length})
          </CardTitle>
          {showRules ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {showRules && (
        <CardContent>
          {/* Add new rule */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder={t("App name", "שם אפליקציה")}
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newApp.trim()) {
                  addRule(newApp.trim(), newCategory);
                  setNewApp("");
                }
              }}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={async () => {
                if (newApp.trim()) {
                  await addRule(newApp.trim(), newCategory);
                  setNewApp("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter */}
          {rules.length > 10 && (
            <Input
              placeholder={t("Filter rules...", "סנן כללים...")}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="mb-3 h-7 text-xs"
            />
          )}

          {/* Table header */}
          <div className="flex items-center justify-between px-2 pb-1 border-b border-border/30 mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {t("App Name", "שם אפליקציה")}
            </span>
            <div className="flex items-center gap-6">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {t("Category", "קטגוריה")}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium w-12 text-right">
                {t("Actions", "פעולות")}
              </span>
            </div>
          </div>

          {/* Rules list */}
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {filteredRules.map((rule) => {
              const config = CATEGORY_CONFIG[rule.category] || CATEGORY_CONFIG.uncategorized;
              const isEditing = editingId === rule.id;

              if (isEditing) {
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/20"
                  >
                    <Input
                      value={editApp}
                      onChange={(e) => setEditApp(e.target.value)}
                      className="h-7 text-sm flex-1 mr-2"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        {categoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={saveEdit}
                        className="text-green-400 hover:text-green-300 p-1"
                        title={t("Save", "שמור")}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-muted-foreground hover:text-foreground p-1"
                        title={t("Cancel", "ביטול")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/20 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm truncate">{rule.appName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                      style={{ borderColor: config.color, color: config.color }}
                    >
                      {getCategoryLabel(rule.category, t)}
                    </Badge>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(rule)}
                        className="text-muted-foreground/50 hover:text-blue-400 transition-colors p-1"
                        title={t("Edit", "ערוך")}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1"
                        title={t("Delete", "מחק")}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRules.length === 0 && filterText && (
            <p className="text-xs text-muted-foreground text-center py-3">
              {t("No rules match your filter", "אין כללים שתואמים לסינון")}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
