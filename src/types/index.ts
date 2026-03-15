export type Category = "fitness" | "learning" | "business" | "personal";
export type Priority = "high" | "medium" | "low";
export type TaskStatus = "pending" | "completed" | "skipped" | "postponed";

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  duration: number;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  tags: string;
  sortOrder: number;
  goalId: string | null;
  recurringTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: SubTask[];
}

export interface CreateTaskInput {
  title: string;
  date: string;
  startTime: string;
  duration: number;
  category: Category;
  priority: Priority;
  description?: string;
  tags?: string;
  goalId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  startTime?: string;
  duration?: number;
  category?: Category;
  priority?: Priority;
  status?: TaskStatus;
  tags?: string;
  sortOrder?: number;
  goalId?: string | null;
}

// Habits
export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  goalId: string | null;
  createdAt: string;
  updatedAt: string;
  completions: HabitCompletion[];
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}

export interface CreateHabitInput {
  name: string;
  icon?: string;
  color?: string;
  goalId?: string;
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  longestStreak: number;
  weeklyRate: number; // 0-7 days completed this week
  completedToday: boolean;
}

// Goals
export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Goal {
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
  tasks?: Task[];
  habits?: Habit[];
  milestones?: Milestone[];
}
