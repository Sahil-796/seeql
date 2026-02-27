"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/lib/theme-context";
import { type ThemeId, themes } from "@/lib/themes";

export function ThemeSwitcher() {
  const { themeId, colorMode, setThemeId, setColorMode } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {/* Theme selector */}
      <Select value={themeId} onValueChange={(v) => setThemeId(v as ThemeId)}>
        <SelectTrigger className="w-32 h-8" size="sm">
          <Palette className="h-3.5 w-3.5 mr-1.5 opacity-50" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              {theme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Color mode toggle */}
      <div className="flex items-center rounded-lg border bg-muted p-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md ${colorMode === "light" ? "bg-background shadow-sm" : ""}`}
          onClick={() => setColorMode("light")}
        >
          <Sun className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md ${colorMode === "system" ? "bg-background shadow-sm" : ""}`}
          onClick={() => setColorMode("system")}
        >
          <Monitor className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md ${colorMode === "dark" ? "bg-background shadow-sm" : ""}`}
          onClick={() => setColorMode("dark")}
        >
          <Moon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
