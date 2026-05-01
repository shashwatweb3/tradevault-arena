import { motion } from "framer-motion";
import { PriceTicker } from "@/components/ui/PriceTicker";
import { LivePriceChart } from "@/components/live-price-chart";

export function TradingChart({
  livePrice,
  liveChange,
  tournamentPrice,
  priceHistory,
  tournamentPriceValue,
  entryPriceValue,
  liveLabel,
  tournamentLabel,
}: {
  livePrice: string;
  liveChange: string;
  tournamentPrice: string;
  priceHistory: { price: number; timestamp: number }[];
  tournamentPriceValue?: bigint;
  entryPriceValue?: bigint | null;
  liveLabel?: string;
  tournamentLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="tv-panel p-4"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
            BTC/USD
          </p>
          <p className="mt-2 font-mono text-[20px] font-semibold tabular-nums text-[var(--text)]">{livePrice}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriceTicker label="Live Price" price={livePrice} change={liveChange} />
          <PriceTicker label="Tournament Price" price={tournamentPrice} />
        </div>
      </div>

      <LivePriceChart
        priceHistory={priceHistory}
        tournamentPrice={tournamentPriceValue}
        entryPrice={entryPriceValue}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <LegendChip label={liveLabel ?? "Live BTC"} tone="cyan" />
        <LegendChip label={tournamentLabel ?? "Tournament price"} tone="purple" />
        {entryPriceValue ? <LegendChip label="Entry price" tone="green" /> : null}
      </div>
    </motion.div>
  );
}

function LegendChip({
  label,
  tone,
}: {
  label: string;
  tone: "cyan" | "purple" | "green";
}) {
  const dot =
    tone === "cyan" ? "bg-[var(--primary)]" : tone === "purple" ? "bg-[var(--accent)]" : "bg-[var(--long)]";
  return (
    <div className="tv-pill px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </div>
  );
}
