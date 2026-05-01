import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/StatusPill";

export function TradePage({
  tournamentName,
  market,
  prompt,
  warning,
  notices,
  chart,
  orderPanel,
  positionPanel,
  vaultSummary,
  leaderboardPanel,
}: {
  tournamentName?: string | null;
  market?: {
    livePrice: string;
    tournamentPrice: string;
    timeLeft: string;
    statusLabel: string;
    statusKind: "live" | "soon" | "ended" | "settled" | "settling" | "claim";
  } | null;
  prompt?: {
    title: string;
    copy: string;
    actionLabel?: string;
    onAction?: () => void;
    actionDisabled?: boolean;
  } | null;
  warning?: string | null;
  notices?: ReactNode;
  chart?: ReactNode;
  orderPanel?: ReactNode;
  positionPanel?: ReactNode;
  vaultSummary?: ReactNode;
  leaderboardPanel?: ReactNode;
}) {
  if (!tournamentName || !market) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <PromptCard
          title="Select a tournament"
          copy="Choose a BTC arena to open the trade screen."
          actionLabel="View Tournaments"
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <section className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              {tournamentName}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">BTC/USD</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Trade the tournament price with virtual balance.</p>
          </div>
          <StatusPill kind={market.statusKind} label={market.statusLabel} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <HeaderStat label="Live Price" value={market.livePrice} />
          <HeaderStat label="Tournament Price" value={market.tournamentPrice} />
          <HeaderStat label="Time Left" value={market.timeLeft} />
          <HeaderStat label="Status" value={market.statusLabel} />
        </div>
      </section>

      {warning ? (
        <div className="rounded-[12px] border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] p-4 text-sm text-[var(--text)]">
          {warning}
        </div>
      ) : null}

      {prompt ? <PromptCard {...prompt} /> : null}
      {notices}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">{chart}</div>
        <div className="space-y-4">{orderPanel}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr_0.9fr]">
        {positionPanel}
        {vaultSummary}
        {leaderboardPanel}
      </div>
    </motion.div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function PromptCard({
  title,
  copy,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <section className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5 sm:p-6">
      <p className="text-lg font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-[8px] bg-[var(--primary)] px-4 py-2 text-[13px] font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
