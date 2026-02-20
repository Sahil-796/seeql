export type ThemeId = "soft" | "supabase";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export const themes: Theme[] = [
  {
    id: "soft",
    name: "Soft Modern",
    description: "Clean whites and grays with subtle shadows",
    cssVars: {
      light: {
        "--background": "#ffffff",
        "--foreground": "#171717",
        "--card": "#ffffff",
        "--card-foreground": "#171717",
        "--popover": "#ffffff",
        "--popover-foreground": "#171717",
        "--primary": "#111111",
        "--primary-foreground": "#f8f8f8",
        "--secondary": "#f4f4f5",
        "--secondary-foreground": "#111111",
        "--muted": "#f3f4f6",
        "--muted-foreground": "#6b7280",
        "--accent": "#f1f5f9",
        "--accent-foreground": "#0f172a",
        "--destructive": "#ef4444",
        "--destructive-foreground": "#f8fafc",
        "--border": "#e4e4e7",
        "--input": "#e4e4e7",
        "--ring": "#0f172a",
      },
      dark: {
        "--background": "#0a0a0a",
        "--foreground": "#ededed",
        "--card": "#0f0f10",
        "--card-foreground": "#ededed",
        "--popover": "#0f0f10",
        "--popover-foreground": "#ededed",
        "--primary": "#ededed",
        "--primary-foreground": "#0a0a0a",
        "--secondary": "#1f2937",
        "--secondary-foreground": "#f9fafb",
        "--muted": "#1f2937",
        "--muted-foreground": "#9ca3af",
        "--accent": "#111827",
        "--accent-foreground": "#f9fafb",
        "--destructive": "#ef4444",
        "--destructive-foreground": "#fef2f2",
        "--border": "#1f2937",
        "--input": "#1f2937",
        "--ring": "#e5e7eb",
      },
    },
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Dark theme with green accents inspired by Supabase",
    cssVars: {
      light: {
        "--background": "#fafafa",
        "--foreground": "#1c1c1c",
        "--card": "#ffffff",
        "--card-foreground": "#1c1c1c",
        "--popover": "#ffffff",
        "--popover-foreground": "#1c1c1c",
        "--primary": "#3ecf8e",
        "--primary-foreground": "#1c1c1c",
        "--secondary": "#f0f0f0",
        "--secondary-foreground": "#1c1c1c",
        "--muted": "#f5f5f5",
        "--muted-foreground": "#6b6b6b",
        "--accent": "#e6f9ef",
        "--accent-foreground": "#1c1c1c",
        "--destructive": "#f43f5e",
        "--destructive-foreground": "#ffffff",
        "--border": "#e5e5e5",
        "--input": "#e5e5e5",
        "--ring": "#3ecf8e",
      },
      dark: {
        "--background": "#1c1c1c",
        "--foreground": "#ededed",
        "--card": "#232323",
        "--card-foreground": "#ededed",
        "--popover": "#232323",
        "--popover-foreground": "#ededed",
        "--primary": "#3ecf8e",
        "--primary-foreground": "#1c1c1c",
        "--secondary": "#2e2e2e",
        "--secondary-foreground": "#ededed",
        "--muted": "#2e2e2e",
        "--muted-foreground": "#a0a0a0",
        "--accent": "#2e2e2e",
        "--accent-foreground": "#ededed",
        "--destructive": "#f43f5e",
        "--destructive-foreground": "#ffffff",
        "--border": "#3a3a3a",
        "--input": "#3a3a3a",
        "--ring": "#3ecf8e",
      },
    },
  },
];

export function getThemeById(id: ThemeId): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}
