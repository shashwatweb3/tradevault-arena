import type { ReactNode } from "react";

export function TopBar({
  title,
  right,
}: {
  title: string;
  right: ReactNode;
}) {
  return (
    <header className="relative z-20 flex min-h-[56px] items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.07)] bg-[var(--sidebar)] px-4 py-3 sm:px-6">
      <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[24px]">
        {title}
      </h1>
      <div className="relative z-30 shrink-0 pointer-events-auto">{right}</div>
    </header>
  );
}
