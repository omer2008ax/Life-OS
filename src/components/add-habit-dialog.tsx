"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { CreateHabitInput } from "@/types";

const COLORS = [
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface AddHabitDialogProps {
  onAdd: (input: CreateHabitInput) => Promise<void>;
}

export function AddHabitDialog({ onAdd }: AddHabitDialogProps) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), color });
    setName("");
    setColor(COLORS[0]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="gap-1.5" />}
      >
        <Plus className="h-4 w-4" />
        {t("Add Habit", "הוסף הרגל")}
      </DialogTrigger>
      <DialogContent className="max-w-[350px]">
        <DialogHeader>
          <DialogTitle>{t("New Habit", "הרגל חדש")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{t("Habit Name", "שם ההרגל")}</Label>
            <Input
              placeholder={t("e.g. Exercise, Read, Meditate", "למשל: התעמלות, קריאה, מדיטציה")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("Color", "צבע")}</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!name.trim()}>
            {t("Create Habit", "צור הרגל")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
