import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function TradeConfirmModal({
  open,
  direction,
  size,
  tournamentPrice,
  stopLoss,
  takeProfit,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  direction: "Long" | "Short";
  size: string;
  tournamentPrice: string;
  stopLoss?: string | null;
  takeProfit?: string | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="tv-panel w-full max-w-[460px] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="tv-kicker">Confirm trade</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text)]">
              Open {direction} position
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Review the tournament price and risk controls before asking your wallet to sign.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="tv-stat-card">
                <p className="tv-label">Direction</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text)]">{direction}</p>
              </div>
              <div className="tv-stat-card">
                <p className="tv-label">Size</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text)]">{size}</p>
              </div>
              <div className="tv-stat-card">
                <p className="tv-label">Tournament Price</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text)]">{tournamentPrice}</p>
              </div>
              <div className="tv-stat-card">
                <p className="tv-label">Risk Controls</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                  {stopLoss || takeProfit
                    ? `${stopLoss ? `SL ${stopLoss}` : "No SL"}${stopLoss && takeProfit ? " · " : ""}${takeProfit ? `TP ${takeProfit}` : "No TP"}`
                    : "No SL / TP"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onCancel} disabled={pending}>
                Cancel
              </Button>
              <Button variant={direction === "Long" ? "positive" : "danger"} onClick={onConfirm} disabled={pending}>
                {pending ? "Waiting..." : `Confirm ${direction}`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
