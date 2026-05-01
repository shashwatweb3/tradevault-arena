import type { ReactNode } from "react";

export function TopBar({
  title,
  right,
}: {
  title: string;
  right: ReactNode;
}) {
  return (
    <header className="relative z-20 flex min-h-[64px] items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-[rgba(57,255,136,0.10)] bg-[#050708] px-4 py-3 shadow-[var(--shadow-card)] sm:px-5">
      <h1 className="truncate text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[28px]">
        {title}
      </h1>
      <div className="relative z-30 shrink-0 pointer-events-auto">{right}</div>
    </header>
  );
}
