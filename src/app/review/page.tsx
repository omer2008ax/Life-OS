"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Zap,
  Brain,
  Heart,
  Flame,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Monitor,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface DayStats {
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  screenMinutes: number;
}

interface Review {
  id: string;
  date: string;
  mood: number;
  energyLevel: number;
  productivityScore: number;
  wins: string;
  struggles: string;
  tomorrowFocus: string;
  gratitude: string;
  notes: string;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  screenMinutes: number;
}

interface TrendPoint {
  date: string;
  mood: number;
  energyLevel: number;
  productivityScore: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  screenMinutes: number;
}

const MOOD_EMOJIS = ["😫", "😕", "😐", "🙂", "🔥"];

export default function ReviewPage() {
  const { t } = useSettings();
  const [date, setDate] = useState(new Date());
  const [review, setReview] = useState<Review | null>(null);
  const [stats, setStats] = useState<DayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<Review[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [activeView, setActiveView] = useState<"today" | "trends">("today");
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  // Form state
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [productivity, setProductivity] = useState(3);
  const [wins, setWins] = useState("");
  const [struggles, setStruggles] = useState("");
  const [tomorrowFocus, setTomorrowFocus] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [notes, setNotes] = useState("");

  const dateStr = format(date, "yyyy-MM-dd");
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  const ENERGY_LABELS_EN = ["Drained", "Low", "Okay", "Good", "Charged"];
  const ENERGY_LABELS_HE = ["מרוקן", "נמוכה", "סביר", "טובה", "מלא"];

  const fetchReview = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/review?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        if (data.review) {
          setReview(data.review);
          setMood(data.review.mood);
          setEnergy(data.review.energyLevel);
          setProductivity(data.review.productivityScore);
          setWins(data.review.wins);
          setStruggles(data.review.struggles);
          setTomorrowFocus(data.review.tomorrowFocus);
          setGratitude(data.review.gratitude);
          setNotes(data.review.notes);
        } else {
          setReview(null);
          setMood(3);
          setEnergy(3);
          setProductivity(3);
          setWins("");
          setStruggles("");
          setTomorrowFocus("");
          setGratitude("");
          setNotes("");
        }
      }
    } catch (e) {
      console.error("Failed to fetch review:", e);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/review?history=true");
      if (res.ok) setHistory(await res.json());
    } catch {
      // Silent
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch("/api/review?trends=true");
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends || []);
      }
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  useEffect(() => {
    fetchHistory();
    fetchTrends();
  }, [fetchHistory, fetchTrends]);

  const saveReview = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          mood,
          energyLevel: energy,
          productivityScore: productivity,
          wins,
          struggles,
          tomorrowFocus,
          gratitude,
          notes,
        }),
      });
      if (res.ok) {
        setSaved(true);
        fetchHistory();
        fetchTrends();
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save review:", e);
    } finally {
      setSaving(false);
    }
  };

  const goDay = (offset: number) => {
    setDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + offset);
      if (next > new Date()) return d;
      return next;
    });
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header with date nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            {t("Daily Review", "סיכום יומי")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isToday ? t("Today", "היום") : format(date, "EEEE")}, {format(date, "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => goDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setDate(new Date())}>
              {t("Today", "היום")}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => goDay(1)}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeView === "today" ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={() => setActiveView("today")}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t("Today", "היום")}
        </Button>
        <Button
          size="sm"
          variant={activeView === "trends" ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={() => setActiveView("trends")}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          {t("Trends", "מגמות")}
        </Button>
      </div>

      {activeView === "today" ? (
        /* ============ TODAY VIEW ============ */
        loading ? (
          <div className="text-center text-muted-foreground py-12">{t("Loading...", "טוען...")}</div>
        ) : (
          <>
            {/* Auto Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<Target className="h-4 w-4 text-green-400" />}
                  label={t("Tasks", "משימות")}
                  value={`${stats.tasksCompleted}/${stats.tasksTotal}`}
                />
                <StatCard
                  icon={<Flame className="h-4 w-4 text-orange-400" />}
                  label={t("Habits", "הרגלים")}
                  value={`${stats.habitsCompleted}/${stats.habitsTotal}`}
                />
                <StatCard
                  icon={<Monitor className="h-4 w-4 text-blue-400" />}
                  label={t("Screen", "מסך")}
                  value={stats.screenMinutes > 0 ? `${Math.round(stats.screenMinutes / 60)}${t("h", "ש")} ${stats.screenMinutes % 60}${t("m", "ד")}` : t("N/A", "אין")}
                />
              </div>
            )}

            {/* Mood */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" /> {t("How are you feeling?", "איך אתה מרגיש?")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  {MOOD_EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => setMood(i + 1)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        mood === i + 1
                          ? "bg-primary/20 scale-125"
                          : "opacity-40 hover:opacity-70"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Energy */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> {t("Energy Level", "רמת אנרגיה")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {ENERGY_LABELS_EN.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setEnergy(i + 1)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        energy === i + 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t(label, ENERGY_LABELS_HE[i])}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Productivity self-rating */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5" /> {t("Productivity (self-rate)", "פרודוקטיביות (דירוג עצמי)")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setProductivity(n)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        productivity === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Wins */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> {t("Wins — What went well?", "הצלחות — מה עבד טוב?")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  placeholder={t("I completed my workout, finished the project...", "סיימתי את האימון, השלמתי את הפרויקט...")}
                  className="w-full bg-transparent border border-border rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </CardContent>
            </Card>

            {/* Struggles */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t("Struggles — What was hard?", "אתגרים — מה היה קשה?")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={struggles}
                  onChange={(e) => setStruggles(e.target.value)}
                  placeholder={t("Got distracted, skipped reading time...", "הסחתי דעת, דילגתי על זמן קריאה...")}
                  className="w-full bg-transparent border border-border rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </CardContent>
            </Card>

            {/* Tomorrow's Focus */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" /> {t("Tomorrow's #1 Focus", "המטרה #1 למחר")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={tomorrowFocus}
                  onChange={(e) => setTomorrowFocus(e.target.value)}
                  placeholder={t("Finish the presentation, run 5km...", "לסיים את המצגת, לרוץ 5 ק״מ...")}
                  className="w-full bg-transparent border border-border rounded-lg p-3 text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </CardContent>
            </Card>

            {/* Gratitude */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" /> {t("Grateful for...", "אסיר תודה על...")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder={t("Good weather, productive morning, family...", "מזג אוויר טוב, בוקר פרודוקטיבי, משפחה...")}
                  className="w-full bg-transparent border border-border rounded-lg p-3 text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </CardContent>
            </Card>

            {/* Save */}
            <Button onClick={saveReview} disabled={saving} className="w-full h-12 text-base">
              {saving ? t("Saving...", "שומר...") : saved ? t("Saved!", "נשמר!") : review ? t("Update Review", "עדכן סיכום") : t("Save Review", "שמור סיכום")}
            </Button>

            {/* History */}
            {history.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t("Recent Reviews", "סיכומים אחרונים")}</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {history.map((r) => {
                    const isExpanded = expandedReview === r.id;
                    return (
                      <div
                        key={r.id}
                        className={`rounded-xl border transition-colors ${
                          r.date === dateStr
                            ? "border-primary/50 bg-primary/10"
                            : "border-border hover:border-foreground/20"
                        }`}
                      >
                        <button
                          onClick={() => setExpandedReview(isExpanded ? null : r.id)}
                          className="w-full text-left px-3.5 py-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{MOOD_EMOJIS[r.mood - 1]}</span>
                              <div>
                                <p className="text-sm font-medium">
                                  {format(new Date(r.date + "T12:00:00"), "EEE, MMM d")}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {t("Tasks", "משימות")} {r.tasksCompleted}/{r.tasksTotal} · {t("Habits", "הרגלים")} {r.habitsCompleted}/{r.habitsTotal}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Zap className="h-3 w-3" /> {r.energyLevel}
                              <Brain className="h-3 w-3 ml-1" /> {r.productivityScore}
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3.5 pb-3 space-y-2 border-t border-border/50 pt-2">
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-red-400" />
                                {t("Mood", "מצב רוח")}: {MOOD_EMOJIS[r.mood - 1]}
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-yellow-400" />
                                {t("Energy", "אנרגיה")}: {r.energyLevel}/5
                              </span>
                              <span className="flex items-center gap-1">
                                <Brain className="h-3 w-3 text-blue-400" />
                                {t("Productivity", "פרודוקטיביות")}: {r.productivityScore}/5
                              </span>
                            </div>
                            {r.wins && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <Trophy className="h-2.5 w-2.5" /> {t("Wins", "הצלחות")}
                                </p>
                                <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{r.wins}</p>
                              </div>
                            )}
                            {r.struggles && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5" /> {t("Struggles", "אתגרים")}
                                </p>
                                <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{r.struggles}</p>
                              </div>
                            )}
                            {r.tomorrowFocus && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <ArrowRight className="h-2.5 w-2.5" /> {t("Tomorrow's Focus", "מיקוד למחר")}
                                </p>
                                <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{r.tomorrowFocus}</p>
                              </div>
                            )}
                            {r.gratitude && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <Heart className="h-2.5 w-2.5" /> {t("Gratitude", "הכרת תודה")}
                                </p>
                                <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{r.gratitude}</p>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 mt-1"
                              onClick={() => {
                                const d = new Date(r.date + "T12:00:00");
                                setDate(d);
                                setActiveView("today");
                              }}
                            >
                              {t("Edit this review", "ערוך סיכום זה")}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )
      ) : (
        /* ============ TRENDS VIEW ============ */
        <TrendsView trends={trends} t={t} />
      )}
    </div>
  );
}

/* ============ STAT CARD ============ */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3 px-3 flex flex-col items-center gap-1">
        {icon}
        <span className="text-lg font-bold">{value}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

/* ============ TRENDS VIEW ============ */
function TrendsView({
  trends,
  t,
}: {
  trends: TrendPoint[];
  t: (en: string, he: string) => string;
}) {
  if (trends.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        {t("No trend data yet. Save some daily reviews to see trends.", "אין נתוני מגמות עדיין. שמור סיכומים יומיים כדי לראות מגמות.")}
      </div>
    );
  }

  const moodData = trends.map((p) => ({ date: p.date, value: p.mood }));
  const energyData = trends.map((p) => ({ date: p.date, value: p.energyLevel }));
  const prodData = trends.map((p) => ({ date: p.date, value: p.productivityScore }));
  const completionData = trends.map((p) => ({
    date: p.date,
    taskPct: p.tasksTotal > 0 ? Math.round((p.tasksCompleted / p.tasksTotal) * 100) : 0,
    habitPct: p.habitsTotal > 0 ? Math.round((p.habitsCompleted / p.habitsTotal) * 100) : 0,
  }));

  const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "0";
  const moodAvg = avg(moodData.map((d) => d.value));
  const energyAvg = avg(energyData.map((d) => d.value));
  const prodAvg = avg(prodData.map((d) => d.value));

  return (
    <div className="space-y-5">
      {/* Mood Trend */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5" /> {t("Mood Trend", "מגמת מצב רוח")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendLineChart data={moodData} color="hsl(var(--primary))" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{t("Avg", "ממוצע")}: {moodAvg} {MOOD_EMOJIS[Math.round(Number(moodAvg)) - 1] || ""}</span>
            <span>{trends.length} {t("days", "ימים")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Energy Trend */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> {t("Energy Trend", "מגמת אנרגיה")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendLineChart data={energyData} color="#facc15" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{t("Avg", "ממוצע")}: {energyAvg}/5</span>
            <span>{trends.length} {t("days", "ימים")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Productivity Trend */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" /> {t("Productivity Trend", "מגמת פרודוקטיביות")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendLineChart data={prodData} color="#60a5fa" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{t("Avg", "ממוצע")}: {prodAvg}/5</span>
            <span>{trends.length} {t("days", "ימים")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Completion Bar Chart */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> {t("Completion Rate", "אחוז השלמה")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompletionBarChart data={completionData} t={t} />
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-400" />
              {t("Tasks", "משימות")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-400" />
              {t("Habits", "הרגלים")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============ SVG LINE CHART ============ */
function TrendLineChart({
  data,
  color,
}: {
  data: { date: string; value: number }[];
  color: string;
}) {
  if (data.length === 0) return null;

  const width = 320;
  const height = 120;
  const pad = { top: 12, right: 8, bottom: 24, left: 28 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const minVal = 1;
  const maxVal = 5;

  const points = data.map((d, i) => ({
    x: pad.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: pad.top + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH,
    date: d.date,
    value: d.value,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Show every Nth date label so they don't overlap
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Y-axis grid lines */}
      {[1, 2, 3, 4, 5].map((v) => {
        const y = pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
        return (
          <g key={v}>
            <line
              x1={pad.left}
              y1={y}
              x2={width - pad.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={0.5}
            />
            <text
              x={pad.left - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={8}
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Area fill */}
      <path
        d={`${pathD} L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`}
        fill={color}
        fillOpacity={0.08}
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 4 : 2}
          fill={color}
          stroke={i === points.length - 1 ? "var(--background, #fff)" : "none"}
          strokeWidth={i === points.length - 1 ? 1.5 : 0}
        />
      ))}

      {/* X-axis date labels */}
      {points.map((p, i) =>
        i % labelEvery === 0 || i === points.length - 1 ? (
          <text
            key={i}
            x={p.x}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={7}
          >
            {formatShortDate(p.date)}
          </text>
        ) : null
      )}
    </svg>
  );
}

/* ============ BAR CHART ============ */
function CompletionBarChart({
  data,
  t,
}: {
  data: { date: string; taskPct: number; habitPct: number }[];
  t: (en: string, he: string) => string;
}) {
  if (data.length === 0) return null;

  const width = 320;
  const height = 120;
  const pad = { top: 8, right: 8, bottom: 24, left: 28 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const barGroupWidth = chartW / data.length;
  const barWidth = Math.max(2, barGroupWidth * 0.35);
  const gap = Math.max(1, barGroupWidth * 0.05);

  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Y-axis grid */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = pad.top + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line
              x1={pad.left}
              y1={y}
              x2={width - pad.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={0.5}
            />
            <text x={pad.left - 4} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={7}>
              {v}%
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = pad.left + i * barGroupWidth + barGroupWidth / 2;
        const taskH = (d.taskPct / 100) * chartH;
        const habitH = (d.habitPct / 100) * chartH;
        return (
          <g key={i}>
            <rect
              x={x - barWidth - gap / 2}
              y={pad.top + chartH - taskH}
              width={barWidth}
              height={taskH}
              rx={1}
              fill="#4ade80"
              fillOpacity={0.8}
            />
            <rect
              x={x + gap / 2}
              y={pad.top + chartH - habitH}
              width={barWidth}
              height={habitH}
              rx={1}
              fill="#fb923c"
              fillOpacity={0.8}
            />
            {(i % labelEvery === 0 || i === data.length - 1) && (
              <text
                x={x}
                y={height - 4}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={7}
              >
                {formatShortDate(d.date)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ============ HELPERS ============ */
function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
