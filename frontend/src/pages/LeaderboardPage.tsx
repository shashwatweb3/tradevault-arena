import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { LeaderboardPanel } from "@/components/leaderboard/LeaderboardPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";

export function LeaderboardPage({
  tabs,
  subtitle,
  podium,
  rows,
  inactiveRows,
  loading,
  error,
  emptyState,
}: {
  tabs: {
    key: string;
    label: string;
    active: boolean;
    onClick: () => void;
  }[];
  subtitle: string;
  podium: { key: string; rank: number; address: string; returnPct: string; prize: string; highlight?: boolean }[];
  rows: {
    key: string;
    rank: number;
    address: string;
    returnPct: string;
    pnl: string;
    vault: string;
    highlight?: boolean;
    positive?: boolean;
    negative?: boolean;
    note?: string;
  }[];
  inactiveRows: {
    key: string;
    address: string;
    note: string;
    highlight?: boolean;
  }[];
  loading?: boolean;
  error?: string | null;
  emptyState?: {
    title: string;
    copy: string;
    action?: ReactNode;
  } | null;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <section className="tv-panel p-5 sm:p-6">
        <p className="tv-kicker">Leaderboard</p>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Leaderboard</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={tab.onClick}
              className={
                tab.active
                  ? "tv-pill border-[rgba(57,255,136,0.22)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]"
                  : "tv-pill px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="tv-panel-soft border-[rgba(239,68,68,0.22)] p-4 text-sm text-[var(--text)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="tv-panel p-5 text-sm text-[var(--muted)]">
          Loading rankings...
        </div>
      ) : emptyState ? (
        <EmptyStatePanel
          eyebrow="Leaderboard"
          title={emptyState.title}
          copy={emptyState.copy}
          action={emptyState.action}
        />
      ) : (
        <LeaderboardPanel podium={podium} rows={rows} inactiveRows={inactiveRows} />
      )}
    </motion.div>
  );
}
