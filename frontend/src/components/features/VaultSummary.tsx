import type { ReactNode } from "react";

export function VaultStats({
  cards,
  aside,
}: {
  cards: { label: string; value: string; tone?: "default" | "positive" | "negative"; meta?: string }[];
  aside?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className="tv-stat-card">
            <p className="tv-label">
              {card.label}
            </p>
            <p
              className={`mt-2 font-mono text-lg font-semibold tabular-nums ${
                card.tone === "positive"
                  ? "text-[var(--long)]"
                  : card.tone === "negative"
                    ? "text-[var(--short)]"
                    : "text-[var(--text)]"
              }`}
            >
              {card.value}
            </p>
            {card.meta ? <p className="mt-1 text-xs text-[var(--muted)]">{card.meta}</p> : null}
          </div>
        ))}
      </div>
      {aside}
    </div>
  );
}
