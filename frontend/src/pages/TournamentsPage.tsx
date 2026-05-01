import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { TournamentRow } from "@/components/tournament/TournamentRow";

type TournamentListRow = {
  key: string;
  name: string;
  statusLabel: string;
  statusKind: "live" | "soon" | "ended" | "settled" | "settling" | "claim";
  entryFee: string;
  prizePool: string;
  players: string;
  timeLabel: string;
  timeSubLabel?: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  active?: boolean;
};

export function TournamentsPage({
  activeRows,
  pastRows,
  loading,
  error,
  notices,
  loadingState,
  emptyAction,
  pastEmptyAction,
}: {
  activeRows: TournamentListRow[];
  pastRows: TournamentListRow[];
  loading?: boolean;
  error?: string | null;
  notices?: ReactNode;
  loadingState?: ReactNode;
  emptyAction?: ReactNode;
  pastEmptyAction?: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <section className="tv-panel p-5 sm:p-6">
        <p className="tv-kicker">Tournaments</p>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Choose a tournament</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Join an arena, trade BTC with virtual balance, and climb the Return % leaderboard.
        </p>
      </section>

      {notices}
      {error ? (
        <div className="tv-panel-soft border-[rgba(239,68,68,0.22)] p-4 text-sm text-[var(--text)]">
          {error}
        </div>
      ) : null}

      <section className="tv-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="tv-kicker">Active</p>
            <p className="mt-2 text-sm text-[var(--muted)]">The next action is on each row.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            loadingState ?? <div className="tv-panel-soft p-4 text-sm text-[var(--muted)]">Loading tournaments...</div>
          ) : activeRows.length ? (
            activeRows.map(({ key, ...row }) => <TournamentRow key={key} {...row} />)
          ) : (
            <EmptyStatePanel
              eyebrow="Tournaments"
              title="No active arenas yet"
              copy="The next BTC arena will appear here when it opens."
              action={emptyAction}
            />
          )}
        </div>
      </section>

      <details className="tv-panel p-5 sm:p-6">
        <summary className="cursor-pointer list-none text-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="tv-kicker">Past</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Previous arenas and settled rewards.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              {pastRows.length}
            </span>
          </div>
        </summary>

        <div className="mt-5 space-y-3">
          {pastRows.length ? (
            pastRows.map(({ key, ...row }) => <TournamentRow key={key} {...row} />)
          ) : (
            <EmptyStatePanel
              eyebrow="Past tournaments"
              title="No completed arenas yet"
              copy="Finished tournaments will appear here."
              action={pastEmptyAction}
            />
          )}
        </div>
      </details>
    </motion.div>
  );
}
