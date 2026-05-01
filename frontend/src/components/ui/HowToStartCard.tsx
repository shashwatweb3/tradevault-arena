import { motion } from "framer-motion";

const steps = [
  "Connect wallet",
  "Join tournament",
  "Trade BTC",
  "Track leaderboard",
  "Claim rewards",
];

export function HowToStartCard({
  title = "How to start",
  copy = "Follow the same flow every time: connect once, join an arena, trade BTC, then watch your rank and rewards.",
}: {
  title?: string;
  copy?: string;
}) {
  return (
    <div className="tv-panel p-5">
      <p className="tv-kicker">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="tv-panel-soft p-4"
          >
            <p className="tv-label">Step {index + 1}</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text)]">{step}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
