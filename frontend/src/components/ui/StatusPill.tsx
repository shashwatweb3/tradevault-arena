type StatusKind =
  | "live"
  | "soon"
  | "ended"
  | "settled"
  | "admin"
  | "active"
  | "idle"
  | "settling"
  | "claim";

const styles: Record<StatusKind, string> = {
  live: "text-[var(--success)]",
  soon: "text-[var(--warning)]",
  ended: "text-[var(--muted-dark)]",
  settled: "text-[var(--muted-dark)]",
  settling: "text-[var(--warning)]",
  claim: "text-[var(--primary)]",
  admin: "text-[var(--primary)]",
  active: "text-[var(--success)]",
  idle: "text-[var(--muted-dark)]",
};

export function StatusPill({
  kind,
  label,
}: {
  kind: StatusKind;
  label: string;
}) {
  return (
    <span className={`tv-pill px-[10px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.08em] ${styles[kind]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
