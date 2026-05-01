import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export type QuickActionItem = {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  icon: ReactNode;
  variant?: "primary" | "secondary" | "positive" | "danger" | "ghost";
};

export function QuickActions({
  actions,
}: {
  actions: QuickActionItem[];
}) {
  return (
    <motion.section
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32 } },
      }}
      className="product-card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
            Quick Actions
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Move fast inside the arena</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.24 }}
            whileHover={{ y: -3, borderColor: "rgba(57,255,136,0.14)" }}
            className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--border-soft)] bg-[var(--panel-soft)] text-[var(--primary)]">
              {action.icon}
            </div>
            <p className="mt-4 text-base font-semibold text-[var(--text)]">{action.title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{action.description}</p>
            <div className="mt-5">
              <Button
                variant={action.variant ?? "secondary"}
                onClick={action.onClick}
                fullWidth
                className="sm:w-auto"
              >
                {action.buttonLabel}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
