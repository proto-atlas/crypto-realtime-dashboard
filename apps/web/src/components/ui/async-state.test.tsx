import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "./async-state";

describe("非同期状態部品", () => {
  test("読み込み中はaria-busyで伝える", () => {
    render(<LoadingState label="画面を読み込み中" />);

    expect(screen.getByRole("status", { name: "画面を読み込み中" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  test("空状態は見出しと説明を表示する", () => {
    render(<EmptyState title="データなし" description="取得状態を確認してください。" />);

    expect(screen.getByRole("heading", { name: "データなし" })).toBeInTheDocument();
    expect(screen.getByText("取得状態を確認してください。")).toBeInTheDocument();
  });

  test("エラー状態はstatusで内容を伝える", () => {
    render(<ErrorState>取得できません。</ErrorState>);

    expect(screen.getByRole("status")).toHaveTextContent("取得できません。");
  });
});
