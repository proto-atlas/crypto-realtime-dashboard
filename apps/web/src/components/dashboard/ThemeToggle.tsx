import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/theme";

export function ThemeToggle({
  theme,
  onToggleTheme,
}: {
  theme: ThemePreference;
  onToggleTheme: () => void;
}) {
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-label={isDark ? "ライトテーマへ切り替える" : "ダークテーマへ切り替える"}
      onClick={onToggleTheme}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
      {isDark ? "ライト" : "ダーク"}
    </Button>
  );
}
