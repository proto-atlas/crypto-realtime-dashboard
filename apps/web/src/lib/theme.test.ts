import { describe, expect, test } from "vitest";
import {
  applyThemePreference,
  getNextThemePreference,
  isThemePreference,
  readStoredTheme,
  themeStorageKey,
  writeStoredTheme,
} from "./theme";

describe("theme", () => {
  test("lightまたはdarkだけをtheme preferenceとして扱う", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(false);
  });

  test("保存値がなければlightを返す", () => {
    const storage = new MapBackedStorage();

    expect(readStoredTheme(storage)).toBe("light");
  });

  test("保存値がdarkならdarkを返す", () => {
    const storage = new MapBackedStorage([[themeStorageKey, "dark"]]);

    expect(readStoredTheme(storage)).toBe("dark");
  });

  test("保存値の読み取りに失敗したらlightを返す", () => {
    const storage = {
      getItem() {
        throw new Error("storage unavailable");
      },
    };

    expect(readStoredTheme(storage)).toBe("light");
  });

  test("次のtheme preferenceを返す", () => {
    expect(getNextThemePreference("light")).toBe("dark");
    expect(getNextThemePreference("dark")).toBe("light");
  });

  test("darkを適用したらrootへdark classを付ける", () => {
    const root = document.createElement("html");

    applyThemePreference(root, "dark");

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.style.colorScheme).toBe("dark");
  });

  test("保存に失敗しても例外を外へ出さない", () => {
    const storage = {
      setItem() {
        throw new Error("storage unavailable");
      },
    };

    expect(() => writeStoredTheme(storage, "dark")).not.toThrow();
  });
});

class MapBackedStorage implements Pick<Storage, "getItem"> {
  private readonly values: Map<string, string>;

  constructor(entries: readonly (readonly [string, string])[] = []) {
    this.values = new Map(entries);
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
}
