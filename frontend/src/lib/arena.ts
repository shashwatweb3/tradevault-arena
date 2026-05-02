import type { GearApi } from "@gear-js/api";
import { Sails } from "sails-js";
import { SailsIdlParser } from "sails-js-parser";
import idlRaw from "@/assets/tradevault_arena_client.idl?raw";
import { toActorId } from "@/lib/format";

export type TournamentStatus = "Upcoming" | "Active" | "Ended" | "Settled";
export type PositionDirection = "Long" | "Short";
export type CloseReason = "Manual" | "StopLoss" | "TakeProfit";

export type Position = {
  entry_price: string;
  size: string;
  direction: PositionDirection;
  stop_loss_price: string | null;
  take_profit_price: string | null;
  is_open: boolean;
};

export type ParticipantView = {
  tournament_id: string;
  participant: string;
  initial_virtual_balance: string;
  realized_pnl: string;
  unrealized_pnl: string;
  final_value: string;
  return_percentage_bps: string;
  position: Position | null;
  claimable_reward: string;
  last_close_reason: CloseReason | null;
  last_close_price: string | null;
};

export type WinnerPayout = {
  rank: number;
  participant: string;
  payout: string;
  final_value: string;
  return_percentage_bps: string;
};

export type TournamentView = {
  tournament_id: string;
  name: string;
  entry_fee: string;
  start_time: string;
  end_time: string;
  initial_virtual_balance: string;
  max_participants: number;
  participant_count: number;
  prize_pool: string;
  status: TournamentStatus;
  final_btc_price: string | null;
  winners: WinnerPayout[];
};

export type LeaderboardEntry = {
  rank: number;
  participant: string;
  final_value: string;
  realized_pnl: string;
  unrealized_pnl: string;
  return_percentage_bps: string;
  position: Position | null;
};

export type SettlementResult = {
  tournament_id: string;
  final_btc_price: string;
  prize_pool: string;
  winners: WinnerPayout[];
};

export type KeeperTickSummary = {
  price_updated: boolean;
  positions_closed: number;
  tournament_ended: boolean;
  tournament_settled: boolean;
};

export type TxAccount = {
  address: string;
  signer?: unknown | null;
};

export type CreateTournamentInput = {
  name: string;
  entryFee: bigint;
  startTime: bigint;
  endTime: bigint;
  initialVirtualBalance: bigint;
  maxParticipants: number;
};

let cachedApi: GearApi | null = null;
let cachedSails: Promise<Sails> | null = null;

async function getService(api: GearApi, programId: string): Promise<any> {
  if (!cachedSails || cachedApi !== api) {
    cachedApi = api;
    cachedSails = (async () => {
      const parser = await SailsIdlParser.new();
      const sails = new Sails(parser);
      sails.setApi(api);
      sails.parseIdl(idlRaw);
      return sails;
    })();
  }

  const sails = await cachedSails;
  sails.setProgramId(programId as `0x${string}`);

  const service =
    sails.services?.TradevaultArena ??
    sails.services?.tradevaultArena ??
    sails.services?.tradevaultarena ??
    Object.values(sails.services ?? {})[0];

  if (!service) {
    throw new Error("TradeVaultArena service was not found in the current IDL.");
  }

  return service;
}

async function runTransaction<T>(
  api: GearApi,
  programId: string,
  account: TxAccount,
  factory: (service: any) => any,
  value?: bigint,
  actionName = "unknown",
  payload?: unknown,
): Promise<T> {
  console.log("[tx] action", actionName);
  console.log("[tx] account", account.address);
  console.log("[tx] payload", payload ?? null);
  if (!account.signer) {
    const error = new Error("Wallet signer not ready.");
    console.error("[tx] failed", error);
    throw error;
  }

  const service = await getService(api, programId);
  const tx = factory(service);

  if (value && value > 0n) {
    tx.withValue(value);
  }

  tx.withAccount(account.address, account.signer ? { signer: account.signer } : undefined);
  await tx.calculateGas();

  try {
    const result = await tx.signAndSend();
    const response = await result.response();
    console.log("[tx] success", response);
    return response;
  } catch (error) {
    console.error("[tx] failed", error);
    throw error;
  }
}

export async function fetchAdmin(api: GearApi, programId: string): Promise<string> {
  const service = await getService(api, programId);
  return service.queries.Admin().call();
}

export async function fetchIsKeeper(
  api: GearApi,
  programId: string,
  address: string,
): Promise<boolean> {
  const service = await getService(api, programId);
  return service.queries.IsKeeper(toActorId(address)).call();
}

export async function fetchKeepers(api: GearApi, programId: string): Promise<string[]> {
  const service = await getService(api, programId);
  return service.queries.Keepers().call();
}

export async function fetchCurrentMockPrice(api: GearApi, programId: string): Promise<string> {
  const service = await getService(api, programId);
  return service.queries.CurrentMockPrice().call();
}

export async function fetchLastPriceUpdateTime(
  api: GearApi,
  programId: string,
): Promise<string> {
  const service = await getService(api, programId);
  return service.queries.LastPriceUpdateTime().call();
}

export async function fetchMaxStaleMs(api: GearApi, programId: string): Promise<string> {
  const service = await getService(api, programId);
  return service.queries.MaxStaleMs().call();
}

export async function fetchTournaments(
  api: GearApi,
  programId: string,
): Promise<TournamentView[]> {
  const service = await getService(api, programId);
  return service.queries.Tournaments().call();
}

export async function fetchParticipant(
  api: GearApi,
  programId: string,
  tournamentId: bigint,
  participant: string,
): Promise<ParticipantView> {
  const service = await getService(api, programId);
  const participantActorId = toActorId(participant);
  console.log("[TradeVaultArena] participant ActorId bytes", participantActorId.length);
  return service.queries.Participant(tournamentId, participantActorId).call();
}

export async function fetchLeaderboard(
  api: GearApi,
  programId: string,
  tournamentId: bigint,
): Promise<LeaderboardEntry[]> {
  const service = await getService(api, programId);
  return service.queries.Leaderboard(tournamentId).call();
}

export async function createTournament(
  api: GearApi,
  programId: string,
  account: TxAccount,
  input: CreateTournamentInput,
): Promise<TournamentView> {
  return runTransaction<TournamentView>(api, programId, account, (service) =>
    service.functions.CreateTournament(
      input.name,
      input.entryFee,
      input.startTime,
      input.endTime,
      input.initialVirtualBalance,
      input.maxParticipants,
    ),
    undefined,
    "create_tournament",
    input,
  );
}

export async function updateMockPrice(
  api: GearApi,
  programId: string,
  account: TxAccount,
  newPrice: bigint,
): Promise<string> {
  return runTransaction<string>(api, programId, account, (service) =>
    service.functions.UpdateMockPrice(newPrice),
    undefined,
    "update_mock_price",
    { newPrice: newPrice.toString() },
  );
}

export async function addKeeper(
  api: GearApi,
  programId: string,
  account: TxAccount,
  keeperAddress: string,
): Promise<boolean> {
  return runTransaction<boolean>(api, programId, account, (service) =>
    service.functions.AddKeeper(toActorId(keeperAddress)),
    undefined,
    "add_keeper",
    { keeperAddress },
  );
}

export async function removeKeeper(
  api: GearApi,
  programId: string,
  account: TxAccount,
  keeperAddress: string,
): Promise<boolean> {
  return runTransaction<boolean>(api, programId, account, (service) =>
    service.functions.RemoveKeeper(toActorId(keeperAddress)),
    undefined,
    "remove_keeper",
    { keeperAddress },
  );
}

export async function joinTournament(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
  entryFee: bigint,
): Promise<ParticipantView> {
  return runTransaction<ParticipantView>(
    api,
    programId,
    account,
    (service) => service.functions.JoinTournament(tournamentId),
    entryFee,
    "join_tournament",
    { tournamentId: tournamentId.toString(), entryFee: entryFee.toString() },
  );
}

export async function openPosition(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
  direction: PositionDirection,
  size: bigint,
  stopLossPrice?: bigint | null,
  takeProfitPrice?: bigint | null,
): Promise<ParticipantView> {
  return runTransaction<ParticipantView>(api, programId, account, (service) =>
    service.functions.OpenPosition(
      tournamentId,
      direction,
      size,
      stopLossPrice ?? null,
      takeProfitPrice ?? null,
    ),
    undefined,
    "open_position",
    {
      tournamentId: tournamentId.toString(),
      direction,
      size: size.toString(),
      stopLossPrice: stopLossPrice?.toString() ?? null,
      takeProfitPrice: takeProfitPrice?.toString() ?? null,
    },
  );
}

export async function closePosition(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
): Promise<ParticipantView> {
  return runTransaction<ParticipantView>(api, programId, account, (service) =>
    service.functions.ClosePosition(tournamentId),
    undefined,
    "close_position",
    { tournamentId: tournamentId.toString() },
  );
}

export async function endTournament(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
): Promise<TournamentView> {
  return runTransaction<TournamentView>(api, programId, account, (service) =>
    service.functions.EndTournament(tournamentId),
    undefined,
    "end_tournament",
    { tournamentId: tournamentId.toString() },
  );
}

export async function settleTournament(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
): Promise<SettlementResult> {
  return runTransaction<SettlementResult>(api, programId, account, (service) =>
    service.functions.SettleTournament(tournamentId),
    undefined,
    "settle_tournament",
    { tournamentId: tournamentId.toString() },
  );
}

export async function claimReward(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
): Promise<string> {
  return runTransaction<string>(api, programId, account, (service) =>
    service.functions.ClaimReward(tournamentId),
    undefined,
    "claim_reward",
    { tournamentId: tournamentId.toString() },
  );
}

export async function updatePriceAndProcess(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
  newPrice: bigint,
): Promise<KeeperTickSummary> {
  return runTransaction<KeeperTickSummary>(api, programId, account, (service) =>
    service.functions.UpdatePriceAndProcess(tournamentId, newPrice),
    undefined,
    "update_price_and_process",
    { tournamentId: tournamentId.toString(), newPrice: newPrice.toString() },
  );
}

export async function processTournament(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
): Promise<KeeperTickSummary> {
  return runTransaction<KeeperTickSummary>(api, programId, account, (service) =>
    service.functions.ProcessTournament(tournamentId),
    undefined,
    "process_tournament",
    { tournamentId: tournamentId.toString() },
  );
}

export async function keeperTick(
  api: GearApi,
  programId: string,
  account: TxAccount,
  tournamentId: bigint,
  newPrice: bigint,
): Promise<KeeperTickSummary> {
  return runTransaction<KeeperTickSummary>(api, programId, account, (service) =>
    service.functions.KeeperTick(tournamentId, newPrice),
    undefined,
    "keeper_tick",
    { tournamentId: tournamentId.toString(), newPrice: newPrice.toString() },
  );
}
