"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getThemeById, type ThemeId } from "./themes";

type ColorMode = "light" | "dark" | "system";

interface ThemeContextType {
  themeId: ThemeId;
  colorMode: ColorMode;
  setThemeId: (id: ThemeId) => void;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemColorMode(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("soft");
  const [colorMode, setColorMode] = useState<ColorMode>("system");
  const [mounted, setMounted] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem("seeql-theme") as ThemeId | null;
    const savedMode = localStorage.getItem(
      "seeql-color-mode",
    ) as ColorMode | null;
    if (savedTheme) setThemeId(savedTheme);
    if (savedMode) setColorMode(savedMode);
    setMounted(true);
  }, []);

  // Apply theme CSS variables
  useEffect(() => {
    if (!mounted) return;

    const theme = getThemeById(themeId);
    const effectiveMode =
      colorMode === "system" ? getSystemColorMode() : colorMode;
    const vars = theme.cssVars[effectiveMode];

    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    // Save to localStorage
    localStorage.setItem("seeql-theme", themeId);
    localStorage.setItem("seeql-color-mode", colorMode);
  }, [themeId, colorMode, mounted]);

  // Listen for system color scheme changes
  useEffect(() => {
    if (colorMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const theme = getThemeById(themeId);
      const effectiveMode = getSystemColorMode();
      const vars = theme.cssVars[effectiveMode];

      const root = document.documentElement;
      for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [colorMode, themeId]);

  return (
    <ThemeContext.Provider
      value={{ themeId, colorMode, setThemeId, setColorMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
