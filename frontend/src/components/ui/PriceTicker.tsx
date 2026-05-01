import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CurrencyBtc } from "@phosphor-icons/react";

export function PriceTicker({
  label,
  price,
  change,
}: {
  label: string;
  price: string;
  change?: string;
}) {
  const previous = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const numericChange = change ? Number(change.replace(/[^0-9+.-]/g, "")) : null;
  const changeTone =
    numericChange == null || !Number.isFinite(numericChange)
      ? "neutral"
      : numericChange > 0
        ? "up"
        : numericChange < 0
          ? "down"
          : "neutral";

  useEffect(() => {
    if (previous.current === price) return;
    const prev = Number(previous.current.replace(/[^0-9.-]/g, ""));
    const next = Number(price.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(prev) && Number.isFinite(next)) {
      setFlash(next >= prev ? "up" : "down");
      const id = window.setTimeout(() => setFlash(null), 600);
      previous.current = price;
      return () => window.clearTimeout(id);
    }
    previous.current = price;
  }, [price]);

  const flashClass =
    flash === "up" ? "text-[var(--long)]" : flash === "down" ? "text-[var(--short)]" : "text-[var(--text)]";
  const flashBackground =
    flash === "up"
      ? "bg-[rgba(34,197,94,0.12)]"
      : flash === "down"
        ? "bg-[rgba(239,68,68,0.12)]"
        : "bg-[var(--panel)]";
  const arrow = flash === "up" ? "↑" : flash === "down" ? "↓" : "•";

  return (
    <motion.div
      animate={{ scale: flash ? [1, 1.02, 1] : 1 }}
      transition={{ duration: 0.22 }}
      className={`tv-pill min-h-[40px] gap-3 px-[14px] py-[7px] transition-colors duration-300 ${flashBackground}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(247,147,26,0.18)] text-[#F7931A]">
        <CurrencyBtc size={11} weight="bold" />
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </span>
      <motion.span
        key={price}
        initial={{ opacity: 0.85, y: 2, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`font-mono text-[14px] font-semibold tabular-nums ${flashClass}`}
      >
        {price}
      </motion.span>
      <motion.span
        key={`${arrow}-${change ?? ""}`}
        initial={{ opacity: 0.6, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        className={`font-mono text-sm ${flashClass}`}
      >
        {arrow}
      </motion.span>
      {change ? (
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-xs tabular-nums ${
            changeTone === "up"
              ? "bg-[rgba(34,197,94,0.12)] text-[var(--long)]"
              : changeTone === "down"
                ? "bg-[rgba(239,68,68,0.12)] text-[var(--short)]"
                : "bg-white/[0.04] text-[var(--muted)]"
          }`}
        >
          {change}
        </span>
      ) : null}
    </motion.div>
  );
}
