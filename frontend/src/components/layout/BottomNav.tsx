import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ShellNavItem } from "@/components/layout/Sidebar";

export function BottomNav({
  items,
  activeKey,
}: {
  items: ShellNavItem[];
  activeKey: string;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(57,255,136,0.10)] bg-[#050708] px-2 py-2 lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <motion.button
              key={item.key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={item.onClick}
              className={cn(
                "flex min-h-[44px] min-w-[60px] flex-col items-center justify-center gap-1 rounded-[8px] px-3 text-[11px] font-semibold transition",
                active ? "bg-[rgba(57,255,136,0.12)] text-[var(--primary)]" : "text-[var(--muted)]",
              )}
            >
              {item.icon ? <span className="text-current">{item.icon}</span> : null}
              {item.label}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
