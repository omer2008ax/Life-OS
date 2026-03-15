"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import { Category, Priority, CreateTaskInput } from "@/types";

// Quick-fill presets sorted alphabetically in Hebrew
const PRESETS: { label: string; category: Category; duration: number; time?: string }[] = [
{ label: "איסוף משלוח", category: "personal", duration: 30 },
  { label: "אימון", category: "fitness", duration: 60 },
  { label: "בר מצווה", category: "personal", duration: 180 },
  { label: "בת מצווה", category: "personal", duration: 180 },
  { label: "ברית", category: "personal", duration: 120 },
  { label: "דדליין", category: "business", duration: 60 },
  { label: "הגשת עבודה", category: "learning", duration: 30 },
  { label: "הפסקת צהריים", category: "personal", duration: 60, time: "12:00" },
  { label: "חג", category: "personal", duration: 480 },
  { label: "חדר כושר", category: "fitness", duration: 90 },
  { label: "חתונה", category: "personal", duration: 240 },
  { label: "טיול", category: "personal", duration: 480 },
  { label: "טיסה", category: "personal", duration: 180 },
  { label: "יום הולדת", category: "personal", duration: 180 },
  { label: "ישיבה", category: "business", duration: 60 },
  { label: "משמרת", category: "business", duration: 480 },
  { label: "עבודה", category: "business", duration: 480, time: "09:00" },
  { label: "קורס", category: "learning", duration: 90 },
  { label: "שעת קימה", category: "personal", duration: 15, time: "07:00" },
  { label: "שעת שינה", category: "personal", duration: 15, time: "23:00" },
  { label: "תיקון", category: "personal", duration: 60 },
];

interface AddTaskDialogProps {
  onAdd: (input: CreateTaskInput) => Promise<void>;
  defaultDate: string;
}

export function AddTaskDialog({ onAdd, defaultDate }: AddTaskDialogProps) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [category, setCategory] = useState<Category>("business");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [dayOfMonth, setDayOfMonth] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isRecurring) {
      await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startTime,
          duration: Number(duration),
          category,
          priority,
          tags: tags.trim(),
          frequency,
          daysOfWeek: frequency === "weekly" ? daysOfWeek.join(",") : "",
          dayOfMonth: frequency === "monthly" ? dayOfMonth : null,
        }),
      });
    } else {
      await onAdd({
        title: title.trim(),
        date: defaultDate,
        startTime,
        duration: Number(duration),
        category,
        priority,
        description: description.trim() || undefined,
        tags: tags.trim() || undefined,
      });
    }

    setTitle("");
    setStartTime("09:00");
    setDuration("30");
    setCategory("business");
    setPriority("medium");
    setDescription("");
    setTags("");
    setShowMore(false);
    setIsRecurring(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" className="gap-1.5" />}
      >
        <Plus className="h-4 w-4" />
        {t("Add Task", "הוסף משימה")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("New Task", "משימה חדשה")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick-fill presets */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("Quick fill", "מילוי מהיר")}</Label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTitle(preset.label);
                    setCategory(preset.category);
                    setDuration(String(preset.duration));
                    if (preset.time) setStartTime(preset.time);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    title === preset.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t("Title", "כותרת")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("What needs to be done?", "מה צריך לעשות?")}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">{t("Start Time", "שעת התחלה")}</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">{t("Duration (min)", "משך (דקות)")}</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t("Category", "קטגוריה")}</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="fitness">{t("Fitness", "כושר")}</option>
                <option value="learning">{t("Learning", "למידה")}</option>
                <option value="business">{t("Business", "עסקים")}</option>
                <option value="personal">{t("Personal", "אישי")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">{t("Priority", "עדיפות")}</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="high">{t("High", "גבוהה")}</option>
                <option value="medium">{t("Medium", "בינונית")}</option>
                <option value="low">{t("Low", "נמוכה")}</option>
              </select>
            </div>
          </div>

          {/* More options toggle */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMore ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {t("More options", "אפשרויות נוספות")}
          </button>

          {showMore && (
            <div className="space-y-4">
              {/* Recurring toggle */}
              <div className="flex items-center justify-between">
                <Label>{t("Recurring Task", "משימה חוזרת")}</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRecurring}
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    isRecurring ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    isRecurring ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {isRecurring && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("Frequency", "תדירות")}</Label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                      className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    >
                      <option value="daily">{t("Daily", "יומי")}</option>
                      <option value="weekly">{t("Weekly", "שבועי")}</option>
                      <option value="monthly">{t("Monthly", "חודשי")}</option>
                    </select>
                  </div>

                  {frequency === "weekly" && (
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Days", "ימים")}</Label>
                      <div className="flex gap-1">
                        {[
                          { val: 0, label: t("S", "א") },
                          { val: 1, label: t("M", "ב") },
                          { val: 2, label: t("T", "ג") },
                          { val: 3, label: t("W", "ד") },
                          { val: 4, label: t("T", "ה") },
                          { val: 5, label: t("F", "ו") },
                          { val: 6, label: t("S", "ש") },
                        ].map(({ val, label }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setDaysOfWeek((prev) =>
                                prev.includes(val)
                                  ? prev.filter((d) => d !== val)
                                  : [...prev, val]
                              )
                            }
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                              daysOfWeek.includes(val)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {frequency === "monthly" && (
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Day of month", "יום בחודש")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">{t("Notes", "הערות")}</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("Add details...", "הוסף פרטים...")}
                  rows={3}
                  className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">{t("Tags", "תגיות")}</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t("work, urgent, meeting...", "עבודה, דחוף, פגישה...")}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            {t("Add Task", "הוסף משימה")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
