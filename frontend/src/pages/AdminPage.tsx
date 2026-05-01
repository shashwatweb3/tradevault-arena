import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AdminPage({
  createPanel,
  keeperPanel,
  controlsPanel,
  lifecyclePanel,
}: {
  createPanel: ReactNode;
  keeperPanel?: ReactNode;
  controlsPanel: ReactNode;
  lifecyclePanel: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <section className="tv-panel p-5 sm:p-6">
        <p className="tv-kicker">Admin Console</p>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Admin</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Create tournaments, sync price, process lifecycle changes, and settle payouts.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {createPanel}
        {keeperPanel}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {controlsPanel}
      </div>

      {lifecyclePanel}
    </motion.div>
  );
}
