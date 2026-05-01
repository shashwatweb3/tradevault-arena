import { ClockCountdown, Pulse, ShieldCheck, WarningDiamond } from "@phosphor-icons/react";

type OverviewMetric = {
  label: string;
  value: string;
  meta: string;
  tone?: "default" | "warning" | "positive";
};

export function AdminOverviewPanel({
  metrics,
}: {
  metrics: OverviewMetric[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="product-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--subtle)]">
              {metric.label}
            </p>
            <OverviewIcon tone={metric.tone ?? "default"} />
          </div>
          <p className="mt-4 font-mono text-[20px] font-semibold tabular-nums text-[var(--text)]">{metric.value}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{metric.meta}</p>
        </div>
      ))}
    </div>
  );
}

function OverviewIcon({ tone }: { tone: "default" | "warning" | "positive" }) {
  if (tone === "positive") {
    return <Pulse size={18} className="text-[var(--long)]" />;
  }
  if (tone === "warning") {
    return <WarningDiamond size={18} className="text-[var(--warning)]" />;
  }
  return <ClockCountdown size={18} className="text-[var(--muted)]" />;
}

export function AdminAuditBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(57,255,136,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
      <ShieldCheck size={12} />
      {label}
    </div>
  );
}
