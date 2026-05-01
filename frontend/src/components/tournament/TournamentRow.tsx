import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

export function TournamentRow({
  name,
  statusLabel,
  statusKind,
  entryFee,
  prizePool,
  players,
  timeLabel,
  timeSubLabel,
  actionLabel,
  onAction,
  disabled,
  active = false,
}: {
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
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[12px] border px-4 py-4 ${
        active
          ? "border-[rgba(34,211,238,0.22)] bg-[var(--panel)]"
          : "border-[var(--border-soft)] bg-[var(--panel)]"
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-[var(--text)]">{name}</p>
            <StatusPill kind={statusKind} label={statusLabel} />
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Entry Fee" value={entryFee} />
            <Metric label="Prize Pool" value={prizePool} emphasis />
            <Metric label="Players" value={players} />
            <Metric label="Time" value={timeLabel} sub={timeSubLabel} />
          </div>
        </div>

        <div className="shrink-0 xl:w-[140px]">
          <Button variant="primary" fullWidth onClick={onAction} disabled={disabled}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  sub,
  emphasis = false,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${emphasis ? "text-[var(--primary)]" : "text-[var(--text)]"}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}
