import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/StatusPill";

export function TradePage({
  tournamentName,
  market,
  prompt,
  warning,
  notices,
  statusPanel,
  chart,
  orderPanel,
  fairnessCard,
  positionPanel,
  vaultSummary,
  leaderboardPanel,
  confirmationModal,
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
  statusPanel?: ReactNode;
  chart?: ReactNode;
  orderPanel?: ReactNode;
  fairnessCard?: ReactNode;
  positionPanel?: ReactNode;
  vaultSummary?: ReactNode;
  leaderboardPanel?: ReactNode;
  confirmationModal?: ReactNode;
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
      <section className="tv-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="tv-kicker">
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
        <div className="tv-panel-soft border-[rgba(251,191,36,0.22)] p-4 text-sm text-[var(--text)]">
          {warning}
        </div>
      ) : null}

      {prompt ? <PromptCard {...prompt} /> : null}
      {notices}
      {statusPanel}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">{chart}</div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">{orderPanel}</div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr_0.9fr]">
        {positionPanel}
        {vaultSummary}
        {leaderboardPanel}
      </div>

      {fairnessCard}
      {confirmationModal}
    </motion.div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tv-stat-card">
      <p className="tv-label">{label}</p>
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
    <section className="tv-panel p-5 sm:p-6">
      <p className="text-lg font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="tv-action-primary mt-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
