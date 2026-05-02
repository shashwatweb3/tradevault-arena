import "dotenv/config";
import { readFileSync } from "node:fs";
import { GearApi, GearKeyring } from "@gear-js/api";
import { Sails } from "sails-js";
import { SailsIdlParser } from "sails-js-parser";
import { loadConfig } from "./config.js";

type TournamentStatus = "Upcoming" | "Active" | "Ended" | "Settled";

type TournamentView = {
  tournament_id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: TournamentStatus;
};

type KeeperTickSummary = {
  price_updated: boolean;
  positions_closed: number;
  tournament_ended: boolean;
  tournament_settled: boolean;
};

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 1_000;

function normalizeTimestampMs(value: string): number {
  const raw = Number(BigInt(value));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw < 1_000_000_000_000 ? raw * 1000 : raw;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOperationalStatus(
  tournament: TournamentView,
  now = Date.now(),
): "Upcoming" | "Live" | "Ended" | "Settled" {
  if (tournament.status === "Settled") return "Settled";

  const start = normalizeTimestampMs(tournament.start_time);
  const end = normalizeTimestampMs(tournament.end_time);
  if (now < start) return "Upcoming";
  if (now < end && tournament.status !== "Ended") return "Live";
  return "Ended";
}

function scalePriceToCents(price: number): bigint {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price ${price}`);
  }

  return BigInt(Math.round(price * 100));
}

async function withRetry<T>(
  label: string,
  task: () => Promise<T>,
  attempts = RETRY_ATTEMPTS,
): Promise<T> {
  let delayMs = RETRY_BASE_MS;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      console.warn(`[keeper] ${label} attempt=${attempt} failed`, error);
      await sleep(delayMs);
      delayMs *= 2;
    }
  }

  throw new Error(`[keeper] ${label} exhausted retries`);
}

async function fetchBinancePrice(symbol: string, priceUrl: string): Promise<number> {
  const url = new URL(priceUrl);
  url.searchParams.set("symbol", symbol);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance price request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { price?: string };
  const price = Number(payload.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Binance returned an invalid price for ${symbol}`);
  }

  return price;
}

async function createService() {
  const config = loadConfig();
  const idl = readFileSync(config.idlPath, "utf8");
  const api = await GearApi.create({ providerAddress: config.varaWs });
  const keyring = await GearKeyring.fromSuri(config.keeperSeed, "TradeVault Keeper");
  const parser = await SailsIdlParser.new();
  const sails = new Sails(parser);

  sails.setApi(api);
  sails.parseIdl(idl);
  sails.setProgramId(config.programId as `0x${string}`);

  const service =
    sails.services?.TradevaultArena
    ?? sails.services?.tradevaultArena
    ?? sails.services?.tradevaultarena
    ?? Object.values(sails.services ?? {})[0];

  if (!service) {
    throw new Error("TradeVaultArena service not found in IDL.");
  }

  return { api, keyring, service, config };
}

async function fetchTournaments(service: any): Promise<TournamentView[]> {
  return service.queries.Tournaments().call();
}

async function runKeeperTick(
  service: any,
  keyring: any,
  tournamentId: string,
  priceScaled: bigint,
): Promise<{ summary: KeeperTickSummary; txResult: string }> {
  const tx = service.functions.KeeperTick(BigInt(tournamentId), priceScaled);
  tx.withAccount(keyring);
  await tx.calculateGas();

  const result = await tx.signAndSend();
  const summary = (await result.response()) as KeeperTickSummary;
  const txHash =
    typeof result?.txHash === "string"
      ? result.txHash
      : typeof result?.txHash?.toString === "function"
        ? result.txHash.toString()
        : "submitted";

  return { summary, txResult: txHash };
}

async function main() {
  const { api, keyring, service, config } = await createService();
  const inFlight = new Set<string>();

  console.log(`[keeper] keeper address ${keyring.address}`);
  console.log(`[keeper] endpoint ${config.varaWs}`);
  console.log(`[keeper] program ${config.programId}`);
  console.log(`[keeper] symbol ${config.binanceSymbol}`);
  console.log(`[keeper] interval ${config.tickIntervalMs}ms`);

  const tick = async () => {
    const tournaments = await withRetry("query tournaments", () => fetchTournaments(service));
    const eligible = tournaments.filter((tournament) => {
      const status = getOperationalStatus(tournament);
      return status === "Live" || status === "Ended";
    });

    if (!eligible.length) {
      console.log("[keeper] no active or ended tournaments to process");
      return;
    }

    const livePrice = await withRetry("fetch Binance price", () =>
      fetchBinancePrice(config.binanceSymbol, config.binancePriceUrl),
    );
    const scaledPrice = scalePriceToCents(livePrice);

    for (const tournament of eligible) {
      const tournamentId = tournament.tournament_id;
      if (inFlight.has(tournamentId)) {
        continue;
      }

      inFlight.add(tournamentId);

      try {
        const { summary, txResult } = await withRetry(
          `keeper tick tournament=${tournamentId}`,
          () => runKeeperTick(service, keyring, tournamentId, scaledPrice),
        );

        console.log(
          `[keeper] tournament=${tournamentId} price=${livePrice.toFixed(2)} scaled=${scaledPrice.toString()} closed=${summary.positions_closed} ended=${summary.tournament_ended} settled=${summary.tournament_settled} tx=${txResult}`,
        );
      } catch (error) {
        console.error(
          `[keeper] tournament=${tournamentId} price=${livePrice.toFixed(2)} failed`,
          error,
        );
      } finally {
        inFlight.delete(tournamentId);
      }
    }
  };

  await tick();
  const interval = setInterval(() => {
    void tick();
  }, config.tickIntervalMs);

  const shutdown = async () => {
    clearInterval(interval);
    console.log("[keeper] shutting down");
    await api.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main().catch((error) => {
  console.error("[keeper] fatal", error);
  process.exit(1);
});
