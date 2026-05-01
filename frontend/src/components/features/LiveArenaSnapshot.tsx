import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SnapshotStatusKind = "live" | "soon" | "ended" | "settled" | "settling" | "claim";

export function LiveArenaSnapshot({
  tournamentName,
  tournamentPrice,
  btcPrice,
  playersJoined,
  prizePool,
  timeLeft,
  statusLabel,
  statusKind,
}: {
  tournamentName: string;
  tournamentPrice: string;
  btcPrice: string;
  playersJoined: string;
  prizePool: string;
  timeLeft: string;
  statusLabel: string;
  statusKind: SnapshotStatusKind;
}) {
  const metrics = [
    { label: "BTC Price", value: btcPrice, tone: "default" as const },
    { label: "Players joined", value: playersJoined, tone: "default" as const },
    { label: "Prize pool", value: prizePool, tone: "positive" as const },
    { label: "Time left", value: timeLeft, tone: "default" as const },
    { label: "Tournament status", value: statusLabel, tone: statusKind === "live" ? ("positive" as const) : ("default" as const) },
  ];

  return (
    <motion.section
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32 } },
      }}
      className="product-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
            Live Arena Snapshot
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">{tournamentName}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tournament price <span className="font-mono text-[var(--text)]">{tournamentPrice}</span>
          </p>
        </div>
        <span className={cn("inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", getStatusStyles(statusKind))}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * index, duration: 0.24 }}
            className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--subtle)]">
              {metric.label}
            </p>
            <p
              className={cn(
                "mt-3 text-base font-semibold sm:text-lg",
                metric.tone === "positive" ? "text-[var(--long)]" : "text-[var(--text)]",
              )}
            >
              {metric.value}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function getStatusStyles(kind: SnapshotStatusKind) {
  if (kind === "live") {
    return "border-[rgba(36,201,139,0.28)] bg-[rgba(36,201,139,0.12)] text-[var(--long)]";
  }

  if (kind === "soon") {
    return "border-[rgba(57,255,136,0.12)] bg-[rgba(57,255,136,0.06)] text-[var(--muted)]";
  }

  if (kind === "claim") {
    return "border-[rgba(244,201,93,0.24)] bg-[rgba(244,201,93,0.12)] text-[var(--warning)]";
  }

  return "border-[var(--border-soft)] bg-[var(--panel-soft)] text-[var(--muted)]";
}
