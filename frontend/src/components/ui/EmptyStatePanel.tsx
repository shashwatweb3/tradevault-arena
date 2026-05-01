import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export function EmptyStatePanel({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow?: string;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return <EmptyState eyebrow={eyebrow} title={title} copy={copy} action={action} />;
}
