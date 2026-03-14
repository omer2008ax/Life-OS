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
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Category, Priority, CreateTaskInput } from "@/types";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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

    setTitle("");
    setStartTime("09:00");
    setDuration("30");
    setCategory("business");
    setPriority("medium");
    setDescription("");
    setTags("");
    setShowMore(false);
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
