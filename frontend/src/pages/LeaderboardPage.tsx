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
      <section className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5 sm:p-6">
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
                  ? "rounded-full border border-[rgba(34,211,238,0.22)] bg-[rgba(34,211,238,0.08)] px-4 py-2 text-sm font-semibold text-[var(--primary)]"
                  : "rounded-full border border-[var(--border-soft)] bg-[var(--sidebar)] px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--text)]"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-[12px] border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] p-4 text-sm text-[var(--text)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
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
