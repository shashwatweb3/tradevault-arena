import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function HomePage({
  primaryLabel,
  onPrimary,
  onSecondary,
  stats,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  stats: { label: string; value: string }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          TradeVault Arena
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Compete in BTC trading tournaments
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Trade with virtual balance. Win real VARA rewards.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" onClick={onPrimary} className="sm:w-auto">
            {primaryLabel}
          </Button>
          <Button variant="secondary" onClick={onSecondary} className="sm:w-auto">
            View Leaderboard
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
              {stat.label}
            </p>
            <p className="mt-3 text-lg font-semibold text-[var(--text)]">{stat.value}</p>
          </motion.div>
        ))}
      </section>

      <section className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          How it works
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            { step: "1. Join", copy: "Pick a BTC tournament and reserve your spot." },
            { step: "2. Trade", copy: "Use virtual balance to open Long or Short positions." },
            { step: "3. Win", copy: "Top Return % earns real VARA rewards." },
          ].map((item) => (
            <div key={item.step} className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-4">
              <p className="text-sm font-semibold text-[var(--text)]">{item.step}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
