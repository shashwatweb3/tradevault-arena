import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "positive" | "danger" | "ghost";

const styles: Record<ButtonVariant, string> = {
  primary:
    "tv-action-primary disabled:bg-slate-700 disabled:text-slate-400",
  secondary:
    "tv-action-secondary disabled:border-[var(--border)] disabled:text-slate-500",
  positive:
    "rounded-[14px] border border-transparent bg-[var(--success)] text-white hover:-translate-y-px disabled:bg-slate-700 disabled:text-slate-400",
  danger:
    "rounded-[14px] border border-transparent bg-[var(--danger)] text-white hover:-translate-y-px disabled:bg-slate-700 disabled:text-slate-400",
  ghost:
    "rounded-[14px] border border-transparent bg-white/[0.03] text-[var(--text)] hover:border-[var(--border)] hover:bg-[var(--surface)] disabled:text-slate-500",
};

type ButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  children,
  className = "",
  fullWidth = false,
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-[13px] font-semibold transition ${fullWidth ? "w-full" : ""} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
