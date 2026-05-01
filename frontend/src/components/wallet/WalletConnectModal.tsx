import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { shortAddress } from "@/lib/format";
import {
  enableWallet,
  getInjectedWallets,
  getWalletOptionsFromInjected,
  getWalletInstruction,
  getWalletPermissionIssue,
  normalizeWalletErrorMessage,
  type WalletAccount,
  type EnabledWallet,
  type WalletOption,
} from "@/lib/wallet";

type WalletConnectModalProps = {
  open: boolean;
  onClose: () => void;
  onConnect: (enabledWallet: EnabledWallet, address?: string) => Promise<boolean>;
  onError: (message: string) => void;
};

type ModalStep = "wallets" | "accounts";
type DetectionState = "checking" | "ready" | "noWallets";

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function WalletConnectModal({
  open,
  onClose,
  onConnect,
  onError,
}: WalletConnectModalProps) {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [detectionState, setDetectionState] = useState<DetectionState>("checking");
  const [retryNonce, setRetryNonce] = useState(0);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [selectedEnabledWallet, setSelectedEnabledWallet] = useState<EnabledWallet | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<WalletAccount[]>([]);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectErrorWallet, setConnectErrorWallet] = useState<WalletOption | null>(null);
  const [step, setStep] = useState<ModalStep>("wallets");
  const detectionStartedRef = useRef(false);
  const connectInFlightRef = useRef(false);
  const timeoutIdsRef = useRef<number[]>([]);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearDetectionTimers = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, []);

  const resetModalState = useCallback(() => {
    clearDetectionTimers();
    detectionStartedRef.current = false;
    connectInFlightRef.current = false;
    setWallets([]);
    setDetectionState("checking");
    setSubmittingKey(null);
    setSelectedWallet(null);
    setSelectedEnabledWallet(null);
    setSelectedAccounts([]);
    setEmptyStateMessage(null);
    setConnectError(null);
    setConnectErrorWallet(null);
    setStep("wallets");
  }, [clearDetectionTimers]);

  const showNoWalletFallback = useCallback(() => {
    setWallets(getWalletOptionsFromInjected([]));
    setDetectionState("noWallets");
    setEmptyStateMessage(
      isMobileBrowser()
        ? "Mobile browser cannot access extension wallets. Open this site inside SubWallet mobile browser."
        : "Wallet extension not detected. Use desktop browser with SubWallet/Polkadot.js/Talisman or open inside SubWallet mobile browser.",
    );
  }, []);

  useEffect(() => {
    if (!open) {
      resetModalState();
      return;
    }

    if (detectionStartedRef.current) {
      return;
    }

    detectionStartedRef.current = true;
    setDetectionState("checking");
    setEmptyStateMessage(null);
    setConnectError(null);
    setConnectErrorWallet(null);

    const attempts = [0, 500, 1000];

    attempts.forEach((delayMs, attemptIndex) => {
      const timeoutId = window.setTimeout(() => {
        const injectedWallets = getInjectedWallets();
        const nextWallets = getWalletOptionsFromInjected(injectedWallets);
        const hasAnyInstalled = nextWallets.some((wallet) => wallet.installed);

        if (hasAnyInstalled) {
          clearDetectionTimers();
          setWallets(nextWallets);
          setDetectionState("ready");
          return;
        }

        if (attemptIndex === attempts.length - 1) {
          const fallbackTimeoutId = window.setTimeout(() => {
            showNoWalletFallback();
          }, 500);
          timeoutIdsRef.current.push(fallbackTimeoutId);
        }
      }, delayMs);

      timeoutIdsRef.current.push(timeoutId);
    });

    return () => {
      clearDetectionTimers();
    };
  }, [clearDetectionTimers, open, resetModalState, retryNonce, showNoWalletFallback]);

  const handleRetry = useCallback(() => {
    if (!open) return;
    resetModalState();
    setRetryNonce((current) => current + 1);
  }, [open, resetModalState]);

  const visibleAccounts = useMemo(
    () => selectedAccounts,
    [selectedAccounts],
  );

  const handleWalletSelect = async (wallet: WalletOption) => {
    if (!wallet.installed || connectInFlightRef.current) return;

    connectInFlightRef.current = true;
    setSubmittingKey(wallet.source);
    setConnectError(null);
    setConnectErrorWallet(wallet);
    try {
      const enabled = await enableWallet(wallet.source);
      await handleEnabledWallet(wallet, enabled);
    } catch (error) {
      const message = normalizeWalletErrorMessage(error, wallet.name);
      setConnectError(message);
      setConnectErrorWallet(wallet);
      onErrorRef.current(message);
    } finally {
      connectInFlightRef.current = false;
      setSubmittingKey(null);
    }
  };

  const completeWalletConnect = useCallback(
    async (enabledWallet: EnabledWallet, address?: string) => {
      const connected = await onConnect(enabledWallet, address);
      if (connected) {
        onClose();
      }
      return connected;
    },
    [onClose, onConnect],
  );

  const handleEnabledWallet = async (wallet: WalletOption, enabled: EnabledWallet) => {
    if (enabled.accounts.length === 0) {
      const message = "No accounts found or this site is not approved in your wallet. Unlock your wallet, allow this site, then retry.";
      setConnectError(message);
      setConnectErrorWallet(wallet);
      onErrorRef.current(message);
      return;
    }

    if (enabled.accounts.length === 1) {
      const onlyAccount = enabled.accounts[0];
      if (!onlyAccount) return;
      await completeWalletConnect(enabled, onlyAccount.address);
      return;
    }

    setSelectedWallet(wallet);
    setSelectedEnabledWallet(enabled);
    setSelectedAccounts(enabled.accounts);
    setStep("accounts");
  };

  const handleAccountSelect = async (wallet: WalletOption, account: WalletAccount) => {
    if (!selectedEnabledWallet || connectInFlightRef.current) return;

    const connectKey = `${wallet.source}:${account.address}`;
    connectInFlightRef.current = true;
    setSubmittingKey(connectKey);
    try {
      await completeWalletConnect(selectedEnabledWallet, account.address);
    } finally {
      connectInFlightRef.current = false;
      setSubmittingKey(null);
    }
  };

  const errorInstruction = connectErrorWallet ? getWalletInstruction(connectErrorWallet.source) : null;
  const permissionIssue = connectError ? getWalletPermissionIssue(connectError) : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="wallet-connect-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#050B14]/80 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="tv-panel w-full max-w-[520px] p-5"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--text)]"
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
                  setSelectedEnabledWallet(null);
                  setSelectedAccounts([]);
                }}
                className="mt-4 text-sm font-medium text-[var(--primary)] transition hover:text-[var(--primary-strong)]"
              >
                Back to wallets
              </button>
            ) : null}

            <div className="mt-6 space-y-3">
              {connectError ? (
                <div className="tv-panel-soft px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                  <p className="text-base font-semibold text-[var(--text)]">
                    {permissionIssue === "permission_blocked" ? "Wallet permission blocked" : "Wallet connection failed"}
                  </p>
                  <p className="mt-2">{connectError}</p>
                  {errorInstruction ? <p className="mt-2">{errorInstruction}</p> : null}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (connectErrorWallet) {
                          void handleWalletSelect(connectErrorWallet);
                          return;
                        }
                        handleRetry();
                      }}
                      className="tv-action-secondary text-sm"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="tv-action-secondary text-sm text-[var(--muted)]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}

              {detectionState === "checking" ? (
                <div className="tv-panel-soft px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Checking wallet extensions...
                </div>
              ) : null}

              {detectionState === "noWallets" && emptyStateMessage ? (
                <div className="tv-panel-soft px-4 py-5 text-sm leading-6 text-[var(--muted)]">
                  <p className="text-base font-semibold text-[var(--text)]">Wallet extension not detected</p>
                  <p className="mt-2">{emptyStateMessage}</p>
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="tv-action-secondary text-sm"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="tv-action-secondary text-sm text-[var(--muted)]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}

              {detectionState === "ready" && step === "wallets"
                ? wallets.map((wallet) => {
                    const disabled = !wallet.installed || Boolean(submittingKey);
                    const isSubmitting = submittingKey === wallet.source;

                    return (
                      <motion.button
                        key={wallet.source}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          void handleWalletSelect(wallet);
                        }}
                        whileHover={disabled ? undefined : { y: -2 }}
                        whileTap={disabled ? undefined : { scale: 0.99 }}
                        className={`flex w-full items-center gap-4 rounded-[22px] border px-4 py-4 text-left transition ${
                          disabled
                            ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface)] opacity-75"
                            : "border-[rgba(57,255,136,0.16)] bg-[#070A0C] hover:border-[rgba(57,255,136,0.28)] hover:shadow-[var(--shadow-glow)]"
                        }`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(57,255,136,0.16)] bg-[var(--primary-soft)] text-base font-semibold text-[var(--text)]">
                          {wallet.iconLabel}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-[var(--text)]">{wallet.name}</div>
                          <div className="mt-1 text-sm text-[var(--muted)]">
                            {isSubmitting
                              ? "Requesting wallet permission..."
                              : wallet.installed
                                ? "Extension detected. Click to authorize access and choose an account."
                                : "Extension not installed in this browser."}
                          </div>
                          {wallet.accountCount > 0 ? (
                            <div className="mt-1 text-xs text-[var(--muted-dark)]">
                              {wallet.accountCount} account{wallet.accountCount === 1 ? "" : "s"} ready
                            </div>
                          ) : null}
                        </div>
                        <div
                          className={`tv-pill shrink-0 px-3 py-1 text-xs font-semibold ${
                            wallet.installed
                              ? "text-[var(--success)]"
                              : "text-[var(--muted-dark)]"
                          }`}
                        >
                          {isSubmitting ? "Connecting..." : wallet.installed ? "Enabled" : "Disabled"}
                        </div>
                      </motion.button>
                    );
                  })
                : null}

              {detectionState === "ready" && step === "accounts"
                ? visibleAccounts.map((account) => {
                    const connectKey = `${selectedWallet?.source ?? "wallet"}:${account.address}`;
                    const isSubmitting = submittingKey === connectKey;

                    return (
                      <motion.button
                        key={account.address}
                        type="button"
                        disabled={Boolean(submittingKey)}
                        onClick={() => {
                          if (!selectedWallet) return;
                          void handleAccountSelect(selectedWallet, account);
                        }}
                        whileHover={!submittingKey ? { y: -2 } : undefined}
                        whileTap={!submittingKey ? { scale: 0.99 } : undefined}
                        className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-[rgba(57,255,136,0.18)] bg-[#070A0C] px-4 py-4 text-left transition hover:border-[rgba(57,255,136,0.28)] hover:shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-[var(--text)]">
                            {(account.meta.name ?? "Wallet account").trim()}
                          </div>
                          <div className="mt-1 font-mono text-sm text-[var(--muted)]">
                            {shortAddress(account.address)}
                          </div>
                        </div>
                        <div className="tv-pill shrink-0 px-3 py-1 text-xs font-semibold text-[var(--success)]">
                          {isSubmitting ? "Connecting..." : "Connect"}
                        </div>
                      </motion.button>
                    );
                  })
                : null}

              {detectionState === "ready" && step === "accounts" && visibleAccounts.length === 0 ? (
                <div className="tv-panel-soft px-4 py-8 text-center text-sm text-[var(--muted)]">
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
