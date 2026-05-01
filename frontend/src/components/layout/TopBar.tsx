import type { ReactNode } from "react";

export function TopBar({
  title,
  right,
}: {
  title: string;
  right: ReactNode;
}) {
  return (
    <header className="tv-panel relative z-20 flex min-h-[64px] items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <h1 className="truncate text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)] sm:text-[28px]">
        {title}
      </h1>
      <div className="relative z-30 shrink-0 pointer-events-auto">{right}</div>
    </header>
  );
}
