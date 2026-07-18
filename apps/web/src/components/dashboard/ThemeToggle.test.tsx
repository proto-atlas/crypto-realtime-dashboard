import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  test("light状態ならDarkへ切り替えるボタンとして表示する", () => {
    const onToggleTheme = vi.fn();

    render(<ThemeToggle theme="light" onToggleTheme={onToggleTheme} />);

    const button = screen.getByRole("button", { name: "ダークテーマへ切り替える" });
    expect(button).toHaveTextContent("ダーク");

    fireEvent.click(button);

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  test("dark状態ならLightへ切り替えるボタンとして表示する", () => {
    render(<ThemeToggle theme="dark" onToggleTheme={() => undefined} />);

    const button = screen.getByRole("button", { name: "ライトテーマへ切り替える" });

    expect(button).toHaveTextContent("ライト");
  });
});
