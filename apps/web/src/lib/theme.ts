// 初期themeをReactの読み込み前に反映するため、同じkeyをindex.htmlにも置いている。
export const themeStorageKey = "crypto-realtime-dashboard-theme";

export type ThemePreference = "light" | "dark";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function readStoredTheme(storage: Pick<Storage, "getItem">): ThemePreference {
  let storedTheme: string | null;

  try {
    storedTheme = storage.getItem(themeStorageKey);
  } catch {
    return "light";
  }

  return isThemePreference(storedTheme) ? storedTheme : "light";
}

export function writeStoredTheme(storage: Pick<Storage, "setItem">, theme: ThemePreference) {
  try {
    storage.setItem(themeStorageKey, theme);
  } catch {
    // ブラウザのstorageが塞がれても描画は継続したいため、theme永続化は段階的な補助機能として扱う。
  }
}

export function getNextThemePreference(current: ThemePreference): ThemePreference {
  return current === "dark" ? "light" : "dark";
}

export function applyThemePreference(root: HTMLElement, theme: ThemePreference) {
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}
