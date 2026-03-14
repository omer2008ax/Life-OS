"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSettings, THEMES, type Language, type ThemeName } from "@/lib/settings-context";
import {
  getNotificationSettings,
  saveNotificationSettings,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  type NotificationSettings,
} from "@/lib/notifications";
import {
  Settings,
  Globe,
  Palette,
  Check,
  Download,
  Database,
  Loader2,
  HardDrive,
  Bell,
  BellOff,
} from "lucide-react";

interface Backup {
  name: string;
  size: number;
  created: string;
}

export default function SettingsPage() {
  const { language, theme, setLanguage, setTheme, t } = useSettings();
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setBrowserPermission(getBrowserNotificationPermission());
  }, []);

  const updateNotifSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleRequestBrowserPermission = async () => {
    const result = await requestBrowserNotificationPermission();
    setBrowserPermission(result);
    if (result === "granted") {
      updateNotifSetting("browserNotifications", true);
    }
  };

  const exportData = (type: string) => {
    window.open(`/api/export?type=${type}`, "_blank");
  };

  const createBackup = async () => {
    setBackingUp(true);
    setBackupMsg("");
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setBackupMsg(t("Backup created!", "גיבוי נוצר!"));
        fetchBackups();
      } else {
        setBackupMsg(t("Backup failed", "הגיבוי נכשל"));
      }
    } catch {
      setBackupMsg(t("Backup failed", "הגיבוי נכשל"));
    } finally {
      setBackingUp(false);
      setTimeout(() => setBackupMsg(""), 3000);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/backup");
      if (res.ok) setBackups(await res.json());
    } catch { /* silent */ }
  };

  const toggleBackups = () => {
    if (!showBackups) fetchBackups();
    setShowBackups(!showBackups);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          {t("Settings", "הגדרות")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Customize your Life OS experience", "התאם את חוויית Life OS שלך")}
        </p>
      </div>

      {/* Language / RTL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Globe className="h-4 w-4" />
            {t("Language", "שפה")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            {t(
              "Switch between English (LTR) and Hebrew (RTL)",
              "החלף בין אנגלית (LTR) לעברית (RTL)"
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "en" as Language, label: "English", flag: "🇺🇸" },
              { value: "he" as Language, label: "עברית", flag: "🇮🇱" },
            ]).map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  language === lang.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border hover:border-foreground/30 text-muted-foreground"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.label}
                {language === lang.value && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Palette className="h-4 w-4" />
            {t("Theme", "ערכת נושא")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(THEMES) as [ThemeName, typeof THEMES[ThemeName]][]).map(
              ([key, themeInfo]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`relative rounded-xl border overflow-hidden transition-all ${
                    theme === key
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div
                    className="h-16 w-full flex items-end p-2 gap-1"
                    style={{ backgroundColor: themeInfo.colors["--background"] }}
                  >
                    <div className="h-6 w-6 rounded-md" style={{ backgroundColor: themeInfo.colors["--primary"] }} />
                    <div className="h-4 flex-1 rounded-md" style={{ backgroundColor: themeInfo.colors["--card"] }} />
                    <div className="h-4 w-8 rounded-md" style={{ backgroundColor: themeInfo.colors["--accent"] }} />
                  </div>
                  <div className="px-2 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {language === "he" ? themeInfo.labelHe : themeInfo.label}
                    </span>
                    {theme === key && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Bell className="h-4 w-4" />
            {t("Notifications", "התראות")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {t(
              "Configure which notifications you receive and when",
              "הגדר אילו התראות תקבל ומתי"
            )}
          </p>

          {/* Master toggle */}
          <ToggleRow
            label={t("Enable Notifications", "הפעל התראות")}
            checked={notifSettings.enabled}
            onChange={(v) => updateNotifSetting("enabled", v)}
          />

          {notifSettings.enabled && (
            <div className="space-y-3 pt-1">
              {/* Browser Notifications */}
              <div className="space-y-2">
                <ToggleRow
                  label={t("Browser Notifications", "התראות דפדפן")}
                  subtitle={
                    browserPermission === "unsupported"
                      ? t("Not supported in this browser", "לא נתמך בדפדפן זה")
                      : browserPermission === "denied"
                      ? t("Blocked - enable in browser settings", "חסום - הפעל בהגדרות הדפדפן")
                      : undefined
                  }
                  checked={notifSettings.browserNotifications}
                  onChange={(v) => {
                    if (v && browserPermission !== "granted") {
                      handleRequestBrowserPermission();
                    } else {
                      updateNotifSetting("browserNotifications", v);
                    }
                  }}
                  disabled={browserPermission === "unsupported" || browserPermission === "denied"}
                />
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <ToggleRow
                  label={t("Task Reminders", "תזכורות משימות")}
                  subtitle={t("10 min before task starts", "10 דקות לפני תחילת משימה")}
                  checked={notifSettings.taskReminders}
                  onChange={(v) => updateNotifSetting("taskReminders", v)}
                />
                <ToggleRow
                  label={t("Missed Task Alerts", "התראות משימות שפוספסו")}
                  subtitle={t("When a task's time has passed", "כשזמן המשימה עבר")}
                  checked={notifSettings.missedTaskAlerts}
                  onChange={(v) => updateNotifSetting("missedTaskAlerts", v)}
                />
                <ToggleRow
                  label={t("Habit Reminders", "תזכורות הרגלים")}
                  checked={notifSettings.habitReminders}
                  onChange={(v) => updateNotifSetting("habitReminders", v)}
                />
                {notifSettings.habitReminders && (
                  <TimeInput
                    label={t("Habit reminder time", "שעת תזכורת הרגלים")}
                    value={notifSettings.habitReminderTime}
                    onChange={(v) => updateNotifSetting("habitReminderTime", v)}
                  />
                )}
                <ToggleRow
                  label={t("Gaming Alerts", "התראות משחקים")}
                  subtitle={t(`After ${notifSettings.gamingAlertMinutes} min of gaming`, `אחרי ${notifSettings.gamingAlertMinutes} דקות משחקים`)}
                  checked={notifSettings.gamingAlerts}
                  onChange={(v) => updateNotifSetting("gamingAlerts", v)}
                />
                {notifSettings.gamingAlerts && (
                  <div className="flex items-center gap-2 ps-1">
                    <label className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {t("Alert after (min):", "התראה אחרי (דק'):")}
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={180}
                      step={15}
                      value={notifSettings.gamingAlertMinutes}
                      onChange={(e) => updateNotifSetting("gamingAlertMinutes", parseInt(e.target.value, 10) || 45)}
                      className="w-16 text-xs px-2 py-1 rounded-md bg-muted border border-border text-foreground"
                    />
                  </div>
                )}
                <ToggleRow
                  label={t("Social Media Alerts", "התראות רשתות חברתיות")}
                  subtitle={t("After 60 min on social media", "אחרי 60 דקות ברשתות חברתיות")}
                  checked={notifSettings.socialMediaAlerts}
                  onChange={(v) => updateNotifSetting("socialMediaAlerts", v)}
                />
                <ToggleRow
                  label={t("Distraction Detection", "זיהוי הסחות דעת")}
                  subtitle={t("Alerts when off-task during scheduled tasks", "התראות כשסוטים מהמשימה המתוכננת")}
                  checked={notifSettings.distractionDetection}
                  onChange={(v) => updateNotifSetting("distractionDetection", v)}
                />
                <ToggleRow
                  label={t("Daily Review Prompt", "תזכורת סיכום יומי")}
                  checked={notifSettings.dailyReviewPrompt}
                  onChange={(v) => updateNotifSetting("dailyReviewPrompt", v)}
                />
                {notifSettings.dailyReviewPrompt && (
                  <TimeInput
                    label={t("Review prompt time", "שעת תזכורת סיכום")}
                    value={notifSettings.dailyReviewTime}
                    onChange={(v) => updateNotifSetting("dailyReviewTime", v)}
                  />
                )}
              </div>
            </div>
          )}

          {!notifSettings.enabled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <BellOff className="h-3.5 w-3.5" />
              {t("All notifications are disabled", "כל ההתראות מושבתות")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            {t("Export Data", "ייצוא נתונים")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            {t("Download your data as CSV files", "הורד את הנתונים שלך כקבצי CSV")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportData("all")}>
              <Download className="h-3.5 w-3.5" />
              {t("Export All", "ייצא הכל")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportData("tasks")}>
              {t("Tasks Only", "משימות בלבד")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportData("habits")}>
              {t("Habits Only", "הרגלים בלבד")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportData("reviews")}>
              {t("Reviews Only", "סיכומים בלבד")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Database className="h-4 w-4" />
            {t("Database Backup", "גיבוי מסד נתונים")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            {t(
              "Create a backup of your entire database. Keeps last 7 backups.",
              "צור גיבוי של כל מסד הנתונים. שומר 7 גיבויים אחרונים."
            )}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={createBackup}
              disabled={backingUp}
            >
              {backingUp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HardDrive className="h-3.5 w-3.5" />
              )}
              {backingUp
                ? t("Backing up...", "מגבה...")
                : backupMsg || t("Backup Now", "גבה עכשיו")}
            </Button>
            <Button variant="outline" size="sm" onClick={toggleBackups}>
              {t("View Backups", "צפה בגיבויים")}
            </Button>
          </div>
          {showBackups && (
            <div className="mt-3 space-y-1.5">
              {backups.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("No backups yet", "אין גיבויים עדיין")}
                </p>
              )}
              {backups.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-muted/30"
                >
                  <span className="text-muted-foreground truncate">{b.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap ml-2">{formatSize(b.size)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ActivityWatch Guide Link */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => (window.location.href = "/guide")}
          >
            {t("ActivityWatch Setup Guide", "מדריך התקנת ActivityWatch")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Reusable sub-components for notification settings ---

function ToggleRow({
  label,
  subtitle,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  subtitle?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-primary" : "bg-muted"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 ps-1">
      <label className="text-[11px] text-muted-foreground whitespace-nowrap">
        {label}:
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs px-2 py-1 rounded-md bg-muted border border-border text-foreground"
      />
    </div>
  );
}
