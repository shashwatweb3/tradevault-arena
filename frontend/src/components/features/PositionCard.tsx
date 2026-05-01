import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function PositionCard({
  direction,
  size,
  entryPrice,
  livePrice,
  tournamentPrice,
  livePreviewPnl,
  tournamentPnl,
  returnPct,
  riskControls,
  hasPosition,
  onClose,
  closePending,
  emptyAction,
}: {
  direction?: string | null;
  size?: string | null;
  entryPrice?: string | null;
  livePrice?: string | null;
  tournamentPrice?: string | null;
  livePreviewPnl?: { label: string; positive: boolean; negative: boolean; key: string } | null;
  tournamentPnl?: { label: string; positive: boolean; negative: boolean; key: string } | null;
  returnPct?: { label: string; positive: boolean; negative: boolean; key: string } | null;
  riskControls?: {
    stopLossPrice?: string | null;
    takeProfitPrice?: string | null;
  } | null;
  hasPosition: boolean;
  onClose?: () => void;
  closePending?: boolean;
  emptyAction?: ReactNode;
}) {
  if (!hasPosition) {
    return (
      <EmptyState
        eyebrow="No trades"
        title="No open position"
        copy="Open a Long or Short position to start tracking live and official Profit / Loss."
        action={emptyAction}
        compact
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="tv-panel p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
            Position
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">{direction} BTC/USD</p>
        </div>
        {onClose ? (
          <Button variant="secondary" onClick={onClose} disabled={closePending}>
            {closePending ? "Closing..." : "Close Position"}
          </Button>
        ) : null}
      </div>

      <div className="tv-panel-soft mt-4 p-4">
        <p className="tv-label">
          Live Preview P/L
        </p>
        <motion.p
          key={livePreviewPnl?.key ?? "preview"}
          initial={{ opacity: 0.85, scale: 0.98 }}
          animate={{ opacity: 1, scale: [1, 1.04, 1] }}
          transition={{ duration: 0.24 }}
          className={`mt-3 font-mono text-[24px] font-semibold tabular-nums ${
            livePreviewPnl?.positive
              ? "text-[var(--long)]"
              : livePreviewPnl?.negative
                ? "text-[var(--short)]"
                : "text-[var(--text)]"
          }`}
        >
          {livePreviewPnl?.label ?? "—"}
        </motion.p>
        <p className="mt-2 text-[12px] text-[var(--muted)]">
          Live Preview uses Binance price. Official score uses tournament price synced on-chain.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Size" value={size ?? "—"} />
        <Stat label="Entry Price" value={entryPrice ?? "—"} mono />
        <Stat label="Live BTC Price" value={livePrice ?? "—"} mono />
        <Stat label="Tournament Price" value={tournamentPrice ?? "—"} mono />
        <AnimatedStat label="Official Tournament P/L" value={tournamentPnl} />
        <AnimatedStat label="Return %" value={returnPct} />
      </div>

      {riskControls?.stopLossPrice || riskControls?.takeProfitPrice ? (
        <div className="tv-panel-soft mt-4 p-3">
          <p className="tv-label">
            Risk Controls
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Stat label="Stop Loss" value={riskControls.stopLossPrice ?? "Not set"} mono />
            <Stat label="Take Profit" value={riskControls.takeProfitPrice ?? "Not set"} mono />
          </div>
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            Stop Loss and Take Profit are enforced by the tournament keeper on tournament price sync.
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="tv-stat-card">
      <p className="tv-label">{label}</p>
      <p className={`mt-2 text-[13px] font-semibold text-[var(--text)] ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function AnimatedStat({
  label,
  value,
}: {
  label: string;
  value?: { label: string; positive: boolean; negative: boolean; key: string } | null;
}) {
  const tone = value?.positive
    ? "text-[var(--long)]"
    : value?.negative
      ? "text-[var(--short)]"
      : "text-[var(--text)]";

  return (
    <div className="tv-stat-card">
      <p className="tv-label">{label}</p>
      <motion.p
        key={value?.key ?? label}
        initial={{ opacity: 0.85, scale: 0.98 }}
        animate={{ opacity: 1, scale: [1, 1.04, 1] }}
        transition={{ duration: 0.22 }}
        className={`mt-2 font-mono text-[13px] font-semibold tabular-nums ${tone}`}
      >
        {value?.label ?? "—"}
      </motion.p>
    </div>
  );
}
