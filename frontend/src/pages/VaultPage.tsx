import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function VaultPage({
  tournamentTabs,
  connectPrompt,
  summary,
  reward,
  position,
  notices,
}: {
  tournamentTabs?: ReactNode;
  connectPrompt?: ReactNode;
  summary?: ReactNode;
  reward?: ReactNode;
  position?: ReactNode;
  notices?: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <section className="tv-panel p-5 sm:p-6">
        <p className="tv-kicker">My Vault</p>
        <h1 className="text-2xl font-semibold text-[var(--text)]">My Vault</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Check your current tournament status, position, return %, and rewards.
        </p>
        {tournamentTabs ? <div className="mt-5">{tournamentTabs}</div> : null}
      </section>

      {connectPrompt}
      {notices}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {summary}
        {reward}
      </div>

      {position}
    </motion.div>
  );
}
