import { Trophy, TrendUp, Wallet } from "@phosphor-icons/react";
import { motion } from "framer-motion";

const steps = [
  {
    id: "01",
    title: "Join Arena",
    body: "Pick a BTC tournament and enter with a simple VARA fee.",
    icon: Wallet,
  },
  {
    id: "02",
    title: "Trade BTC",
    body: "Use virtual balance to open Long or Short positions on BTC.",
    icon: TrendUp,
  },
  {
    id: "03",
    title: "Win VARA",
    body: "Finish near the top of Return % and earn from the prize pool.",
    icon: Trophy,
  },
];

export function StepCards() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.08 }}
            whileHover={{ y: -3, borderColor: "rgba(57,255,136,0.14)" }}
            className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-[14px]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                {step.id}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-soft)] bg-[var(--panel-soft)] text-[var(--primary)]">
                <Icon size={16} />
              </div>
            </div>
            <p className="mt-4 text-[14px] font-semibold text-[var(--text)]">{step.title}</p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">{step.body}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
