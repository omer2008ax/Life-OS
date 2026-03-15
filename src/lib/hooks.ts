import { useState, useEffect, useCallback, useMemo } from "react";
import { Task, CreateTaskInput, UpdateTaskInput, Habit, HabitWithStats, CreateHabitInput } from "@/types";
import { format, subDays, startOfWeek, differenceInDays, parseISO } from "date-fns";

export function useTasks(date: Date) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const dateStr = format(date, "yyyy-MM-dd");

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      // Generate recurring tasks for this date first
      await fetch("/api/recurring/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      }).catch(() => {});
      const res = await fetch(`/api/tasks?date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (input: CreateTaskInput) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, date: dateStr }),
      });
      if (res.ok) await fetchTasks();
    } catch (e) {
      console.error("Failed to create task:", e);
    }
  };

  const updateTask = async (id: string, input: UpdateTaskInput) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) await fetchTasks();
    } catch (e) {
      console.error("Failed to update task:", e);
    }
  };

  const deleteTask = async (id: string, deleteSeries?: boolean) => {
    try {
      const url = deleteSeries ? `/api/tasks/${id}?series=true` : `/api/tasks/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) await fetchTasks();
    } catch (e) {
      console.error("Failed to delete task:", e);
    }
  };

  const reorderTasks = async (orderedIds: string[]) => {
    const reordered = orderedIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter(Boolean) as Task[];
    setTasks(reordered);

    try {
      await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (e) {
      console.error("Failed to reorder tasks:", e);
    }
  };

  const copyTaskToDate = async (task: Task, targetDate: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          date: targetDate,
          startTime: task.startTime,
          duration: task.duration,
          category: task.category,
          priority: task.priority,
          description: task.description || "",
          tags: task.tags || "",
          goalId: task.goalId || undefined,
        }),
      });
      return res.ok;
    } catch (e) {
      console.error("Failed to copy task:", e);
      return false;
    }
  };

  return { tasks, loading, createTask, updateTask, deleteTask, reorderTasks, copyTaskToDate, refetch: fetchTasks };
}

// Habit stats calculation
function calculateHabitStats(habit: Habit): HabitWithStats {
  const today = format(new Date(), "yyyy-MM-dd");
  const completionDates = new Set(habit.completions.map((c) => c.date));

  // Current streak: count backwards from today
  let currentStreak = 0;
  let checkDate = new Date();
  // If today is completed, start counting from today
  if (completionDates.has(today)) {
    currentStreak = 1;
    checkDate = subDays(checkDate, 1);
  }
  // Count consecutive days backwards
  while (completionDates.has(format(checkDate, "yyyy-MM-dd"))) {
    currentStreak++;
    checkDate = subDays(checkDate, 1);
  }
  // If today is NOT completed, check from yesterday
  if (!completionDates.has(today) && currentStreak === 0) {
    checkDate = subDays(new Date(), 1);
    while (completionDates.has(format(checkDate, "yyyy-MM-dd"))) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    }
  }

  // Longest streak
  let longestStreak = 0;
  if (habit.completions.length > 0) {
    const sortedDates = [...completionDates].sort();
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = differenceInDays(parseISO(sortedDates[i]), parseISO(sortedDates[i - 1]));
      if (diff === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // Weekly rate: completions in last 7 days
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  let weeklyRate = 0;
  for (let i = 0; i < 7; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (completionDates.has(d) && parseISO(d) >= weekStart) {
      weeklyRate++;
    }
  }

  return {
    ...habit,
    currentStreak,
    longestStreak,
    weeklyRate,
    completedToday: completionDates.has(today),
  };
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/habits");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setHabits(data);
    } catch (e) {
      console.error("Failed to fetch habits:", e);
      setHabits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const habitsWithStats: HabitWithStats[] = useMemo(
    () => habits.map(calculateHabitStats),
    [habits]
  );

  const createHabit = async (input: CreateHabitInput) => {
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) await fetchHabits();
    } catch (e) {
      console.error("Failed to create habit:", e);
    }
  };

  const toggleHabit = async (habitId: string, date?: string) => {
    const d = date || format(new Date(), "yyyy-MM-dd");
    try {
      const res = await fetch(`/api/habits/${habitId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: d }),
      });
      if (res.ok) await fetchHabits();
    } catch (e) {
      console.error("Failed to toggle habit:", e);
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      if (res.ok) await fetchHabits();
    } catch (e) {
      console.error("Failed to delete habit:", e);
    }
  };

  return { habits: habitsWithStats, loading, createHabit, toggleHabit, deleteHabit, refetch: fetchHabits };
}

// Activity data types
export interface ClassifiedApp {
  appName: string;
  title: string;
  totalSeconds: number;
  category: string;
}

export interface ActivityDay {
  date: string;
  apps: ClassifiedApp[];
  byCategory: Record<string, number>;
  totalSeconds: number;
  awConnected: boolean;
}

export interface ActivityWeek {
  days: ActivityDay[];
  categories: Record<string, { label: string; color: string; emoji: string }>;
}

export interface ActivityRule {
  id: string;
  appName: string;
  category: string;
}

export function useActivity(mode: "day" | "week" = "day", date?: string) {
  const [data, setData] = useState<ActivityDay | ActivityWeek | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = mode === "week" ? "range=week" : `date=${date || format(new Date(), "yyyy-MM-dd")}`;
      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch (e) {
      console.error("Failed to fetch activity:", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [mode, date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useActivityRules() {
  const [rules, setRules] = useState<ActivityRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/activity/rules");
      if (!res.ok) throw new Error("Failed to fetch");
      setRules(await res.json());
    } catch (e) {
      console.error("Failed to fetch rules:", e);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (appName: string, category: string) => {
    try {
      const res = await fetch("/api/activity/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, category }),
      });
      if (res.ok) await fetchRules();
    } catch (e) {
      console.error("Failed to add rule:", e);
    }
  };

  const updateRule = async (id: string, data: { appName?: string; category?: string }) => {
    try {
      const res = await fetch(`/api/activity/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) await fetchRules();
    } catch (e) {
      console.error("Failed to update rule:", e);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/activity/rules/${id}`, { method: "DELETE" });
      if (res.ok) await fetchRules();
    } catch (e) {
      console.error("Failed to delete rule:", e);
    }
  };

  return { rules, loading, addRule, updateRule, deleteRule, refetch: fetchRules };
}
