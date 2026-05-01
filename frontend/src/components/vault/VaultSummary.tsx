import { VaultStats } from "@/components/features/VaultSummary";

export function VaultSummary({
  cards,
  aside,
}: {
  cards: { label: string; value: string; tone?: "default" | "positive" | "negative"; meta?: string }[];
  aside?: React.ReactNode;
}) {
  return (
    <div className="tv-panel p-4">
      <VaultStats cards={cards} aside={aside} />
    </div>
  );
}
