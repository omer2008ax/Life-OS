"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-context";
import {
  Monitor,
  Smartphone,
  Laptop,
  Download,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

const AW_DOWNLOAD = "https://activitywatch.net/downloads/";
const AW_ANDROID = "https://play.google.com/store/apps/details?id=net.activitywatch.android";

export default function GuidePage() {
  const { t } = useSettings();

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            {t("ActivityWatch Setup", "התקנת ActivityWatch")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Track your screen time across all devices",
              "עקוב אחרי זמן המסך שלך בכל המכשירים"
            )}
          </p>
        </div>
      </div>

      {/* Quick Download */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Download className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {t("Quick Download", "הורדה מהירה")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Get ActivityWatch for your platform",
                  "הורד ActivityWatch לפלטפורמה שלך"
                )}
              </p>
            </div>
            <a href={AW_DOWNLOAD} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1">
                {t("Download", "הורדה")} <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* macOS Guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Laptop className="h-4 w-4" />
            {t("macOS Setup", "התקנה ב-macOS")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Step n={1}>
            {t(
              "Download ActivityWatch from the link above (macOS .dmg)",
              "הורד את ActivityWatch מהקישור למעלה (קובץ .dmg למאק)"
            )}
          </Step>
          <Step n={2}>
            {t(
              "Open the .dmg file and drag ActivityWatch to Applications",
              "פתח את קובץ ה-.dmg וגרור את ActivityWatch לתיקיית Applications"
            )}
          </Step>
          <Step n={3}>
            {t(
              "Open ActivityWatch from Applications",
              "פתח את ActivityWatch מתיקיית Applications"
            )}
          </Step>
          <Step n={4}>
            {t(
              'If macOS blocks it: Go to System Settings → Privacy & Security → click "Open Anyway"',
              'אם macOS חוסם: לך ל-System Settings → Privacy & Security → לחץ "Open Anyway"'
            )}
          </Step>
          <Step n={5}>
            {t(
              "Grant Accessibility permission when prompted (required for window tracking)",
              "תן הרשאת Accessibility כשתתבקש (נדרש למעקב חלונות)"
            )}
          </Step>
          <Step n={6}>
            {t(
              "ActivityWatch will run in the menu bar. Click the icon → Open Dashboard to verify",
              "ActivityWatch ירוץ בשורת התפריטים. לחץ על האייקון → Open Dashboard לאימות"
            )}
          </Step>
          <div className="pt-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            💡 {t(
              "Tip: Enable \"Launch at Login\" in AW settings so it starts automatically",
              'טיפ: הפעל "Launch at Login" בהגדרות AW כדי שיתחיל אוטומטית'
            )}
          </div>
        </CardContent>
      </Card>

      {/* Windows Guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {t("Windows Setup", "התקנה ב-Windows")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Step n={1}>
            {t(
              "Download the Windows installer (.exe) from the link above",
              "הורד את ההתקנה לוינדוס (.exe) מהקישור למעלה"
            )}
          </Step>
          <Step n={2}>
            {t(
              "Run the installer and follow the setup wizard",
              "הרץ את ההתקנה ועקוב אחרי האשף"
            )}
          </Step>
          <Step n={3}>
            {t(
              "ActivityWatch will start automatically and appear in the system tray",
              "ActivityWatch יתחיל אוטומטית ויופיע ב-system tray"
            )}
          </Step>
          <Step n={4}>
            {t(
              "Right-click the tray icon → Open Dashboard to verify it works",
              "לחץ ימני על האייקון ב-tray → Open Dashboard לוודא שזה עובד"
            )}
          </Step>
          <div className="pt-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            💡 {t(
              "Tip: If using Windows Firewall, allow ActivityWatch through when prompted",
              "טיפ: אם אתה משתמש ב-Windows Firewall, אפשר גישה ל-ActivityWatch כשתתבקש"
            )}
          </div>
        </CardContent>
      </Card>

      {/* Android Guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            {t("Android Setup", "התקנה באנדרואיד")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <Step n={1}>
            {t(
              "Install ActivityWatch from Google Play Store",
              "התקן ActivityWatch מ-Google Play Store"
            )}
          </Step>
          <a href={AW_ANDROID} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 my-1">
              Google Play <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
          <Step n={2}>
            {t(
              "Open the app and grant Usage Access permission",
              "פתח את האפליקציה ותן הרשאת Usage Access"
            )}
          </Step>
          <Step n={3}>
            {t(
              "The app tracks screen time locally on your phone",
              "האפליקציה עוקבת אחרי זמן מסך מקומית בטלפון שלך"
            )}
          </Step>
          <div className="pt-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            📱 {t(
              "Note: Android data syncs separately. Desktop data shows in Reality Dashboard when AW runs on the same machine as Life OS.",
              "הערה: נתוני אנדרואיד נשמרים בנפרד. נתוני מחשב מוצגים ב-Reality Dashboard כאשר AW רץ על אותו מחשב כמו Life OS."
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection to Life OS */}
      <Card className="border-green-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            {t("Connecting to Life OS", "חיבור ל-Life OS")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {t(
              "Life OS automatically connects to ActivityWatch running on the same computer (localhost:5600). No configuration needed!",
              "Life OS מתחבר אוטומטית ל-ActivityWatch שרץ על אותו מחשב (localhost:5600). לא צריך הגדרות!"
            )}
          </p>
          <p>
            {t(
              "Just make sure ActivityWatch is running, then check your Reality Dashboard.",
              "רק ודא ש-ActivityWatch רץ, ואז בדוק את ה-Reality Dashboard שלך."
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
