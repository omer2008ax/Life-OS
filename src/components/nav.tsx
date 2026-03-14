"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Flame, Monitor, Flag, Sparkles, Settings, BarChart3 } from "lucide-react";
import { useSettings } from "@/lib/settings-context";

export function Nav() {
  const pathname = usePathname();
  const { t } = useSettings();

  const links = [
    { href: "/", label: t("Home", "בית"), icon: LayoutDashboard },
    { href: "/schedule", label: t("Schedule", "לו״ז"), icon: Calendar },
    { href: "/habits", label: t("Habits", "הרגלים"), icon: Flame },
    { href: "/reality", label: t("Reality", "מציאות"), icon: Monitor },
    { href: "/goals", label: t("Goals", "יעדים"), icon: Flag },
    { href: "/analytics", label: t("Analytics", "אנליטיקה"), icon: BarChart3 },
    { href: "/review", label: t("Review", "סיכום"), icon: Sparkles },
    { href: "/settings", label: t("Settings", "הגדרות"), icon: Settings },
  ];

  return (
    <nav className="sticky bottom-0 border-t border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto max-w-2xl flex overflow-x-auto no-scrollbar justify-around py-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] min-w-[3rem] flex-shrink-0 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
