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

export type WalletPermissionIssue = "permission_blocked" | "no_accounts";

export type InjectedWalletInfo = {
  key: string;
  name: string;
  version?: string;
};

type InjectedWindowProvider = {
  enable?: (origin: string) => Promise<unknown>;
  name?: string;
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

function logWalletDebug(label: string, value: unknown) {
  if (import.meta.env.DEV) {
    console.log(`[wallet] ${label}`, value);
  }
}

function normalizeWalletId(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_.]+/g, "-");
}

function matchSupportedSource(wallet: InjectedWalletInfo): SupportedWalletSource | null {
  const normalizedKey = normalizeWalletId(wallet.key);
  const normalizedName = normalizeWalletId(wallet.name);

  if (
    normalizedKey.includes("polkadot-js")
    || normalizedName.includes("polkadot-js")
    || normalizedName.includes("polkadotjs")
  ) {
    return "polkadot-js";
  }

  if (
    normalizedKey.includes("subwallet")
    || normalizedName.includes("subwallet")
  ) {
    return "subwallet-js";
  }

  if (
    normalizedKey.includes("talisman")
    || normalizedName.includes("talisman")
  ) {
    return "talisman";
  }

  if (
    normalizedKey.includes("enkrypt")
    || normalizedName.includes("enkrypt")
  ) {
    return "enkrypt";
  }

  return null;
}

export function getInjectedWallets(): InjectedWalletInfo[] {
  if (typeof window === "undefined") return [];

  const injected = window.injectedWeb3;
  if (!injected) return [];

  return Object.keys(injected).map((key) => ({
    key,
    name: injected[key]?.name || key,
    version: injected[key]?.version,
  }));
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
    normalized.includes("not allowed to interact")
    || normalized.includes("not authorized")
    || normalized.includes("permission")
    || normalized.includes("source")
  ) {
    return "Wallet permission blocked for this site. Open your wallet extension and allow this website, then try again.";
  }

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
    return "No accounts found or this site is not approved in your wallet. Unlock your wallet, allow this site, then retry.";
  }

  return message || fallback;
}

async function requestExtensionAccess() {
  const extensions = await web3Enable(APP_NAME);
  logWalletDebug("enabled", extensions);
  return extensions;
}

export function getWalletPermissionIssue(error: unknown): WalletPermissionIssue | null {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("not allowed to interact")
    || normalized.includes("not authorized")
    || normalized.includes("permission")
    || normalized.includes("source")
  ) {
    return "permission_blocked";
  }

  if (
    normalized.includes("no accounts found or this site is not approved")
    || normalized.includes("no account")
    || normalized.includes("no accounts")
  ) {
    return "no_accounts";
  }

  return null;
}

export function getWalletInstruction(source: string): string | null {
  if (source === "subwallet-js") {
    return "Open SubWallet extension → Settings/Connected sites → allow tradevault-arena-7ddv.vercel.app, or disconnect and reconnect this site.";
  }

  if (source === "polkadot-js") {
    return "Open Polkadot.js extension → authorize this website → select an account.";
  }

  return null;
}

function getSupportedInjectedWalletMap(injectedWallets: InjectedWalletInfo[]) {
  const supported = new Map<SupportedWalletSource, InjectedWalletInfo>();

  injectedWallets.forEach((wallet) => {
    const source = matchSupportedSource(wallet);
    if (source && !supported.has(source)) {
      supported.set(source, wallet);
    }
  });

  return supported;
}

export function getWalletOptionsFromInjected(
  injectedWallets: InjectedWalletInfo[] = getInjectedWallets(),
): WalletOption[] {
  const supportedInjectedWallets = getSupportedInjectedWalletMap(injectedWallets);

  return SUPPORTED_WALLETS.map((wallet) => {
    const installed = supportedInjectedWallets.has(wallet.source);

    return {
      ...wallet,
      accountCount: 0,
      accounts: [],
      installed,
      status: installed ? "enabled" : "disabled",
    };
  });
}

export async function detectWalletOptions(): Promise<WalletOption[]> {
  return getWalletOptionsFromInjected();
}

export async function listWallets(): Promise<string[]> {
  const wallets = getWalletOptionsFromInjected();
  return wallets
    .filter((wallet) => wallet.installed)
    .map((wallet) => wallet.source);
}

const enabledWalletCache = new Map<string, Promise<EnabledWallet>>();

export async function enableWallet(source: string): Promise<EnabledWallet> {
  const cached = enabledWalletCache.get(source);
  if (cached) return cached;

  const pending = (async () => {
    const wallets = await detectWalletOptions();
    const target = wallets.find((wallet) => wallet.source === source);

    if (!target || !target.installed) {
      throw new Error(`Wallet "${source}" is not available.`);
    }

    logWalletDebug("injected", injectedRegistry());
    await requestExtensionAccess();

    const accounts = (await web3Accounts()).map((account) =>
      normalizeAccount(account as InjectedAccountLike),
    );
    logWalletDebug("accounts", accounts);
    const sourceAccounts = accounts.filter((account) => account.meta.source === source);

    if (sourceAccounts.length === 0) {
      throw new Error(
        `No accounts found or this site is not approved in your wallet. Unlock your wallet, allow this site, then retry.`,
      );
    }

    const injector = await web3FromSource(source);

    return {
      accounts: sourceAccounts,
      signer: injector.signer ?? null,
      source,
    };
  })();

  enabledWalletCache.set(source, pending);

  try {
    return await pending;
  } finally {
    enabledWalletCache.delete(source);
  }
}
