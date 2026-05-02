import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEEPER_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(KEEPER_DIR, "..");

export type KeeperConfig = {
  varaWs: string;
  programId: string;
  keeperSeed: string;
  binanceSymbol: string;
  tickIntervalMs: number;
  priceScale: bigint;
  binancePriceUrl: string;
  idlPath: string;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return Math.trunc(parsed);
}

export function loadConfig(): KeeperConfig {
  return {
    varaWs: process.env.VARA_WS?.trim() || "wss://testnet.vara.network",
    programId:
      process.env.PROGRAM_ID?.trim()
      || "0x4633e693b251d976e33631c09b9277219e032d62150684ae501d8c7f2c9a5fc7",
    keeperSeed: readRequiredEnv("KEEPER_SEED"),
    binanceSymbol: process.env.BINANCE_SYMBOL?.trim() || "BTCUSDT",
    tickIntervalMs: readPositiveIntegerEnv("TICK_INTERVAL_MS", 15_000),
    priceScale: 100n,
    binancePriceUrl: "https://api.binance.com/api/v3/ticker/price",
    idlPath: resolve(REPO_ROOT, "client", "tradevault_arena_client.idl"),
  };
}
