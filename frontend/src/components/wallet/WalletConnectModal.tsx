import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { shortAddress } from "@/lib/format";
import {
  detectWalletOptions,
  normalizeWalletErrorMessage,
  type WalletAccount,
  type WalletOption,
} from "@/lib/wallet";

type WalletConnectModalProps = {
  open: boolean;
  onClose: () => void;
  onConnect: (source: string, address?: string) => Promise<boolean>;
  onError: (message: string) => void;
};

type ModalStep = "wallets" | "accounts";

export function WalletConnectModal({
  open,
  onClose,
  onConnect,
  onError,
}: WalletConnectModalProps) {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [step, setStep] = useState<ModalStep>("wallets");

  useEffect(() => {
    if (!open) {
      setWallets([]);
      setLoading(false);
      setSelectedWallet(null);
      setStep("wallets");
      setSubmittingKey(null);
      return;
    }

    let cancelled = false;

    async function loadWallets() {
      setLoading(true);
      try {
        const nextWallets = await detectWalletOptions();
        if (cancelled) return;
        setWallets(nextWallets);

        const hasAnyEnabled = nextWallets.some((wallet) => wallet.accountCount > 0);
        const hasAnyInstalled = nextWallets.some((wallet) => wallet.installed);
        if (!hasAnyEnabled) {
          onError(
            hasAnyInstalled
              ? "No accounts found. Unlock your wallet extension and make sure at least one account is available."
              : "Wallet extension not found. Install Polkadot JS, SubWallet, Talisman, or Enkrypt to continue.",
          );
        }
      } catch (error) {
        if (cancelled) return;
        onError(normalizeWalletErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWallets();

    return () => {
      cancelled = true;
    };
  }, [onError, open]);

  const visibleAccounts = useMemo(
    () => selectedWallet?.accounts ?? [],
    [selectedWallet],
  );

  const handleWalletSelect = async (wallet: WalletOption) => {
    if (wallet.accountCount === 0) return;

    if (wallet.accountCount === 1) {
      const onlyAccount = wallet.accounts[0];
      if (!onlyAccount) return;
      await handleAccountSelect(wallet, onlyAccount);
      return;
    }

    setSelectedWallet(wallet);
    setStep("accounts");
  };

  const handleAccountSelect = async (wallet: WalletOption, account: WalletAccount) => {
    const connectKey = `${wallet.source}:${account.address}`;
    setSubmittingKey(connectKey);
    try {
      const connected = await onConnect(wallet.source, account.address);
      if (connected) {
        onClose();
      }
    } finally {
      setSubmittingKey(null);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="wallet-connect-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#050B14]/75 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-[520px] rounded-[28px] border border-[rgba(34,211,238,0.25)] bg-[linear-gradient(180deg,#242424_0%,#0B1628_100%)] p-5 shadow-[0_30px_120px_rgba(5,11,20,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  {step === "accounts" ? "Choose Account" : "Connect Wallet"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {step === "accounts"
                    ? "Select the account you want to use in TradeVault Arena."
                    : "Choose a supported Vara wallet extension to continue."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.03] text-[var(--muted)] transition hover:text-[var(--text)]"
                aria-label="Close wallet modal"
              >
                <X size={18} />
              </button>
            </div>

            {step === "accounts" ? (
              <button
                type="button"
                onClick={() => {
                  setStep("wallets");
                  setSelectedWallet(null);
                }}
                className="mt-4 text-sm font-medium text-[var(--primary)] transition hover:text-[#67e8f9]"
              >
                Back to wallets
              </button>
            ) : null}

            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-white/[0.03] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Checking wallet extensions...
                </div>
              ) : null}

              {!loading && step === "wallets"
                ? wallets.map((wallet) => {
                    const disabled = wallet.accountCount === 0 || Boolean(submittingKey);
                    const statusLabel =
                      wallet.accountCount > 0
                        ? `Enabled${wallet.accountCount > 1 ? ` · ${wallet.accountCount} accounts` : " · 1 account"}`
                        : "Disabled";

                    return (
                      <button
                        key={wallet.source}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          void handleWalletSelect(wallet);
                        }}
                        className={`flex w-full items-center gap-4 rounded-[22px] border px-4 py-4 text-left transition ${
                          disabled
                            ? "cursor-not-allowed border-[rgba(255,255,255,0.08)] bg-white/[0.03] opacity-75"
                            : "border-[rgba(34,211,238,0.18)] bg-[rgba(11,22,40,0.82)] hover:border-[rgba(34,211,238,0.45)] hover:bg-[rgba(11,22,40,0.96)]"
                        }`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(34,211,238,0.2)] bg-[rgba(34,211,238,0.08)] text-base font-semibold text-[var(--text)]">
                          {wallet.iconLabel}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-[var(--text)]">{wallet.name}</div>
                          <div className="mt-1 text-sm text-[var(--muted)]">
                            {wallet.accountCount > 0
                              ? "Extension detected and ready to connect."
                              : wallet.installed
                                ? "Extension detected, but no accounts are available."
                                : "Extension not installed or not enabled for this app."}
                          </div>
                        </div>
                        <div
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            wallet.accountCount > 0
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/[0.06] text-slate-400"
                          }`}
                        >
                          {statusLabel}
                        </div>
                      </button>
                    );
                  })
                : null}

              {!loading && step === "accounts"
                ? visibleAccounts.map((account) => {
                    const connectKey = `${selectedWallet?.source ?? "wallet"}:${account.address}`;
                    const isSubmitting = submittingKey === connectKey;

                    return (
                      <button
                        key={account.address}
                        type="button"
                        disabled={Boolean(submittingKey)}
                        onClick={() => {
                          if (!selectedWallet) return;
                          void handleAccountSelect(selectedWallet, account);
                        }}
                        className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-[rgba(34,211,238,0.18)] bg-[rgba(11,22,40,0.82)] px-4 py-4 text-left transition hover:border-[rgba(34,211,238,0.45)] hover:bg-[rgba(11,22,40,0.96)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-[var(--text)]">
                            {(account.meta.name ?? "Wallet account").trim()}
                          </div>
                          <div className="mt-1 font-mono text-sm text-[var(--muted)]">
                            {shortAddress(account.address)}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                          {isSubmitting ? "Connecting..." : "Connect"}
                        </div>
                      </button>
                    );
                  })
                : null}

              {!loading && step === "accounts" && visibleAccounts.length === 0 ? (
                <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-white/[0.03] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  No accounts are available for this wallet.
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
