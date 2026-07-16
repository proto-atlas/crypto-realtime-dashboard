import { useCallback, useEffect, useState } from "react";
import {
  applyThemePreference,
  getNextThemePreference,
  readStoredTheme,
  type ThemePreference,
  writeStoredTheme,
} from "@/lib/theme";

const browserThemeStorage: Pick<Storage, "getItem" | "setItem"> = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>(() => readStoredTheme(browserThemeStorage));

  useEffect(() => {
    applyThemePreference(document.documentElement, theme);
    writeStoredTheme(browserThemeStorage, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => getNextThemePreference(current));
  }, []);

  return {
    theme,
    toggleTheme,
  };
}
