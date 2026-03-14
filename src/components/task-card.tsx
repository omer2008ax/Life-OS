"use client";

import { useState, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { Task, SubTask, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  SkipForward,
  Clock,
  GripVertical,
  Trash2,
  Copy,
  X,
  CheckCircle2,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, addDays } from "date-fns";

const categoryColors: Record<string, string> = {
  fitness: "bg-green-500/20 text-green-400 border-green-500/30",
  learning: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  business: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  personal: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const categoryTranslations: Record<string, [string, string]> = {
  fitness: ["Fitness", "כושר"],
  learning: ["Learning", "למידה"],
  business: ["Business", "עסקים"],
  personal: ["Personal", "אישי"],
};

const priorityIndicator: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-yellow-500",
  low: "border-l-muted-foreground",
};

interface TaskCardProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
  onCopyToDate?: (task: Task, date: string) => Promise<boolean>;
  onTaskUpdated?: () => void;
}

const addSubtask = async (taskId: string, title: string) => {
  await fetch(`/api/tasks/${taskId}/subtasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
};

const toggleSubtask = async (subtaskId: string) => {
  await fetch(`/api/subtasks/${subtaskId}/toggle`, { method: "POST" });
};

export function TaskCard({ task, onStatusChange, onDelete, onCopyToDate, onTaskUpdated }: TaskCardProps) {
  const { t } = useSettings();
  const [showCopyPicker, setShowCopyPicker] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState<SubTask[]>(task.subtasks ?? []);
  const [addingSubtask, setAddingSubtask] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = task.status === "completed";
  const isSkipped = task.status === "skipped";
  const isPostponed = task.status === "postponed";
  const isInactive = isDone || isSkipped;

  // Sync local subtasks when task prop changes
  if (task.subtasks && task.subtasks !== localSubtasks && JSON.stringify(task.subtasks) !== JSON.stringify(localSubtasks)) {
    setLocalSubtasks(task.subtasks);
  }

  const handleCopy = async (targetDate: string) => {
    if (!onCopyToDate) return;
    const ok = await onCopyToDate(task, targetDate);
    if (ok) {
      setCopySuccess(targetDate);
      setTimeout(() => {
        setCopySuccess(null);
        setShowCopyPicker(false);
      }, 1500);
    }
  };

  const handleAddSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      await addSubtask(task.id, newSubtaskTitle.trim());
      // Optimistic update
      const newSub: SubTask = {
        id: `temp-${Date.now()}`,
        taskId: task.id,
        title: newSubtaskTitle.trim(),
        completed: false,
        sortOrder: localSubtasks.length,
      };
      setLocalSubtasks((prev) => [...prev, newSub]);
      setNewSubtaskTitle("");
      onTaskUpdated?.();
    } finally {
      setAddingSubtask(false);
    }
  }, [newSubtaskTitle, task.id, localSubtasks.length, onTaskUpdated]);

  const handleToggleSubtask = useCallback(async (subtask: SubTask) => {
    // Optimistic toggle
    setLocalSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtask.id ? { ...s, completed: !s.completed } : s
      )
    );
    await toggleSubtask(subtask.id);
    onTaskUpdated?.();
  }, [onTaskUpdated]);

  // Parse tags
  const tagList = task.tags
    ? task.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];

  // Subtask progress
  const subtaskCount = localSubtasks.length;
  const subtaskCompleted = localSubtasks.filter((s) => s.completed).length;

  // Generate quick-pick dates: tomorrow, +2, +3, +7, custom
  const quickDates = [
    { label: t("Tomorrow", "מחר"), date: format(addDays(new Date(), 1), "yyyy-MM-dd"), short: format(addDays(new Date(), 1), "EEE") },
    { label: t("+2 days", "+2 ימים"), date: format(addDays(new Date(), 2), "yyyy-MM-dd"), short: format(addDays(new Date(), 2), "EEE") },
    { label: t("+3 days", "+3 ימים"), date: format(addDays(new Date(), 3), "yyyy-MM-dd"), short: format(addDays(new Date(), 3), "EEE") },
    { label: t("Next week", "שבוע הבא"), date: format(addDays(new Date(), 7), "yyyy-MM-dd"), short: format(addDays(new Date(), 7), "M/d") },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-l-4 transition-all ${
        priorityIndicator[task.priority]
      } ${isDragging ? "opacity-50" : ""} ${
        isInactive ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          className="touch-none text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`font-medium text-sm ${isDone ? "line-through" : ""}`}
            >
              {task.title}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${categoryColors[task.category]}`}
            >
              {categoryTranslations[task.category] ? t(categoryTranslations[task.category][0], categoryTranslations[task.category][1]) : task.category}
            </Badge>
            {tagList.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-muted-foreground/20"
              >
                {tag}
              </Badge>
            ))}
          </div>
          {/* Description preview (collapsed) */}
          {!expanded && task.description && (
            <p className="text-xs text-muted-foreground truncate">
              {task.description.length > 60
                ? task.description.slice(0, 60) + "..."
                : task.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{task.startTime}</span>
            <span>&middot;</span>
            <span>{task.duration}{t("m", "ד")}</span>
            {isPostponed && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {t("postponed", "נדחה")}
              </Badge>
            )}
            {/* Subtask progress indicator */}
            {subtaskCount > 0 && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <span>
                    {subtaskCompleted}/{subtaskCount} {t("subtasks", "משימות משנה")}
                  </span>
                  <span className="inline-block w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <span
                      className="block h-full bg-green-500 rounded-full transition-all"
                      style={{
                        width: `${(subtaskCompleted / subtaskCount) * 100}%`,
                      }}
                    />
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Expand/collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? t("Collapse", "כווץ") : t("Expand", "הרחב")}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          {!isDone && !isSkipped && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                onClick={() => onStatusChange("completed")}
                title={t("Complete", "סיים")}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                onClick={() => onStatusChange("postponed")}
                title={t("Postpone", "דחה")}
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => onStatusChange("skipped")}
                title={t("Skip", "דלג")}
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {(isDone || isSkipped) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onStatusChange("pending")}
              title={t("Undo", "בטל")}
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
          )}
          {onCopyToDate && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${showCopyPicker ? "text-primary" : "text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"}`}
              onClick={() => setShowCopyPicker(!showCopyPicker)}
              title={t("Copy to another day", "העתק ליום אחר")}
            >
              {showCopyPicker ? <X className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title={t("Delete", "מחק")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Copy to date picker */}
      {showCopyPicker && (
        <div className="px-3 pb-3 pt-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{t("Copy to:", "העתק ל:")}</span>
            {quickDates.map((qd) => (
              <button
                key={qd.date}
                onClick={() => handleCopy(qd.date)}
                disabled={copySuccess !== null}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  copySuccess === qd.date
                    ? "bg-green-500/20 text-green-400"
                    : "bg-muted/60 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                }`}
              >
                {copySuccess === qd.date ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {t("Copied!", "הועתק!")}</span>
                ) : (
                  qd.short
                )}
              </button>
            ))}
            <input
              type="date"
              min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
              className="px-2 py-1 rounded-md text-[11px] bg-muted/60 text-muted-foreground border-none focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => {
                if (e.target.value) handleCopy(e.target.value);
              }}
            />
          </div>
        </div>
      )}

      {/* Expanded area: full description + subtasks */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50 mt-0">
          {/* Full description */}
          {task.description && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Subtasks */}
          <div className="pt-1 space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("Subtasks", "משימות משנה")}
            </span>
            {localSubtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSubtask(subtask)}
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    subtask.completed
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "border-muted-foreground/40 hover:border-foreground"
                  }`}
                >
                  {subtask.completed && <Check className="h-3 w-3" />}
                </button>
                <span
                  className={`text-xs ${
                    subtask.completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {subtask.title}
                </span>
              </div>
            ))}
            {/* Add subtask inline */}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder={t("Add subtask...", "הוסף משימת משנה...")}
                className="h-6 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleAddSubtask}
                disabled={addingSubtask || !newSubtaskTitle.trim()}
                title={t("Add subtask", "הוסף משימת משנה")}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
