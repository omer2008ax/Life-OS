"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTasks } from "@/lib/hooks";
import { useSettings } from "@/lib/settings-context";
import { Task, TaskStatus } from "@/types";
import { TaskCard } from "@/components/task-card";
import { AddTaskDialog } from "@/components/add-task-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  format,
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  getDay,
  isToday as isTodayFn,
  isSameDay,
  isSameMonth,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Clock,
  CalendarDays,
  Grid3X3,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

type ViewMode = "list" | "timeline" | "week" | "month";

const HOUR_HEIGHT = 80;
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 23;

const timelineCategoryBorder: Record<string, string> = {
  fitness: "border-l-green-500",
  learning: "border-l-blue-500",
  business: "border-l-purple-500",
  personal: "border-l-orange-500",
};

const timelineCategoryBg: Record<string, string> = {
  fitness: "bg-green-500/10",
  learning: "bg-blue-500/10",
  business: "bg-purple-500/10",
  personal: "bg-orange-500/10",
};

const weekCategoryDot: Record<string, string> = {
  fitness: "bg-green-500",
  learning: "bg-blue-500",
  business: "bg-purple-500",
  personal: "bg-orange-500",
};

// ─── Helper: parse "HH:MM" to hours and minutes ───
function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

// ─── Helper: compute overlap columns for tasks ───
function computeColumns(tasks: Task[]): { task: Task; col: number; totalCols: number }[] {
  const sorted = [...tasks]
    .filter((t) => t.startTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const positioned: { task: Task; startMin: number; endMin: number; col: number }[] = [];

  for (const task of sorted) {
    const { hours, minutes } = parseTime(task.startTime);
    const startMin = hours * 60 + minutes;
    const endMin = startMin + (task.duration || 30);

    // Find first column that doesn't overlap
    let col = 0;
    const overlapping = positioned.filter(
      (p) => p.startMin < endMin && p.endMin > startMin
    );
    const usedCols = new Set(overlapping.map((p) => p.col));
    while (usedCols.has(col)) col++;

    positioned.push({ task, startMin, endMin, col });
  }

  // Compute totalCols for each group of overlapping tasks
  const result: { task: Task; col: number; totalCols: number }[] = [];
  for (const item of positioned) {
    const overlapping = positioned.filter(
      (p) => p.startMin < item.endMin && p.endMin > item.startMin
    );
    const totalCols = Math.max(...overlapping.map((p) => p.col)) + 1;
    result.push({ task: item.task, col: item.col, totalCols });
  }

  return result;
}

// ─── Week Tasks Hook ───
function useWeekTasks(weekStart: Date) {
  const [weekTasks, setWeekTasks] = useState<Task[]>([]);
  const [weekLoading, setWeekLoading] = useState(true);

  const startStr = format(weekStart, "yyyy-MM-dd");
  const endStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const fetchWeekTasks = useCallback(async () => {
    try {
      setWeekLoading(true);
      const res = await fetch(`/api/tasks?start=${startStr}&end=${endStr}`);
      if (!res.ok) throw new Error("Failed to fetch week tasks");
      const data = await res.json();
      setWeekTasks(data);
    } catch (e) {
      console.error("Failed to fetch week tasks:", e);
      setWeekTasks([]);
    } finally {
      setWeekLoading(false);
    }
  }, [startStr, endStr]);

  useEffect(() => {
    fetchWeekTasks();
  }, [fetchWeekTasks]);

  return { weekTasks, weekLoading };
}

// ─── Month Tasks Hook ───
function useMonthTasks(date: Date) {
  const [monthTasks, setMonthTasks] = useState<Task[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  // Extend to full weeks
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 0 }), -1);

  const startStr = format(calStart, "yyyy-MM-dd");
  const endStr = format(calEnd, "yyyy-MM-dd");

  const fetchMonthTasks = useCallback(async () => {
    try {
      setMonthLoading(true);
      const res = await fetch(`/api/tasks?start=${startStr}&end=${endStr}`);
      if (!res.ok) throw new Error("Failed");
      setMonthTasks(await res.json());
    } catch {
      setMonthTasks([]);
    } finally {
      setMonthLoading(false);
    }
  }, [startStr, endStr]);

  useEffect(() => {
    fetchMonthTasks();
  }, [fetchMonthTasks]);

  return { monthTasks, monthLoading, calStart, calEnd };
}

// ─── Now Indicator Hook ───
function useNowMinutes() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  return now.getHours() * 60 + now.getMinutes();
}

export default function SchedulePage() {
  const { t } = useSettings();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("list");
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    copyTaskToDate,
  } = useTasks(date);
  const dateStr = format(date, "yyyy-MM-dd");

  const weekStart = useMemo(
    () => startOfWeek(date, { weekStartsOn: 1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateStr]
  );
  const { weekTasks, weekLoading } = useWeekTasks(weekStart);
  const { monthTasks, monthLoading, calStart } = useMonthTasks(date);
  const nowMinutes = useNowMinutes();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((tk) => tk.id === active.id);
    const newIndex = tasks.findIndex((tk) => tk.id === over.id);

    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderTasks(reordered.map((tk) => tk.id));
  };

  const isToday =
    format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const viewModes: { key: ViewMode; label: string; icon: typeof List }[] = [
    { key: "list", label: t("List", "רשימה"), icon: List },
    { key: "timeline", label: t("Timeline", "ציר זמן"), icon: Clock },
    { key: "week", label: t("Week", "שבוע"), icon: CalendarDays },
    { key: "month", label: t("Month", "חודש"), icon: Grid3X3 },
  ];

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setDate((d) => view === "month" ? subMonths(d, 1) : view === "week" ? subDays(d, 7) : subDays(d, 1))
          }
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <button
            onClick={() => setDate(new Date())}
            className="text-lg font-semibold hover:text-primary transition-colors"
          >
            {view === "month"
              ? format(date, "MMMM yyyy")
              : view === "week"
              ? `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "MMM d")}`
              : isToday
                ? t("Today", "היום")
                : format(date, "EEEE")}
          </button>
          <p className="text-xs text-muted-foreground">
            {view === "month"
              ? ""
              : view === "week"
              ? format(weekStart, "yyyy")
              : format(date, "MMMM d, yyyy")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setDate((d) => view === "month" ? addMonths(d, 1) : view === "week" ? addDays(d, 7) : addDays(d, 1))
          }
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-center gap-1 p-1 bg-muted rounded-lg">
        {viewModes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Add Task (not in week/month view) */}
      {view !== "week" && view !== "month" && (
        <div className="flex justify-end">
          <AddTaskDialog onAdd={createTask} defaultDate={dateStr} />
        </div>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {view === "list" && (
        <>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("Loading...", "טוען...")}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t("No tasks for this day.", "אין משימות ליום הזה.")}</p>
              <p className="text-sm mt-1">
                {t(
                  "Add tasks to build your schedule.",
                  "הוסף משימות כדי לבנות את הלו״ז שלך."
                )}
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tasks.map((tk) => tk.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(status) =>
                        updateTask(task.id, { status })
                      }
                      onDelete={() => deleteTask(task.id)}
                      onCopyToDate={copyTaskToDate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {/* ═══ TIMELINE VIEW ═══ */}
      {view === "timeline" && (
        <TimelineView
          tasks={tasks}
          loading={loading}
          isToday={isToday}
          nowMinutes={nowMinutes}
          onStatusChange={(id, status) => updateTask(id, { status })}
        />
      )}

      {/* ═══ WEEK VIEW ═══ */}
      {view === "week" && (
        <WeekView
          weekStart={weekStart}
          weekTasks={weekTasks}
          weekLoading={weekLoading}
          date={date}
          onSelectDay={(d) => {
            setDate(d);
            setView("list");
          }}
        />
      )}

      {/* ═══ MONTH VIEW ═══ */}
      {view === "month" && (
        <MonthView
          date={date}
          monthTasks={monthTasks}
          monthLoading={monthLoading}
          calStart={calStart}
          onSelectDay={(d) => {
            setDate(d);
            setView("list");
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TIMELINE VIEW COMPONENT
// ─────────────────────────────────────────────
function TimelineView({
  tasks,
  loading,
  isToday,
  nowMinutes,
  onStatusChange,
}: {
  tasks: Task[];
  loading: boolean;
  isToday: boolean;
  nowMinutes: number;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  const { t } = useSettings();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("Loading...", "טוען...")}
      </div>
    );
  }

  const totalHours = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
  const totalHeight = totalHours * HOUR_HEIGHT;
  const columns = computeColumns(tasks);

  // Now indicator position
  const nowOffset =
    ((nowMinutes / 60 - TIMELINE_START_HOUR) / totalHours) * totalHeight;
  const showNow =
    isToday &&
    nowMinutes >= TIMELINE_START_HOUR * 60 &&
    nowMinutes <= TIMELINE_END_HOUR * 60;

  return (
    <div className="overflow-y-auto">
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour grid lines and labels */}
        {Array.from({ length: totalHours + 1 }, (_, i) => {
          const hour = TIMELINE_START_HOUR + i;
          const top = i * HOUR_HEIGHT;
          return (
            <div key={hour} className="absolute w-full" style={{ top }}>
              <div className="flex items-start">
                <span className="text-xs text-muted-foreground w-14 shrink-0 -translate-y-2 text-right pr-3">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <div className="flex-1 border-t border-border/40" />
              </div>
            </div>
          );
        })}

        {/* Task blocks */}
        {columns.map(({ task, col, totalCols }) => {
          const { hours, minutes } = parseTime(task.startTime);
          const startMinTotal = hours * 60 + minutes;
          const taskTop =
            ((startMinTotal / 60 - TIMELINE_START_HOUR) / totalHours) *
            totalHeight;
          const taskHeight = ((task.duration || 30) / 60 / totalHours) * totalHeight;
          const isCompleted = task.status === "completed";
          const isSkipped = task.status === "skipped";
          const isExpanded = expandedTaskId === task.id;
          const widthPercent = 100 / totalCols;
          const leftPercent = col * widthPercent;

          return (
            <div
              key={task.id}
              className={`absolute cursor-pointer transition-shadow hover:shadow-md rounded-md border-l-4 ${
                timelineCategoryBorder[task.category] || "border-l-gray-500"
              } ${
                timelineCategoryBg[task.category] || "bg-muted/50"
              } ${isCompleted ? "opacity-60" : ""} ${isSkipped ? "opacity-40 line-through" : ""}`}
              style={{
                top: taskTop,
                height: Math.max(taskHeight, 28),
                left: `calc(3.5rem + (100% - 3.5rem) * ${leftPercent / 100})`,
                width: `calc((100% - 3.5rem) * ${widthPercent / 100} - 4px)`,
              }}
              onClick={() =>
                setExpandedTaskId(isExpanded ? null : task.id)
              }
            >
              <div className="px-2 py-1 h-full flex flex-col justify-start overflow-hidden">
                <p
                  className={`text-sm font-medium truncate ${isCompleted ? "line-through" : ""}`}
                >
                  {task.title}
                </p>
                {taskHeight > 36 && (
                  <p className="text-xs text-muted-foreground">
                    {task.startTime} &middot; {task.duration}
                    {t("min", "ד׳")}
                  </p>
                )}
              </div>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="absolute top-full left-0 z-10 mt-1 bg-popover border rounded-md shadow-lg p-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(task.id, "completed");
                      setExpandedTaskId(null);
                    }}
                  >
                    {t("Complete", "הושלם")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(task.id, "skipped");
                      setExpandedTaskId(null);
                    }}
                  >
                    {t("Skip", "דלג")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(task.id, "postponed");
                      setExpandedTaskId(null);
                    }}
                  >
                    {t("Postpone", "דחה")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Current time indicator */}
        {showNow && (
          <div
            className="absolute w-full z-20 pointer-events-none"
            style={{ top: nowOffset }}
          >
            <div className="flex items-center">
              <div className="w-14 shrink-0" />
              <div className="flex-1 relative">
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                <div className="h-0.5 bg-red-500 w-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WEEK VIEW COMPONENT
// ─────────────────────────────────────────────
function WeekView({
  weekStart,
  weekTasks,
  weekLoading,
  date,
  onSelectDay,
}: {
  weekStart: Date;
  weekTasks: Task[];
  weekLoading: boolean;
  date: Date;
  onSelectDay: (d: Date) => void;
}) {
  const { t } = useSettings();

  const dayNames = [
    t("Mon", "ב׳"),
    t("Tue", "ג׳"),
    t("Wed", "ד׳"),
    t("Thu", "ה׳"),
    t("Fri", "ו׳"),
    t("Sat", "ש׳"),
    t("Sun", "א׳"),
  ];

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (weekLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("Loading...", "טוען...")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, i) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayTasks = weekTasks.filter((tk) => tk.date === dayStr);
        const completedCount = dayTasks.filter(
          (tk) => tk.status === "completed"
        ).length;
        const today = isTodayFn(day);
        const isSelected = isSameDay(day, date);

        return (
          <Card
            key={dayStr}
            className={`cursor-pointer transition-all hover:shadow-md ${
              today
                ? "ring-2 ring-primary"
                : isSelected
                  ? "ring-1 ring-primary/50"
                  : ""
            }`}
            onClick={() => onSelectDay(day)}
          >
            <CardContent className="p-3 flex flex-col items-center gap-2">
              <p
                className={`text-xs font-medium ${
                  today ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {dayNames[i]}
              </p>
              <p
                className={`text-lg font-bold ${
                  today ? "text-primary" : ""
                }`}
              >
                {format(day, "d")}
              </p>

              {/* Task dots */}
              <div className="flex flex-wrap gap-1 justify-center min-h-[20px]">
                {dayTasks.slice(0, 6).map((tk) => (
                  <div
                    key={tk.id}
                    className={`w-2 h-2 rounded-full ${
                      tk.status === "completed"
                        ? "opacity-40"
                        : ""
                    } ${weekCategoryDot[tk.category] || "bg-gray-400"}`}
                  />
                ))}
                {dayTasks.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{dayTasks.length - 6}
                  </span>
                )}
              </div>

              {/* Summary */}
              {dayTasks.length > 0 ? (
                <p className="text-[10px] text-muted-foreground text-center">
                  {completedCount}/{dayTasks.length}{" "}
                  {t("done", "בוצעו")}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  {t("No tasks", "אין משימות")}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// MONTH VIEW COMPONENT
// ─────────────────────────────────────────────
function MonthView({
  date,
  monthTasks,
  monthLoading,
  calStart,
  onSelectDay,
}: {
  date: Date;
  monthTasks: Task[];
  monthLoading: boolean;
  calStart: Date;
  onSelectDay: (d: Date) => void;
}) {
  const { t } = useSettings();

  const dayHeaders = [
    t("Sun", "א׳"),
    t("Mon", "ב׳"),
    t("Tue", "ג׳"),
    t("Wed", "ד׳"),
    t("Thu", "ה׳"),
    t("Fri", "ו׳"),
    t("Sat", "ש׳"),
  ];

  if (monthLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("Loading...", "טוען...")}
      </div>
    );
  }

  // Build 6 weeks of days
  const weeks: Date[][] = [];
  let current = calStart;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  // Remove last week if it's entirely next month
  if (weeks.length > 0 && !weeks[weeks.length - 1].some((d) => isSameMonth(d, date))) {
    weeks.pop();
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayTasks = monthTasks.filter((tk) => tk.date === dayStr);
          const total = dayTasks.length;
          const completed = dayTasks.filter((tk) => tk.status === "completed").length;
          const today = isTodayFn(day);
          const inMonth = isSameMonth(day, date);

          // Color logic
          let statusColor = "bg-transparent";
          if (total > 0) {
            const rate = completed / total;
            if (rate === 1) statusColor = "bg-green-500";
            else if (rate >= 0.5) statusColor = "bg-yellow-500";
            else if (rate > 0) statusColor = "bg-orange-500";
            else statusColor = "bg-red-500";
          }

          return (
            <button
              key={dayStr}
              onClick={() => onSelectDay(day)}
              className={`relative flex flex-col items-center py-2 rounded-lg transition-all hover:bg-muted/50 ${
                !inMonth ? "opacity-30" : ""
              } ${today ? "ring-2 ring-primary" : ""}`}
            >
              <span
                className={`text-sm font-medium ${
                  today ? "text-primary" : ""
                }`}
              >
                {format(day, "d")}
              </span>
              {total > 0 && (
                <>
                  <div className={`w-2 h-2 rounded-full mt-1 ${statusColor}`} />
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {completed}/{total}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3">
        {[
          { color: "bg-green-500", label: t("All done", "הכל בוצע") },
          { color: "bg-yellow-500", label: t("Partial", "חלקי") },
          { color: "bg-red-500", label: t("None done", "לא בוצע") },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
