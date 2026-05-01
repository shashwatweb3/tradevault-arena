import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export function OrderPanel({
  tournamentName,
  timeLeft,
  prizePool,
  direction,
  onDirectionChange,
  size,
  onSizeChange,
  availableBalance,
  entryPrice,
  currentPrice,
  estimatedPnl,
  actionLabel,
  onAction,
  actionVariant,
  actionDisabled,
  actionDisabledReason,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryDisabled,
  activePositionSummary,
  stopLossPrice,
  onStopLossChange,
  takeProfitPrice,
  onTakeProfitChange,
  riskControlsHelper,
  helper,
  warning,
}: {
  tournamentName?: string;
  timeLeft?: string;
  prizePool?: string;
  direction: "Long" | "Short";
  onDirectionChange: (direction: "Long" | "Short") => void;
  size: string;
  onSizeChange: (value: string) => void;
  availableBalance: string;
  entryPrice: string;
  currentPrice: string;
  estimatedPnl: { value: string; tone: "default" | "positive" | "negative" };
  actionLabel: string;
  onAction: () => void;
  actionVariant: "positive" | "danger";
  actionDisabled?: boolean;
  actionDisabledReason?: string | null;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryDisabled?: boolean;
  activePositionSummary?: {
    direction: string;
    size: string;
    entryPrice: string;
  } | null;
  stopLossPrice: string;
  onStopLossChange: (value: string) => void;
  takeProfitPrice: string;
  onTakeProfitChange: (value: string) => void;
  riskControlsHelper?: ReactNode;
  helper?: ReactNode;
  warning?: ReactNode;
}) {
  const hasOpenPosition = Boolean(activePositionSummary);
  const riskConfigured = Boolean(stopLossPrice.trim() || takeProfitPrice.trim());

  return (
    <div className="tv-panel p-4">
      <div>
        <p className="tv-label">
          Order
        </p>
        <p className="mt-2 text-[18px] font-semibold text-[var(--text)]">
          {tournamentName ?? "Tournament Order"}
        </p>
        {(timeLeft || prizePool) ? (
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            {timeLeft ? <span>{timeLeft}</span> : null}
            {prizePool ? <span>Prize pool {prizePool}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        <SegmentedControl
          value={direction}
          onChange={(value) => onDirectionChange(value as "Long" | "Short")}
          disabled={hasOpenPosition || actionDisabled}
          options={[
            { label: "LONG", value: "Long", tone: "positive" },
            { label: "SHORT", value: "Short", tone: "danger" },
          ]}
        />

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
            Size
          </span>
          <div className="mt-2 flex min-h-[44px] items-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3">
            <input
              value={size}
              onChange={(event) => onSizeChange(event.target.value)}
              disabled={hasOpenPosition || actionDisabled}
              className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none"
              placeholder="100"
            />
            <span className="text-[11px] text-[var(--label)]">USDT</span>
          </div>
        </label>

        <div className="tv-panel-soft space-y-1 p-3 text-[13px]">
          <InfoRow label="Available" value={availableBalance} />
          <InfoRow label="Tournament Price" value={entryPrice} />
          <InfoRow label="Live BTC Price" value={currentPrice} />
          <InfoRow
            label="Live Preview P/L"
            value={
              <motion.span
                key={estimatedPnl.value}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 0.2 }}
                className={`font-mono tabular-nums ${
                  estimatedPnl.tone === "positive"
                    ? "text-[var(--long)]"
                    : estimatedPnl.tone === "negative"
                      ? "text-[var(--short)]"
                      : "text-[var(--text)]"
                }`}
              >
                {estimatedPnl.value}
              </motion.span>
            }
          />
        </div>

        <details className="tv-panel-soft p-3" open={riskConfigured}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
                Risk Controls
              </p>
              <p className="mt-2 text-[12px] text-[var(--muted)]">
                Optional Stop Loss and Take Profit levels.
              </p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
              {riskConfigured ? "Configured" : "Optional"}
            </span>
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
                Stop Loss Price
              </span>
              <div className="mt-2 flex min-h-[44px] items-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3">
                <span className="text-[11px] text-[var(--label)]">$</span>
                <input
                  value={stopLossPrice}
                  onChange={(event) => onStopLossChange(event.target.value)}
                  disabled={hasOpenPosition || actionDisabled}
                  className="w-full bg-transparent px-2 text-[13px] text-[var(--text)] outline-none"
                  placeholder="58,500"
                  inputMode="decimal"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
                Take Profit Price
              </span>
              <div className="mt-2 flex min-h-[44px] items-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3">
                <span className="text-[11px] text-[var(--label)]">$</span>
                <input
                  value={takeProfitPrice}
                  onChange={(event) => onTakeProfitChange(event.target.value)}
                  disabled={hasOpenPosition || actionDisabled}
                  className="w-full bg-transparent px-2 text-[13px] text-[var(--text)] outline-none"
                  placeholder="63,000"
                  inputMode="decimal"
                />
              </div>
            </label>
          </div>
          {riskControlsHelper ? (
            <div className="mt-3 text-[12px] text-[var(--muted)]">{riskControlsHelper}</div>
          ) : null}
        </details>

        {activePositionSummary ? (
          <div className="tv-panel-soft p-3">
            <p className="tv-label">
              Open Position
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <InfoRow label="Direction" value={activePositionSummary.direction} />
              <InfoRow label="Size" value={activePositionSummary.size} />
              <InfoRow label="Entry Price" value={activePositionSummary.entryPrice} />
            </div>
          </div>
        ) : null}

        {warning ? <div className="text-[12px] text-[var(--short)]">{warning}</div> : null}
        {helper ? <div className="text-[12px] text-[var(--muted)]">{helper}</div> : null}
        {actionDisabled && actionDisabledReason ? (
          <div className="text-[12px] text-[var(--muted)]">{actionDisabledReason}</div>
        ) : null}

        {!activePositionSummary ? (
          <Button variant={actionVariant} fullWidth onClick={onAction} disabled={actionDisabled} title={actionDisabledReason ?? undefined}>
            {actionLabel}
          </Button>
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <Button variant="secondary" fullWidth onClick={onSecondaryAction} disabled={secondaryDisabled}>
            {secondaryActionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--muted)]">{label}</span>
      <span className="font-mono text-[13px] tabular-nums text-[var(--text)]">{value}</span>
    </div>
  );
}
