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
      <section className="tv-panel grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_320px]">
        <div>
          <p className="tv-kicker">TradeVault Arena</p>
          <h1 className="tv-title mt-4 max-w-3xl">Compete in BTC trading tournaments</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Trade with virtual balance. Win real VARA rewards.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={onPrimary} className="sm:w-auto">
              {primaryLabel}
            </Button>
            <Button variant="secondary" onClick={onSecondary} className="sm:w-auto">
              View Leaderboard
            </Button>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="tv-panel-soft space-y-4 p-5"
        >
          <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="tv-label">
            Live Arena
          </motion.p>
          <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">
            Join. Trade. Win.
          </motion.p>
          <motion.p variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="text-sm leading-6 text-[var(--muted)]">
            One tournament. One virtual balance. The highest Return % takes the reward pool.
          </motion.p>
          <div className="grid gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="tv-stat-card">
                <p className="tv-label">{stat.label}</p>
                <p className="tv-value mt-3 text-[22px]">{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="space-y-4">
        <p className="tv-kicker">How it works</p>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { step: "1. Join", copy: "Pick a BTC tournament and reserve your spot." },
            { step: "2. Trade", copy: "Use virtual balance to open Long or Short positions." },
            { step: "3. Win", copy: "Top Return % earns real VARA rewards." },
          ].map((item) => (
            <motion.div key={item.step} whileHover={{ y: -3 }} className="tv-panel-soft p-5">
              <p className="text-sm font-semibold text-[var(--text)]">{item.step}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.copy}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
