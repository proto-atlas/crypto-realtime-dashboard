import { lazy, Suspense, useEffect, useRef, useState } from "react";

const TradeHistoryTable = lazy(() =>
  import("@/components/TradeHistoryTable").then((module) => ({
    default: module.TradeHistoryTable,
  })),
);
// 表示直前の空白待ちを避けるため、モバイル1画面分ほど手前で先読みする。
const tradeHistoryPrefetchRootMargin = "480px";

export function DeferredTradeHistoryTable() {
  const [shouldRenderTable, setShouldRenderTable] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = placeholderRef.current;

    if (target === null || shouldRenderTable) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setShouldRenderTable(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRenderTable(true);
          observer.disconnect();
        }
      },
      { rootMargin: tradeHistoryPrefetchRootMargin },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [shouldRenderTable]);

  return (
    <div ref={placeholderRef}>
      {shouldRenderTable ? (
        <Suspense
          fallback={
            <section className="flex h-[260px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              取引履歴を読み込み中
            </section>
          }
        >
          <TradeHistoryTable />
        </Suspense>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100">取引履歴ラボ</h2>
          <div className="mt-4 grid gap-3">
            <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-28 rounded-lg bg-slate-50 dark:bg-slate-950" />
          </div>
        </section>
      )}
    </div>
  );
}
