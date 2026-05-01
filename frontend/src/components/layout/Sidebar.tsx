import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { CurrencyBtc } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ShellNavItem = {
  key: string;
  label: string;
  badge?: string;
  onClick: () => void;
  icon?: ReactNode;
};

export function Sidebar({
  items,
  activeKey,
  footer,
  collapsed = false,
  onToggle,
}: {
  items: ShellNavItem[];
  activeKey: string;
  footer?: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 hidden shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-5 transition-all duration-300 lg:flex lg:flex-col",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--card)] text-[var(--primary)] shadow-[var(--shadow-soft)]">
            <CurrencyBtc size={16} weight="bold" />
          </div>
          {!collapsed ? (
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]">TradeVault</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted-dark)]">Arena</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="hidden rounded-[12px] border border-transparent p-2 text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--card)] hover:text-[var(--text)] lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="mt-8 space-y-1.5">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                "relative flex min-h-[48px] w-full items-center justify-between gap-2 rounded-[16px] px-3 py-[9px] text-left text-[13px] font-medium transition",
                active
                  ? "border border-[rgba(34,211,238,0.18)] bg-[var(--primary-soft)] text-[var(--text)]"
                  : "border border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--card)] hover:text-[var(--text)]",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="activeNav"
                  className="absolute left-2 top-2 bottom-2 w-[3px] rounded-full bg-[var(--primary)]"
                />
              ) : null}
              <span className={cn("flex items-center gap-3", collapsed ? "pl-2" : "pl-3")}>
                <span className="text-current">{item.icon}</span>
                {!collapsed ? <span>{item.label}</span> : null}
              </span>
              {!collapsed && item.badge ? (
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
      {!collapsed && footer ? <div className="mt-auto">{footer}</div> : null}
    </aside>
  );
}
