"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "en" | "he";
export type ThemeName = "dark" | "light" | "midnight" | "forest" | "sunset" | "ocean";

interface Settings {
  language: Language;
  theme: ThemeName;
}

interface SettingsCtx extends Settings {
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeName) => void;
  t: (en: string, he: string) => string;
}

const defaults: Settings = { language: "he", theme: "dark" };

const SettingsContext = createContext<SettingsCtx>({
  ...defaults,
  setLanguage: () => {},
  setTheme: () => {},
  t: (en) => en,
});

export function useSettings() {
  return useContext(SettingsContext);
}

// Theme CSS variable definitions
export const THEMES: Record<ThemeName, { label: string; labelHe: string; colors: Record<string, string>; isDark: boolean }> = {
  dark: {
    label: "Dark",
    labelHe: "כהה",
    isDark: true,
    colors: {
      "--background": "oklch(0.145 0 0)",
      "--foreground": "oklch(0.985 0 0)",
      "--card": "oklch(0.205 0 0)",
      "--card-foreground": "oklch(0.985 0 0)",
      "--popover": "oklch(0.205 0 0)",
      "--popover-foreground": "oklch(0.985 0 0)",
      "--primary": "oklch(0.922 0 0)",
      "--primary-foreground": "oklch(0.205 0 0)",
      "--secondary": "oklch(0.269 0 0)",
      "--secondary-foreground": "oklch(0.985 0 0)",
      "--muted": "oklch(0.269 0 0)",
      "--muted-foreground": "oklch(0.708 0 0)",
      "--accent": "oklch(0.269 0 0)",
      "--accent-foreground": "oklch(0.985 0 0)",
      "--destructive": "oklch(0.704 0.191 22.216)",
      "--border": "oklch(1 0 0 / 10%)",
      "--input": "oklch(1 0 0 / 15%)",
      "--ring": "oklch(0.556 0 0)",
    },
  },
  light: {
    label: "Light",
    labelHe: "בהיר",
    isDark: false,
    colors: {
      "--background": "oklch(0.985 0 0)",
      "--foreground": "oklch(0.145 0 0)",
      "--card": "oklch(1 0 0)",
      "--card-foreground": "oklch(0.145 0 0)",
      "--popover": "oklch(1 0 0)",
      "--popover-foreground": "oklch(0.145 0 0)",
      "--primary": "oklch(0.205 0 0)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--secondary": "oklch(0.95 0 0)",
      "--secondary-foreground": "oklch(0.205 0 0)",
      "--muted": "oklch(0.95 0 0)",
      "--muted-foreground": "oklch(0.45 0 0)",
      "--accent": "oklch(0.95 0 0)",
      "--accent-foreground": "oklch(0.205 0 0)",
      "--destructive": "oklch(0.577 0.245 27.325)",
      "--border": "oklch(0.88 0 0)",
      "--input": "oklch(0.88 0 0)",
      "--ring": "oklch(0.708 0 0)",
    },
  },
  midnight: {
    label: "Midnight Blue",
    labelHe: "כחול חצות",
    isDark: true,
    colors: {
      "--background": "oklch(0.17 0.02 260)",
      "--foreground": "oklch(0.95 0.01 250)",
      "--card": "oklch(0.22 0.025 260)",
      "--card-foreground": "oklch(0.95 0.01 250)",
      "--popover": "oklch(0.22 0.025 260)",
      "--popover-foreground": "oklch(0.95 0.01 250)",
      "--primary": "oklch(0.7 0.15 250)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.28 0.03 260)",
      "--secondary-foreground": "oklch(0.95 0.01 250)",
      "--muted": "oklch(0.28 0.03 260)",
      "--muted-foreground": "oklch(0.65 0.04 250)",
      "--accent": "oklch(0.28 0.03 260)",
      "--accent-foreground": "oklch(0.95 0.01 250)",
      "--destructive": "oklch(0.704 0.191 22.216)",
      "--border": "oklch(0.35 0.04 260)",
      "--input": "oklch(0.3 0.03 260)",
      "--ring": "oklch(0.6 0.12 250)",
    },
  },
  forest: {
    label: "Forest Green",
    labelHe: "ירוק יער",
    isDark: true,
    colors: {
      "--background": "oklch(0.16 0.02 150)",
      "--foreground": "oklch(0.95 0.02 140)",
      "--card": "oklch(0.21 0.025 150)",
      "--card-foreground": "oklch(0.95 0.02 140)",
      "--popover": "oklch(0.21 0.025 150)",
      "--popover-foreground": "oklch(0.95 0.02 140)",
      "--primary": "oklch(0.7 0.16 145)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--secondary": "oklch(0.27 0.03 150)",
      "--secondary-foreground": "oklch(0.95 0.02 140)",
      "--muted": "oklch(0.27 0.03 150)",
      "--muted-foreground": "oklch(0.65 0.04 145)",
      "--accent": "oklch(0.27 0.03 150)",
      "--accent-foreground": "oklch(0.95 0.02 140)",
      "--destructive": "oklch(0.704 0.191 22.216)",
      "--border": "oklch(0.33 0.04 150)",
      "--input": "oklch(0.29 0.03 150)",
      "--ring": "oklch(0.6 0.12 145)",
    },
  },
  sunset: {
    label: "Sunset",
    labelHe: "שקיעה",
    isDark: true,
    colors: {
      "--background": "oklch(0.16 0.025 25)",
      "--foreground": "oklch(0.95 0.02 40)",
      "--card": "oklch(0.21 0.03 25)",
      "--card-foreground": "oklch(0.95 0.02 40)",
      "--popover": "oklch(0.21 0.03 25)",
      "--popover-foreground": "oklch(0.95 0.02 40)",
      "--primary": "oklch(0.75 0.16 40)",
      "--primary-foreground": "oklch(0.15 0.02 25)",
      "--secondary": "oklch(0.27 0.035 25)",
      "--secondary-foreground": "oklch(0.95 0.02 40)",
      "--muted": "oklch(0.27 0.035 25)",
      "--muted-foreground": "oklch(0.65 0.06 35)",
      "--accent": "oklch(0.27 0.035 25)",
      "--accent-foreground": "oklch(0.95 0.02 40)",
      "--destructive": "oklch(0.704 0.191 22.216)",
      "--border": "oklch(0.33 0.04 25)",
      "--input": "oklch(0.29 0.035 25)",
      "--ring": "oklch(0.65 0.14 40)",
    },
  },
  ocean: {
    label: "Ocean",
    labelHe: "אוקיינוס",
    isDark: true,
    colors: {
      "--background": "oklch(0.15 0.02 220)",
      "--foreground": "oklch(0.95 0.01 210)",
      "--card": "oklch(0.2 0.03 220)",
      "--card-foreground": "oklch(0.95 0.01 210)",
      "--popover": "oklch(0.2 0.03 220)",
      "--popover-foreground": "oklch(0.95 0.01 210)",
      "--primary": "oklch(0.72 0.14 200)",
      "--primary-foreground": "oklch(0.15 0.02 220)",
      "--secondary": "oklch(0.26 0.035 220)",
      "--secondary-foreground": "oklch(0.95 0.01 210)",
      "--muted": "oklch(0.26 0.035 220)",
      "--muted-foreground": "oklch(0.62 0.05 210)",
      "--accent": "oklch(0.26 0.035 220)",
      "--accent-foreground": "oklch(0.95 0.01 210)",
      "--destructive": "oklch(0.704 0.191 22.216)",
      "--border": "oklch(0.32 0.04 220)",
      "--input": "oklch(0.28 0.035 220)",
      "--ring": "oklch(0.6 0.12 200)",
    },
  },
};

function applyTheme(theme: ThemeName) {
  const t = THEMES[theme];
  const root = document.documentElement;

  // Apply all CSS variables
  for (const [key, value] of Object.entries(t.colors)) {
    root.style.setProperty(key, value);
  }

  // Toggle dark class
  if (t.isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("he");
  const [theme, setThemeState] = useState<ThemeName>("dark");
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lifeos-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.language) setLanguageState(parsed.language);
        if (parsed.theme) {
          setThemeState(parsed.theme);
          applyTheme(parsed.theme);
        }
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    const dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    localStorage.setItem("lifeos-settings", JSON.stringify({ language: lang, theme }));
  };

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    applyTheme(t);
    localStorage.setItem("lifeos-settings", JSON.stringify({ language, theme: t }));
  };

  const t = (en: string, he: string) => (language === "he" ? he : en);

  // Apply direction on load
  useEffect(() => {
    if (loaded) {
      document.documentElement.dir = language === "he" ? "rtl" : "ltr";
      document.documentElement.lang = language;
    }
  }, [loaded, language]);

  return (
    <SettingsContext.Provider value={{ language, theme, setLanguage, setTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
}
