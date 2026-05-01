import { motion } from "framer-motion";

export function LeaderboardPanel({
  podium,
  rows,
  inactiveRows = [],
}: {
  podium: { key: string; rank: number; address: string; returnPct: string; prize: string; highlight?: boolean; badgeLabel?: string }[];
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
    badgeLabel?: string;
  }[];
  inactiveRows?: {
    key: string;
    address: string;
    note: string;
    highlight?: boolean;
    badgeLabel?: string;
  }[];
}) {
  return (
    <div className="tv-panel p-4">
      {podium.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {podium.map((entry) => (
            <motion.div
              key={entry.key}
              layout
              className={`tv-panel-soft p-4 ${
                entry.rank === 1 ? "border-[var(--primary)] md:-translate-y-2" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="tv-label">#{entry.rank}</p>
                {entry.badgeLabel ? (
                  <span className="tv-pill px-2 py-1 text-[10px] font-semibold text-[var(--primary)]">
                    {entry.badgeLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-base font-semibold text-[var(--text)]">{entry.address}</p>
              <p className="mt-2 font-mono text-lg font-semibold text-[var(--text)] tabular-nums">
                {entry.returnPct}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{entry.prize}</p>
            </motion.div>
          ))}
        </div>
      ) : null}

      <div className={`${podium.length ? "mt-4" : ""} space-y-2`}>
        {rows.map((row) => (
          <motion.div
            key={row.key}
            layout
            transition={{ layout: { duration: 0.28 } }}
            className={`grid gap-3 rounded-[18px] border px-3 py-3 md:grid-cols-[56px_1.2fr_0.9fr_0.9fr_0.9fr] md:items-center ${
              row.highlight
                ? "border-l-[3px] border-l-[var(--primary)] border-[var(--border)] bg-[var(--primary-soft)]"
                : "border-[var(--border)] bg-[var(--card-soft)]"
            }`}
          >
            <p className="font-mono text-sm font-semibold text-[var(--text)] tabular-nums">#{row.rank}</p>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text)]">{row.address}</p>
                {row.badgeLabel ? (
                  <span className="tv-pill px-2 py-1 text-[10px] font-semibold text-[var(--primary)]">
                    {row.badgeLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <p
              className={`font-mono text-sm font-semibold tabular-nums ${
                row.positive ? "text-[var(--long)]" : row.negative ? "text-[var(--short)]" : "text-[var(--text)]"
              }`}
            >
              {row.returnPct}
            </p>
            <p className="font-mono text-sm text-[var(--muted)] tabular-nums">{row.pnl}</p>
            <p className="font-mono text-sm text-[var(--muted)] tabular-nums">{row.vault}</p>
          </motion.div>
        ))}
      </div>

      {inactiveRows.length ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <p className="tv-label">
            Not Qualified
          </p>
          <div className="mt-3 space-y-2">
            {inactiveRows.map((row) => (
              <motion.div
                key={row.key}
                layout
                transition={{ layout: { duration: 0.28 } }}
                className={`flex items-center justify-between gap-3 rounded-[18px] border px-3 py-3 ${
                  row.highlight
                    ? "border-l-[3px] border-l-[var(--primary)] border-[var(--border)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--card-soft)]"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text)]">{row.address}</p>
                    {row.badgeLabel ? (
                      <span className="tv-pill px-2 py-1 text-[10px] font-semibold text-[var(--primary)]">
                        {row.badgeLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{row.note}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Inactive
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
