// ActivityWatch local API integration
// Docs: https://docs.activitywatch.net/en/latest/api.html

const AW_BASE = "http://localhost:5600/api/0";

export interface AWEvent {
  id?: number;
  timestamp: string;
  duration: number; // seconds
  data: Record<string, string>;
}

export interface AWBucket {
  id: string;
  type: string;
  hostname: string;
  created: string;
}

export async function fetchBuckets(): Promise<AWBucket[]> {
  try {
    const res = await fetch(`${AW_BASE}/buckets`, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Object.values(data) as AWBucket[];
  } catch {
    return [];
  }
}

// Find the main window-watcher bucket
export async function getWindowBucketId(): Promise<string | null> {
  const buckets = await fetchBuckets();
  const windowBucket = buckets.find(
    (b) => b.type === "currentwindow" || b.id.startsWith("aw-watcher-window")
  );
  return windowBucket?.id ?? null;
}

// Fetch events from a bucket for a given date range
export async function fetchEvents(
  bucketId: string,
  start: string, // ISO date
  end: string    // ISO date
): Promise<AWEvent[]> {
  try {
    const params = new URLSearchParams({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      limit: "-1",
    });
    const res = await fetch(`${AW_BASE}/buckets/${bucketId}/events?${params}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Aggregate events by app name for a date
export interface AppUsage {
  appName: string;
  title: string; // most common title
  totalSeconds: number;
}

export function aggregateByApp(events: AWEvent[]): AppUsage[] {
  const appMap = new Map<string, { totalSeconds: number; titles: Map<string, number> }>();

  for (const event of events) {
    const app = event.data.app || event.data.appname || "Unknown";
    const title = event.data.title || "";

    if (!appMap.has(app)) {
      appMap.set(app, { totalSeconds: 0, titles: new Map() });
    }
    const entry = appMap.get(app)!;
    entry.totalSeconds += event.duration;
    entry.titles.set(title, (entry.titles.get(title) || 0) + event.duration);
  }

  return Array.from(appMap.entries())
    .map(([appName, { totalSeconds, titles }]) => {
      // Find most used title
      let maxTitle = "";
      let maxDuration = 0;
      for (const [t, d] of titles) {
        if (d > maxDuration) {
          maxTitle = t;
          maxDuration = d;
        }
      }
      return { appName, title: maxTitle, totalSeconds };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

// Default classification rules
export const DEFAULT_RULES: { appName: string; category: string }[] = [
  // Gaming
  { appName: "Fortnite", category: "gaming" },
  { appName: "Rocket League", category: "gaming" },
  { appName: "Steam", category: "gaming" },
  { appName: "Epic Games", category: "gaming" },
  { appName: "Minecraft", category: "gaming" },
  // Productive
  { appName: "Code", category: "productive" },
  { appName: "Visual Studio Code", category: "productive" },
  { appName: "Cursor", category: "productive" },
  { appName: "Terminal", category: "productive" },
  { appName: "iTerm2", category: "productive" },
  { appName: "Notion", category: "productive" },
  { appName: "Figma", category: "productive" },
  { appName: "Xcode", category: "productive" },
  // Learning
  { appName: "Udemy", category: "learning" },
  { appName: "Coursera", category: "learning" },
  // Social Media
  { appName: "Instagram", category: "social_media" },
  { appName: "TikTok", category: "social_media" },
  { appName: "Twitter", category: "social_media" },
  { appName: "Facebook", category: "social_media" },
  { appName: "Reddit", category: "social_media" },
  // Social
  { appName: "Discord", category: "social" },
  { appName: "WhatsApp", category: "social" },
  { appName: "Telegram", category: "social" },
  { appName: "Messages", category: "social" },
  { appName: "Slack", category: "social" },
  // Neutral
  { appName: "YouTube", category: "neutral" },
  { appName: "Safari", category: "neutral" },
  { appName: "Google Chrome", category: "neutral" },
  { appName: "Firefox", category: "neutral" },
  { appName: "Finder", category: "neutral" },
];

export const CATEGORY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  productive: { label: "Productive", color: "#10b981", emoji: "💻" },
  learning: { label: "Learning", color: "#3b82f6", emoji: "📚" },
  gaming: { label: "Gaming", color: "#ef4444", emoji: "🎮" },
  social_media: { label: "Social Media", color: "#f97316", emoji: "📱" },
  social: { label: "Social", color: "#8b5cf6", emoji: "💬" },
  neutral: { label: "Neutral", color: "#6b7280", emoji: "🔘" },
  uncategorized: { label: "Other", color: "#374151", emoji: "❓" },
};
