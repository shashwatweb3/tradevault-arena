import { motion, type HTMLMotionProps, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ArenaCard({
  children,
  className,
  glow = false,
  highlight = false,
  ...props
}: HTMLMotionProps<"div"> & {
  children: ReactNode;
  glow?: boolean;
  highlight?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 22 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 22 });
  const transform = useMotionTemplate`perspective(1200px) rotateX(${springX}deg) rotateY(${springY}deg)`;

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    rotateY.set(((x / bounds.width) - 0.5) * 8);
    rotateX.set(-((y / bounds.height) - 0.5) * 8);
  };

  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={reduceMotion ? undefined : { transformStyle: "preserve-3d", transform }}
      className={cn(
        "relative overflow-hidden rounded-[12px] border bg-[var(--panel)] p-4",
        "border-[var(--border-soft)]",
        glow && "border-[rgba(34,197,94,0.18)]",
        highlight && "ring-1 ring-[rgba(57,255,136,0.16)]",
        className,
      )}
      {...props}
    >
      <div className="relative">{children}</div>
    </motion.div>
  );
}
