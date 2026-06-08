import { useCallback, useEffect, useState } from "react";
import {
  applyThemePreference,
  getNextThemePreference,
  readStoredTheme,
  type ThemePreference,
  writeStoredTheme,
} from "@/lib/theme";

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>(() => readStoredTheme(window.localStorage));

  useEffect(() => {
    applyThemePreference(document.documentElement, theme);
    writeStoredTheme(window.localStorage, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => getNextThemePreference(current));
  }, []);

  return {
    theme,
    toggleTheme,
  };
}
