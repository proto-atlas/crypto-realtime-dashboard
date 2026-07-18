import type { ReactNode } from "react";

export function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="h-64 animate-pulse rounded-panel border border-panel-border bg-surface shadow-panel motion-reduce:animate-none"
      aria-label={label}
      aria-busy="true"
    />
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-panel border border-panel-border bg-surface p-6 shadow-panel">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </section>
  );
}

export function ErrorState({ children }: { children: ReactNode }) {
  return (
    <p
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
      role="status"
    >
      {children}
    </p>
  );
}
