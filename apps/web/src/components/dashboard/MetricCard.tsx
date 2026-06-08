import type { DashboardMetric } from "@crypto-realtime-dashboard/shared-types";

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  const toneClassName =
    metric.tone === "positive"
      ? "text-emerald-700 dark:text-emerald-300"
      : metric.tone === "negative"
        ? "text-rose-700 dark:text-rose-300"
        : "text-slate-950 dark:text-slate-50";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClassName}`}>{metric.value}</p>
    </section>
  );
}
