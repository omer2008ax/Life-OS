"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Target,
  CheckCircle2,
  XCircle,
  CalendarDays,
  ListTodo,
  Flame,
  ChevronDown,
  ChevronUp,
  Link2,
  Unlink,
  Milestone as MilestoneIcon,
  Circle,
  Trash2,
  Clock,
  TrendingUp,
  Edit3,
} from "lucide-react";

// ============ Types ============

interface LinkedTask {
  id: string;
  title: string;
  status: string;
  date: string;
  category: string;
}

interface LinkedHabit {
  id: string;
  name: string;
  color: string;
  completions: { date: string }[];
}

interface MilestoneData {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

interface GoalFull {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: string | null;
  status: string;
  progress: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  tasks: LinkedTask[];
  habits: LinkedHabit[];
  milestones: MilestoneData[];
  _count: {
    tasks: number;
    habits: number;
  };
}

interface UnlinkedTask {
  id: string;
  title: string;
  status: string;
  date: string;
  category: string;
}

interface UnlinkedHabit {
  id: string;
  name: string;
  color: string;
}

// ============ Helpers ============

function getHabitStreak(completions: { date: string }[]): number {
  if (completions.length === 0) return 0;
  const dates = new Set(completions.map((c) => c.date));
  const today = new Date();
  let streak = 0;
  const todayStr = formatDate(today);

  // Start from today or yesterday
  let checkDate = new Date(today);
  if (dates.has(todayStr)) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (dates.has(formatDate(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  if (!dates.has(todayStr) && streak === 0) {
    checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1);
    while (dates.has(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  return streak;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeGoalProgress(goal: GoalFull): number {
  const completedTasks = goal.tasks.filter(
    (t) => t.status === "completed"
  ).length;
  const totalTasks = goal.tasks.length;
  const milestonesDone = goal.milestones.filter((m) => m.completed).length;
  const totalMilestones = goal.milestones.length;

  // Calculate habit consistency (last 30 days)
  let habitScore = 0;
  if (goal.habits.length > 0) {
    const today = new Date();
    const last30 = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last30.add(formatDate(d));
    }
    let totalPossible = goal.habits.length * 30;
    let totalDone = 0;
    for (const habit of goal.habits) {
      for (const c of habit.completions) {
        if (last30.has(c.date)) totalDone++;
      }
    }
    habitScore = totalPossible > 0 ? (totalDone / totalPossible) * 100 : 0;
  }

  // Weighted average of components that exist
  const components: number[] = [];
  if (totalTasks > 0) {
    components.push((completedTasks / totalTasks) * 100);
  }
  if (totalMilestones > 0) {
    components.push((milestonesDone / totalMilestones) * 100);
  }
  if (goal.habits.length > 0) {
    components.push(habitScore);
  }

  if (components.length === 0) return goal.progress; // fallback to manual

  const avg = components.reduce((a, b) => a + b, 0) / components.length;
  return Math.round(avg);
}

function getGoalStatus(
  goal: GoalFull
): "on-track" | "at-risk" | "behind" | "no-deadline" {
  if (!goal.targetDate) return "no-deadline";
  const now = new Date();
  const target = new Date(goal.targetDate + "T23:59:59");
  const created = new Date(goal.createdAt);

  const totalTime = target.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();

  if (totalTime <= 0) return "behind";

  const timeProgress = Math.min((elapsed / totalTime) * 100, 100);
  const actualProgress = computeGoalProgress(goal);

  if (now > target) return "behind";
  if (actualProgress >= timeProgress - 10) return "on-track";
  if (actualProgress >= timeProgress - 30) return "at-risk";
  return "behind";
}

function getDaysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate + "T23:59:59");
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============ Progress Ring SVG ============

function ProgressRing({
  progress,
  status,
  size = 64,
  strokeWidth = 5,
}: {
  progress: number;
  status: "on-track" | "at-risk" | "behind" | "no-deadline";
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  const colorMap = {
    "on-track": "oklch(0.72 0.19 145)",
    "at-risk": "oklch(0.79 0.17 75)",
    behind: "oklch(0.70 0.19 25)",
    "no-deadline": "oklch(0.7 0.15 250)",
  };

  const color = colorMap[status];

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
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
        className="transition-all duration-700 ease-out"
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-bold"
        style={{ fontSize: size * 0.22 }}
      >
        {progress}%
      </text>
    </svg>
  );
}

// ============ Timeline Bar ============

function TimelineBar({
  goal,
  t,
}: {
  goal: GoalFull;
  t: (en: string, he: string) => string;
}) {
  if (!goal.targetDate) return null;

  const created = new Date(goal.createdAt);
  const target = new Date(goal.targetDate + "T23:59:59");
  const now = new Date();

  const totalTime = target.getTime() - created.getTime();
  if (totalTime <= 0) return null;

  const elapsed = Math.min(
    ((now.getTime() - created.getTime()) / totalTime) * 100,
    100
  );
  const progress = computeGoalProgress(goal);
  const daysLeft = getDaysRemaining(goal.targetDate);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {t("Timeline", "ציר זמן")}
        </span>
        <span>
          {daysLeft !== null && daysLeft > 0
            ? t(`${daysLeft} days left`, `${daysLeft} ימים נותרו`)
            : daysLeft !== null && daysLeft <= 0
              ? t("Overdue", "באיחור")
              : ""}
        </span>
      </div>
      <div className="relative h-2.5 bg-muted/30 rounded-full overflow-hidden">
        {/* Time elapsed indicator */}
        <div
          className="absolute top-0 left-0 h-full bg-muted-foreground/20 rounded-full"
          style={{ width: `${elapsed}%` }}
        />
        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor:
              progress >= elapsed - 10
                ? "oklch(0.72 0.19 145)"
                : progress >= elapsed - 30
                  ? "oklch(0.79 0.17 75)"
                  : "oklch(0.70 0.19 25)",
          }}
        />
        {/* Current time marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/60"
          style={{ left: `${elapsed}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
        <span>
          {t("Progress", "התקדמות")}: {progress}%
        </span>
        <span>
          {t("Time elapsed", "זמן שעבר")}: {Math.round(elapsed)}%
        </span>
      </div>
    </div>
  );
}

// ============ Main Page ============

export default function GoalsPage() {
  const { t } = useSettings();
  const [goals, setGoals] = useState<GoalFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (input: {
    title: string;
    description: string;
    category: string;
    targetDate: string;
    milestones: { title: string }[];
  }) => {
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await fetchGoals();
  };

  const updateGoal = async (id: string, data: Record<string, unknown>) => {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const inactiveGoals = goals.filter((g) => g.status !== "active");

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-24 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded mt-2" />
          </div>
          <div className="h-9 w-24 bg-muted rounded" />
        </div>
        <div className="h-40 bg-muted rounded-xl" />
        <div className="h-40 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Goals", "יעדים")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Track your goals and measure progress",
              "עקוב אחרי היעדים שלך ומדוד התקדמות"
            )}
          </p>
        </div>
        <AddGoalDialog onAdd={createGoal} />
      </div>

      {goals.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p>{t("No goals yet.", "עדיין אין יעדים.")}</p>
            <p className="text-sm mt-1">
              {t(
                "Add goals to start tracking your progress.",
                "הוסף יעדים כדי להתחיל לעקוב אחרי ההתקדמות שלך."
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {activeGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onUpdate={updateGoal}
            onDelete={deleteGoal}
            expanded={expandedGoalId === goal.id}
            onToggleExpand={() =>
              setExpandedGoalId(
                expandedGoalId === goal.id ? null : goal.id
              )
            }
          />
        ))}
      </div>

      {inactiveGoals.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {t(
              `${inactiveGoals.length} completed/abandoned`,
              `${inactiveGoals.length} הושלמו/ננטשו`
            )}
          </button>
          {showCompleted && (
            <div className="space-y-4 mt-3">
              {inactiveGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onUpdate={updateGoal}
                  onDelete={deleteGoal}
                  expanded={expandedGoalId === goal.id}
                  onToggleExpand={() =>
                    setExpandedGoalId(
                      expandedGoalId === goal.id ? null : goal.id
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Goal Card ============

function GoalCard({
  goal,
  onUpdate,
  onDelete,
  expanded,
  onToggleExpand,
}: {
  goal: GoalFull;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t } = useSettings();
  const isActive = goal.status === "active";
  const progress = computeGoalProgress(goal);
  const paceStatus = getGoalStatus(goal);
  const daysLeft = getDaysRemaining(goal.targetDate);

  const completedTasks = goal.tasks.filter(
    (t) => t.status === "completed"
  ).length;

  const categoryLabels: Record<string, string> = {
    health: t("Health", "בריאות"),
    career: t("Career", "קריירה"),
    learning: t("Learning", "למידה"),
    personal: t("Personal", "אישי"),
    financial: t("Financial", "פיננסי"),
    // Legacy support
    fitness: t("Fitness", "כושר"),
    business: t("Business", "עסקים"),
  };

  const categoryColors: Record<string, string> = {
    health: "bg-green-500/20 text-green-400",
    career: "bg-amber-500/20 text-amber-400",
    learning: "bg-blue-500/20 text-blue-400",
    personal: "bg-purple-500/20 text-purple-400",
    financial: "bg-emerald-500/20 text-emerald-400",
    fitness: "bg-green-500/20 text-green-400",
    business: "bg-amber-500/20 text-amber-400",
  };

  const statusColors: Record<string, string> = {
    "on-track": "text-green-400",
    "at-risk": "text-yellow-400",
    behind: "text-red-400",
    "no-deadline": "text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    "on-track": t("On Track", "בכיוון"),
    "at-risk": t("At Risk", "בסיכון"),
    behind: t("Behind", "מאחור"),
    "no-deadline": t("No Deadline", "ללא דדליין"),
  };

  return (
    <Card className={!isActive ? "opacity-60" : ""}>
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header Row: Ring + Title + Badge */}
        <div className="flex items-start gap-3">
          <ProgressRing progress={progress} status={paceStatus} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight">
                {goal.title}
              </h3>
              <Badge
                className={`flex-shrink-0 ${categoryColors[goal.category] || categoryColors.personal}`}
              >
                {categoryLabels[goal.category] || goal.category}
              </Badge>
            </div>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {goal.description}
              </p>
            )}

            {/* Status + meta row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {isActive && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${statusColors[paceStatus]}`}
                >
                  <TrendingUp className="h-3 w-3" />
                  {statusLabels[paceStatus]}
                </span>
              )}
              {goal.targetDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {goal.targetDate}
                  {daysLeft !== null && daysLeft > 0 && (
                    <span className="text-muted-foreground/70">
                      ({daysLeft}
                      {t("d", "י")})
                    </span>
                  )}
                </span>
              )}
              {goal.tasks.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ListTodo className="h-3 w-3" />
                  {completedTasks}/{goal.tasks.length}{" "}
                  {t("tasks", "משימות")}
                </span>
              )}
              {goal.habits.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3" />
                  {goal.habits.length} {t("habits", "הרגלים")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        {isActive && goal.targetDate && (
          <TimelineBar goal={goal} t={t} />
        )}

        {/* Milestones preview */}
        {goal.milestones.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MilestoneIcon className="h-3 w-3" />
              {t("Milestones", "אבני דרך")} (
              {goal.milestones.filter((m) => m.completed).length}/
              {goal.milestones.length})
            </span>
            <div className="space-y-0.5">
              {goal.milestones.map((ms) => (
                <div
                  key={ms.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <button
                    onClick={() =>
                      onUpdate(goal.id, {
                        toggleMilestoneId: ms.id,
                      })
                    }
                    className="flex-shrink-0"
                  >
                    {ms.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </button>
                  <span
                    className={
                      ms.completed
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {ms.title}
                  </span>
                  <button
                    onClick={() =>
                      onUpdate(goal.id, {
                        deleteMilestoneId: ms.id,
                      })
                    }
                    className="ml-auto text-muted-foreground/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand/Collapse for linking */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {expanded
            ? t("Hide details", "הסתר פרטים")
            : t("Show details & link items", "הצג פרטים וקשר פריטים")}
        </button>

        {/* Expanded: linked tasks/habits + linking UI */}
        {expanded && (
          <ExpandedGoalDetails goal={goal} onUpdate={onUpdate} />
        )}

        {/* Status badge for inactive */}
        {!isActive && (
          <Badge
            className={
              goal.status === "completed"
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }
          >
            {goal.status === "completed"
              ? t("Completed", "הושלם")
              : t("Abandoned", "ננטש")}
          </Badge>
        )}

        {/* Actions for active goals */}
        {isActive && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-green-400 hover:text-green-300"
              onClick={() =>
                onUpdate(goal.id, {
                  status: "completed",
                  progress: 100,
                })
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("Complete", "השלם")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-400 hover:text-red-300"
              onClick={() =>
                onUpdate(goal.id, { status: "abandoned" })
              }
            >
              <XCircle className="h-3.5 w-3.5" />
              {t("Abandon", "נטוש")}
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground/50 hover:text-red-400"
              onClick={() => onDelete(goal.id)}
            >
              {t("Delete", "מחק")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Expanded Goal Details ============

function ExpandedGoalDetails({
  goal,
  onUpdate,
}: {
  goal: GoalFull;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useSettings();
  const [unlinkedTasks, setUnlinkedTasks] = useState<UnlinkedTask[]>([]);
  const [unlinkedHabits, setUnlinkedHabits] = useState<UnlinkedHabit[]>([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(true);
  const [newMilestone, setNewMilestone] = useState("");

  // Fetch unlinked tasks and habits
  useEffect(() => {
    const fetchUnlinked = async () => {
      setLoadingUnlinked(true);
      try {
        // Fetch all tasks from last 30 days without a goalId
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const start = formatDate(thirtyDaysAgo);
        const end = formatDate(today);

        const [tasksRes, habitsRes] = await Promise.all([
          fetch(`/api/tasks?start=${start}&end=${end}`),
          fetch("/api/habits"),
        ]);
        const tasks = await tasksRes.json();
        const habits = await habitsRes.json();

        setUnlinkedTasks(
          (tasks as UnlinkedTask[]).filter(
            (t: UnlinkedTask) => !t.category || t.id // accept all, filter no goalId below
          ).filter((t: UnlinkedTask & { goalId?: string | null }) => !t.goalId)
        );
        setUnlinkedHabits(
          (habits as (UnlinkedHabit & { goalId?: string | null })[]).filter(
            (h) => !h.goalId
          )
        );
      } catch (e) {
        console.error("Failed to fetch unlinked items:", e);
      }
      setLoadingUnlinked(false);
    };
    fetchUnlinked();
  }, [goal]);

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    await onUpdate(goal.id, { addMilestone: newMilestone.trim() });
    setNewMilestone("");
  };

  return (
    <div className="space-y-4 border-t border-muted/30 pt-3">
      {/* Linked Tasks */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ListTodo className="h-3.5 w-3.5" />
          {t("Linked Tasks", "משימות מקושרות")} ({goal.tasks.length})
        </h4>
        {goal.tasks.length === 0 && (
          <p className="text-xs text-muted-foreground/60 italic">
            {t("No tasks linked yet", "אין משימות מקושרות עדיין")}
          </p>
        )}
        <div className="space-y-1">
          {goal.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-muted/10"
            >
              {task.status === "completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
              )}
              <span
                className={`flex-1 truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
              >
                {task.title}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {task.date}
              </span>
              <button
                onClick={() =>
                  onUpdate(goal.id, { unlinkTaskId: task.id })
                }
                className="text-muted-foreground/30 hover:text-red-400 transition-colors"
                title={t("Unlink", "בטל קישור")}
              >
                <Unlink className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Link unlinked tasks */}
        {!loadingUnlinked && unlinkedTasks.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("Available tasks to link", "משימות זמינות לקישור")}
            </span>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {unlinkedTasks.slice(0, 20).map((task) => (
                <button
                  key={task.id}
                  onClick={() =>
                    onUpdate(goal.id, { linkTaskId: task.id })
                  }
                  className="flex items-center gap-2 text-xs py-1 px-2 rounded-md hover:bg-muted/20 transition-colors w-full text-left"
                >
                  <Link2 className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="truncate flex-1">{task.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {task.date}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Linked Habits */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5" />
          {t("Linked Habits", "הרגלים מקושרים")} ({goal.habits.length})
        </h4>
        {goal.habits.length === 0 && (
          <p className="text-xs text-muted-foreground/60 italic">
            {t("No habits linked yet", "אין הרגלים מקושרים עדיין")}
          </p>
        )}
        <div className="space-y-1">
          {goal.habits.map((habit) => {
            const streak = getHabitStreak(habit.completions);
            return (
              <div
                key={habit.id}
                className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-muted/10"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: habit.color }}
                />
                <span className="flex-1 truncate">{habit.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Flame className="h-2.5 w-2.5 text-orange-400" />
                  {t(`${streak}d streak`, `רצף ${streak} ימים`)}
                </span>
                <button
                  onClick={() =>
                    onUpdate(goal.id, { unlinkHabitId: habit.id })
                  }
                  className="text-muted-foreground/30 hover:text-red-400 transition-colors"
                  title={t("Unlink", "בטל קישור")}
                >
                  <Unlink className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Link unlinked habits */}
        {!loadingUnlinked && unlinkedHabits.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t("Available habits to link", "הרגלים זמינים לקישור")}
            </span>
            <div className="space-y-0.5">
              {unlinkedHabits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() =>
                    onUpdate(goal.id, { linkHabitId: habit.id })
                  }
                  className="flex items-center gap-2 text-xs py-1 px-2 rounded-md hover:bg-muted/20 transition-colors w-full text-left"
                >
                  <Link2 className="h-3 w-3 text-primary flex-shrink-0" />
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />
                  <span className="truncate">{habit.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Milestone */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <MilestoneIcon className="h-3.5 w-3.5" />
          {t("Add Milestone", "הוסף אבן דרך")}
        </h4>
        <div className="flex gap-2">
          <Input
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            placeholder={t(
              "e.g. Finish chapter 1",
              "למשל: סיים פרק 1"
            )}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addMilestone()}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addMilestone}
            disabled={!newMilestone.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Add Goal Dialog ============

function AddGoalDialog({
  onAdd,
}: {
  onAdd: (input: {
    title: string;
    description: string;
    category: string;
    targetDate: string;
    milestones: { title: string }[];
  }) => Promise<void>;
}) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  const [targetDate, setTargetDate] = useState("");
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>([""]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const validMilestones = milestoneInputs
      .filter((m) => m.trim())
      .map((m) => ({ title: m.trim() }));

    await onAdd({
      title: title.trim(),
      description: description.trim(),
      category,
      targetDate,
      milestones: validMilestones,
    });
    setTitle("");
    setDescription("");
    setCategory("personal");
    setTargetDate("");
    setMilestoneInputs([""]);
    setOpen(false);
  };

  const addMilestoneInput = () => {
    setMilestoneInputs((prev) => [...prev, ""]);
  };

  const updateMilestoneInput = (index: number, value: string) => {
    setMilestoneInputs((prev) =>
      prev.map((m, i) => (i === index ? value : m))
    );
  };

  const removeMilestoneInput = (index: number) => {
    setMilestoneInputs((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="gap-1.5" />}
      >
        <Plus className="h-4 w-4" />
        {t("Add Goal", "הוסף יעד")}
      </DialogTrigger>
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{t("New Goal", "יעד חדש")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>{t("Title", "כותרת")}</Label>
            <Input
              placeholder={t(
                "e.g. Run a marathon, Learn Spanish",
                "למשל: לרוץ מרתון, ללמוד ספרדית"
              )}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("Description", "תיאור")}</Label>
            <Input
              placeholder={t(
                "Optional description...",
                "תיאור אופציונלי..."
              )}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("Category", "קטגוריה")}</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="health">{t("Health", "בריאות")}</option>
              <option value="career">{t("Career", "קריירה")}</option>
              <option value="learning">{t("Learning", "למידה")}</option>
              <option value="personal">{t("Personal", "אישי")}</option>
              <option value="financial">
                {t("Financial", "פיננסי")}
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>{t("Target Date", "תאריך יעד")}</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MilestoneIcon className="h-3.5 w-3.5" />
              {t("Milestones", "אבני דרך")}
              <span className="text-muted-foreground font-normal text-xs">
                ({t("optional", "אופציונלי")})
              </span>
            </Label>
            <div className="space-y-2">
              {milestoneInputs.map((ms, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={t(
                      `Milestone ${i + 1}`,
                      `אבן דרך ${i + 1}`
                    )}
                    value={ms}
                    onChange={(e) =>
                      updateMilestoneInput(i, e.target.value)
                    }
                  />
                  {milestoneInputs.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2 text-muted-foreground/50 hover:text-red-400"
                      onClick={() => removeMilestoneInput(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-xs text-muted-foreground"
                onClick={addMilestoneInput}
              >
                <Plus className="h-3 w-3" />
                {t("Add milestone", "הוסף אבן דרך")}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!title.trim()}
          >
            {t("Create Goal", "צור יעד")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
