import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlowTable({
  header,
  rows,
  emptyState,
}: {
  header: ReactNode;
  rows: {
    key: string;
    content: ReactNode;
    highlight?: boolean;
    podium?: 1 | 2 | 3;
  }[];
  emptyState?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-[8px] border border-[var(--border-soft)] bg-[var(--sidebar)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--subtle)]">
        {header}
      </div>
      {rows.length ? (
        rows.map((row, index) => (
          <motion.div
            key={row.key}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            transition={{ duration: 0.22, delay: index * 0.03 }}
            className={cn(
              "relative overflow-hidden rounded-[8px] border border-[var(--border-soft)] bg-[var(--panel)] px-4 py-4",
              row.highlight && "border-l-[3px] border-l-[var(--primary)] bg-[rgba(57,255,136,0.08)]",
            )}
          >
            <div className="relative">{row.content}</div>
          </motion.div>
        ))
      ) : (
        emptyState
      )}
    </div>
  );
}
