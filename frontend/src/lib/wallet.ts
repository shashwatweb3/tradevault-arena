import {
  web3Accounts,
  web3Enable,
  web3FromSource,
} from "@polkadot/extension-dapp";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

const APP_NAME = "TradeVault Arena";
const VARA_SS58_PREFIX = 137;

type InjectedAccountLike = {
  address: string;
  meta: {
    genesisHash?: string | null;
    name?: string;
    source: string;
  };
  type?: string;
};

export const SUPPORTED_WALLETS = [
  { source: "polkadot-js", name: "Polkadot JS", iconLabel: "P" },
  { source: "subwallet-js", name: "SubWallet", iconLabel: "S" },
  { source: "talisman", name: "Talisman", iconLabel: "T" },
  { source: "enkrypt", name: "Enkrypt", iconLabel: "E" },
] as const;

export type SupportedWalletSource = (typeof SUPPORTED_WALLETS)[number]["source"];

export type WalletAccount = {
  address: string;
  meta: { genesisHash?: string | null; name?: string; source: string };
  type?: string;
};

export type WalletOption = {
  accountCount: number;
  accounts: WalletAccount[];
  iconLabel: string;
  installed: boolean;
  name: string;
  source: SupportedWalletSource;
  status: "enabled" | "disabled";
};

export type EnabledWallet = {
  accounts: WalletAccount[];
  signer: unknown | null;
  source: string;
};

type InjectedWindowProvider = {
  enable?: (origin: string) => Promise<unknown>;
  version?: string;
};

declare global {
  interface Window {
    injectedWeb3?: Record<string, InjectedWindowProvider>;
  }
}

function toVaraAddress(address: string): string {
  try {
    return encodeAddress(decodeAddress(address), VARA_SS58_PREFIX);
  } catch {
    return address;
  }
}

function normalizeAccount(account: InjectedAccountLike): WalletAccount {
  return {
    address: toVaraAddress(account.address),
    meta: {
      genesisHash: account.meta.genesisHash ?? null,
      name: account.meta.name,
      source: account.meta.source,
    },
    type: account.type,
  };
}

export { toVaraAddress };

function injectedRegistry(): Record<string, InjectedWindowProvider> {
  if (typeof window === "undefined") return {};
  return window.injectedWeb3 ?? {};
}

export function normalizeWalletErrorMessage(error: unknown, source?: string): string {
  const fallback = source
    ? `Failed to connect "${source}".`
    : "Failed to connect wallet.";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;
  const normalized = message.toLowerCase();

  if (
    normalized.includes("not available")
    || normalized.includes("not found")
    || normalized.includes("no extension")
    || normalized.includes("missing wallet")
  ) {
    return "Wallet extension not found. Install Polkadot JS, SubWallet, Talisman, or Enkrypt.";
  }

  if (
    normalized.includes("rejected")
    || normalized.includes("denied")
    || normalized.includes("cancelled")
    || normalized.includes("canceled")
  ) {
    return "Wallet permission request was cancelled.";
  }

  if (
    normalized.includes("no account")
    || normalized.includes("no accounts")
    || normalized.includes("account not found")
  ) {
    return source
      ? `No accounts found in ${source}. Open the extension, unlock it, and select an account.`
      : "No accounts found. Open the wallet extension, unlock it, and select an account.";
  }

  return message || fallback;
}

async function requestExtensionAccess() {
  const extensions = await web3Enable(APP_NAME);
  return extensions;
}

export async function detectWalletOptions(): Promise<WalletOption[]> {
  const extensions = await requestExtensionAccess();
  const accounts = (await web3Accounts()).map((account) =>
    normalizeAccount(account as InjectedAccountLike),
  );
  const injectedSources = new Set(Object.keys(injectedRegistry()));

  return SUPPORTED_WALLETS.map((wallet) => {
    const walletAccounts = accounts.filter((account) => account.meta.source === wallet.source);
    const installed =
      extensions.some((extension) => extension.name === wallet.source)
      || injectedSources.has(wallet.source)
      || walletAccounts.length > 0;

    return {
      ...wallet,
      accountCount: walletAccounts.length,
      accounts: walletAccounts,
      installed,
      status: walletAccounts.length > 0 ? "enabled" : "disabled",
    };
  });
}

export async function listWallets(): Promise<string[]> {
  const wallets = await detectWalletOptions();
  return wallets
    .filter((wallet) => wallet.accountCount > 0)
    .map((wallet) => wallet.source);
}

export async function enableWallet(source: string): Promise<EnabledWallet> {
  const wallets = await detectWalletOptions();
  const target = wallets.find((wallet) => wallet.source === source);

  if (!target || !target.installed) {
    throw new Error(`Wallet "${source}" is not available.`);
  }

  if (target.accounts.length === 0) {
    throw new Error(`No accounts found in "${target.name}".`);
  }

  const injector = await web3FromSource(source);

  return {
    accounts: target.accounts,
    signer: injector.signer ?? null,
    source,
  };
}
