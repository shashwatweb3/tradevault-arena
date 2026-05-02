import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RocketLaunch,
} from "@phosphor-icons/react";
import { BarChart3, BookOpen, Home, LayoutDashboard, ShieldCheck, Trophy, WalletCards } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CloseReason,
  CreateTournamentInput,
  LeaderboardEntry,
  ParticipantView,
  PositionDirection,
  TournamentView,
} from "@/lib/arena";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { PriceTicker } from "@/components/ui/PriceTicker";
import { BGPattern } from "@/components/ui/bg-pattern";
import { AnimatedText } from "@/components/ui/animated-underline-text-one";
import { StatusPill as UiStatusPill } from "@/components/ui/StatusPill";
import { TournamentRow as FeatureTournamentRow } from "@/components/features/TournamentRow";
import { TradingChart } from "@/components/features/TradingChart";
import { OrderPanel } from "@/components/features/OrderPanel";
import { PositionCard } from "@/components/features/PositionCard";
import { MarketHeader } from "@/components/features/MarketHeader";
import { ClaimCard } from "@/components/features/ClaimCard";
import { AdminOverviewPanel } from "@/components/features/AdminOverviewPanel";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { ArenaCard } from "@/components/ui/arena-card";
import { LiveRankCard } from "@/components/ui/live-rank-card";
import { RewardCard } from "@/components/ui/reward-card";
import { QualificationBadge } from "@/components/ui/qualification-badge";
import { GlowTable } from "@/components/ui/glow-table";
import { VaultPositionCard } from "@/components/ui/vault-position-card";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";
import { LeaderboardPanel as CompactLeaderboardPanel } from "@/components/leaderboard/LeaderboardPanel";
import { VaultSummary as VaultSummaryPanel } from "@/components/vault/VaultSummary";
import { HowToStartCard } from "@/components/ui/HowToStartCard";
import { TradeConfirmModal } from "@/components/trade/TradeConfirmModal";
import type {
  ClaimableReward,
  TournamentHistoryItem,
  TxHistoryItem,
  UiLeaderboardEntry,
  VaultPosition,
  VaultSummary,
} from "@/components/ui/arena-types";
import type { QuickActionItem } from "@/components/features/QuickActions";
import {
  connectLiveBtcTickerStream,
  fetchLiveBtcHistory,
  fetchLiveBtcPrice,
  type LivePriceFeedStatus,
  type LivePricePoint,
  type LivePriceSnapshot,
} from "@/lib/live-price";
import {
  addKeeper,
  claimReward,
  closePosition,
  createTournament,
  fetchAdmin,
  fetchCurrentMockPrice,
  fetchKeepers,
  fetchLeaderboard,
  fetchLastPriceUpdateTime,
  fetchMaxStaleMs,
  fetchParticipant,
  fetchTournaments,
  joinTournament,
  keeperTick,
  openPosition,
  removeKeeper,
  settleTournament,
} from "@/lib/arena";
import type { EnabledWallet } from "@/lib/wallet";
import {
  describeCountdown,
  formatUsd,
  formatChainUsdPrice,
  formatPercentBps,
  formatPlanck,
  formatTimestamp,
  formatUsdPrice,
  fromContractPrice,
  isProgramIdLike,
  normalizeTimestampMs,
  parsePlanck,
  parseUnsignedInteger,
  sameAddress,
  shortAddress,
  toActorId,
  toContractPrice,
  toBigIntValue,
  toDatetimeLocalValue,
} from "@/lib/format";
import { useChainApi, useWallet } from "@/providers/chain-provider";
import { HomePage } from "@/pages/HomePage";
import { TournamentsPage } from "@/pages/TournamentsPage";
import { TradePage } from "@/pages/TradePage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { VaultPage } from "@/pages/VaultPage";
import { AdminPage } from "@/pages/AdminPage";
import { DocsPage } from "@/pages/DocsPage";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const CREATE_TOURNAMENT_START_BUFFER_SECONDS = 60;
const CREATE_TOURNAMENT_MIN_DURATION_SECONDS = 5 * 60;
const CREATE_TOURNAMENT_MAX_DURATION_SECONDS = 30 * 24 * 60 * 60;
const defaultCreateForm = () => ({
  name: "Weekend BTC Sprint",
  entryFee: "5",
  startTime: toDatetimeLocalValue(Date.now() + 10 * 60 * 1000),
  endTime: toDatetimeLocalValue(Date.now() + 70 * 60 * 1000),
  initialVirtualBalance: "1000",
  maxParticipants: "25",
});

type AppRoute = {
  page: "home" | "tournaments" | "leaderboard" | "vault" | "rewards" | "admin" | "docs" | "tournament" | "trade";
  tournamentId?: string;
};

type TradeHistoryItem = {
  action: "OPEN" | "CLOSE";
  direction: PositionDirection;
  size: string;
  entryPrice: string;
  exitPrice?: string;
  pnl?: string;
  closeReason?: CloseReason | null;
  timestamp: number;
};

type ToastItem = {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
};

type PendingTradeConfirm = {
  direction: PositionDirection;
  size: bigint;
  sizeLabel: string;
  riskControls: {
    stopLossPrice: bigint | null;
    takeProfitPrice: bigint | null;
  };
  stopLossLabel?: string | null;
  takeProfitLabel?: string | null;
};

export function App() {
  const queryClient = useQueryClient();
  const now = useNow();
  const { api, apiError, apiStatus, network, programId } = useChainApi();
  const {
    account,
    accounts,
    balance,
    connectWallet,
    disconnect,
    selectAccount,
    signer,
    walletError,
    walletStatus,
  } = useWallet();

  const [route, setRoute] = useHashRoute();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [tradeDirection, setTradeDirection] = useState<PositionDirection>("Long");
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [tradeSize, setTradeSize] = useState("100");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [keeperAddressInput, setKeeperAddressInput] = useState("");
  const [tradeFormError, setTradeFormError] = useState<string | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [streamedLiveHistory, setStreamedLiveHistory] = useState<LivePricePoint[]>([]);
  const [streamedLivePrice, setStreamedLivePrice] = useState<LivePriceSnapshot | null>(null);
  const [livePriceFeedStatus, setLivePriceFeedStatus] =
    useState<LivePriceFeedStatus>("connecting");
  const [tradeConfirmState, setTradeConfirmState] = useState<{
    direction: PositionDirection;
    sizeLabel: string;
    tournamentPriceLabel: string;
    stopLossLabel?: string | null;
    takeProfitLabel?: string | null;
  } | null>(null);
  const txInFlightRef = useRef(false);
  const pendingTradeRef = useRef<PendingTradeConfirm | null>(null);
  const postConnectNoticeRef = useRef<string | null>(null);
  const previousOpenPositionRef = useRef<{
    tournamentId: string;
    direction: PositionDirection;
    size: string;
    entryPrice: string;
  } | null>(null);
  const lastDetectedCloseRef = useRef<string | null>(null);
  const isWalletConnectBusy =
    walletStatus === "loading" || walletStatus === "connecting";

  const isChainReady = apiStatus === "ready" && Boolean(api);
  const hasProgramId = isProgramIdLike(programId);
  const txAccount = account ? { address: account.address, signer } : null;

  const pushToast = useCallback((tone: ToastItem["tone"], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, message }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const refreshArena = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
      queryClient.invalidateQueries({ queryKey: ["current-price"] }),
      queryClient.invalidateQueries({ queryKey: ["last-price-update-time"] }),
      queryClient.invalidateQueries({ queryKey: ["max-stale-ms"] }),
      queryClient.invalidateQueries({ queryKey: ["keepers"] }),
      queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
      queryClient.invalidateQueries({ queryKey: ["participant"] }),
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
    ]);
  }, [queryClient]);

  const adminQuery = useQuery({
    queryKey: ["admin", network.endpoint, programId],
    queryFn: () => fetchAdmin(api!, programId),
    enabled: isChainReady && hasProgramId,
  });

  const currentPriceQuery = useQuery({
    queryKey: ["current-price", network.endpoint, programId],
    queryFn: () => fetchCurrentMockPrice(api!, programId),
    enabled: isChainReady && hasProgramId,
    refetchInterval: 3_000,
  });

  const lastPriceUpdateTimeQuery = useQuery({
    queryKey: ["last-price-update-time", network.endpoint, programId],
    queryFn: () => fetchLastPriceUpdateTime(api!, programId),
    enabled: isChainReady && hasProgramId,
    refetchInterval: 3_000,
  });

  const maxStaleMsQuery = useQuery({
    queryKey: ["max-stale-ms", network.endpoint, programId],
    queryFn: () => fetchMaxStaleMs(api!, programId),
    enabled: isChainReady && hasProgramId,
    refetchInterval: 30_000,
  });

  const keepersQuery = useQuery({
    queryKey: ["keepers", network.endpoint, programId],
    queryFn: () => fetchKeepers(api!, programId),
    enabled: isChainReady && hasProgramId,
    refetchInterval: 10_000,
  });

  const livePriceQuery = useQuery({
    queryKey: ["live-btc-price"],
    queryFn: fetchLiveBtcPrice,
    refetchInterval: livePriceFeedStatus === "streaming" ? false : 3_000,
  });

  const liveHistoryQuery = useQuery({
    queryKey: ["live-btc-history"],
    queryFn: fetchLiveBtcHistory,
    refetchInterval: 5 * 60_000,
  });

  const tournamentsQuery = useQuery({
    queryKey: ["tournaments", network.endpoint, programId],
    queryFn: () => fetchTournaments(api!, programId),
    enabled: isChainReady && hasProgramId,
    refetchInterval: 3_000,
  });

  const tournaments = (tournamentsQuery.data ?? []).slice().sort((left, right) =>
    Number(toBigIntValue(right.tournament_id) - toBigIntValue(left.tournament_id)),
  );

  useEffect(() => {
    if (!tournaments.length) {
      setSelectedTournamentId("");
      return;
    }

    const existing = tournaments.some(
      (tournament) => tournament.tournament_id === selectedTournamentId,
    );
    if (!selectedTournamentId || !existing) {
      const preferred =
        tournaments.find((tournament) => getTournamentLifecycleState(tournament, now) === "Live") ??
        tournaments.find((tournament) => getTournamentLifecycleState(tournament, now) === "Upcoming") ??
        tournaments[0];
      setSelectedTournamentId(preferred.tournament_id);
    }
  }, [now, selectedTournamentId, tournaments]);

  const selectedTournament =
    tournaments.find((tournament) => tournament.tournament_id === selectedTournamentId) ?? null;

  useEffect(() => {
    if (!account?.address || !selectedTournamentId) {
      setTradeHistory([]);
      return;
    }

    setTradeHistory(readTradeHistory(programId, account.address, selectedTournamentId));
  }, [account?.address, programId, selectedTournamentId]);

  useEffect(() => {
    setStopLossPrice("");
    setTakeProfitPrice("");
  }, [selectedTournamentId]);

  useEffect(() => {
    if (route.page === "tournament" && route.tournamentId) {
      setSelectedTournamentId(route.tournamentId);
    }
  }, [route.page, route.tournamentId]);

  useEffect(() => {
    setWalletModalOpen(false);
  }, [route]);

  const participantQuery = useQuery({
    queryKey: [
      "participant",
      network.endpoint,
      programId,
      selectedTournament?.tournament_id,
      account?.address,
    ],
    queryFn: () =>
      fetchParticipant(
        api!,
        programId,
        toBigIntValue(selectedTournament?.tournament_id),
        account!.address,
      ),
    enabled: isChainReady && hasProgramId && Boolean(selectedTournament) && Boolean(account),
    retry: false,
    refetchInterval: (query) =>
      account && selectedTournament && query.state.data ? 3_000 : false,
  });

  const participantErrorMessage = extractErrorMessage(participantQuery.error);
  const participantNotFound = participantErrorMessage.includes("ParticipantNotFound");
  const participant = participantNotFound ? null : participantQuery.data ?? null;

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", network.endpoint, programId, selectedTournament?.tournament_id],
    queryFn: () =>
      fetchLeaderboard(api!, programId, toBigIntValue(selectedTournament?.tournament_id)),
    enabled: isChainReady && hasProgramId && Boolean(selectedTournament),
    refetchInterval:
      selectedTournament && getTournamentLifecycleState(selectedTournament, now) === "Live"
        ? 3_000
        : false,
  });

  const isAdmin = sameAddress(account?.address, adminQuery.data);
  const createTimeValidation = useMemo(
    () => validateCreateTournamentTimes(createForm.startTime, createForm.endTime),
    [createForm.startTime, createForm.endTime],
  );
  const createTournamentMutation = useMutation({
    mutationFn: async (input: CreateTournamentInput) => {
      if (!api || !txAccount) throw new Error("Connect a wallet to create a tournament.");
      return createTournament(api, programId, txAccount, input);
    },
    onSuccess: (created) => {
      setSelectedTournamentId(created.tournament_id);
      setCreateForm(defaultCreateForm());
      setCreateFormError(null);
    },
  });
  const updatePriceMutation = useMutation({
    mutationFn: async (newPrice: bigint) => {
      if (!api || !txAccount || !selectedTournament) {
        throw new Error("Select a tournament and connect the admin wallet first.");
      }
      return keeperTick(
        api,
        programId,
        txAccount,
        toBigIntValue(selectedTournament.tournament_id),
        newPrice,
      );
    },
    onSuccess: () => {
      setSyncWarning(null);
    },
    onError: (error) => setSyncWarning(extractErrorMessage(error)),
  });
  const settleTournamentMutation = useMutation({
    mutationFn: async () => {
      if (!api || !txAccount || !selectedTournament) {
        throw new Error("Select a tournament and connect the admin wallet first.");
      }
      return settleTournament(
        api,
        programId,
        txAccount,
        toBigIntValue(selectedTournament.tournament_id),
      );
    },
  });
  const addKeeperMutation = useMutation({
    mutationFn: async (keeperAddress: string) => {
      if (!api || !txAccount) {
        throw new Error("Connect the admin wallet first.");
      }
      return addKeeper(api, programId, txAccount, keeperAddress);
    },
    onSuccess: () => {
      setKeeperAddressInput("");
    },
  });
  const removeKeeperMutation = useMutation({
    mutationFn: async (keeperAddress: string) => {
      if (!api || !txAccount) {
        throw new Error("Connect the admin wallet first.");
      }
      return removeKeeper(api, programId, txAccount, keeperAddress);
    },
    onSuccess: () => {
      setKeeperAddressInput("");
    },
  });
  const joinMutation = useMutation({
    mutationFn: async (tournament: TournamentView) => {
      if (!api || !txAccount) throw new Error("Connect a wallet to join.");
      return joinTournament(
        api,
        programId,
        txAccount,
        toBigIntValue(tournament.tournament_id),
        toBigIntValue(tournament.entry_fee),
      );
    },
    onSuccess: (_result, _tournament) => {
      setTradeFormError(null);
    },
  });

  const openPositionMutation = useMutation({
    mutationFn: async ({
      direction,
      size,
      riskControls,
    }: {
      direction: PositionDirection;
      size: bigint;
      riskControls: {
        stopLossPrice: bigint | null;
        takeProfitPrice: bigint | null;
      };
    }) => {
      if (!api || !txAccount || !selectedTournament) {
        throw new Error("Select a tournament and connect a wallet first.");
      }

      return openPosition(
        api,
        programId,
        txAccount,
        toBigIntValue(selectedTournament.tournament_id),
        direction,
        size,
        riskControls.stopLossPrice,
        riskControls.takeProfitPrice,
      );
    },
    onSuccess: (_result, variables) => {
      if (account?.address && selectedTournament?.tournament_id && currentPriceValue > 0n) {
        const nextHistory = appendTradeHistory(
          programId,
          account.address,
          selectedTournament.tournament_id,
          tradeHistory,
          {
            action: "OPEN",
            direction: variables.direction,
            size: variables.size.toString(),
            entryPrice: currentPriceValue.toString(),
            timestamp: Date.now(),
          },
        );
        setTradeHistory(nextHistory);
      }
      setTradeFormError(null);
    },
  });

  const closePositionMutation = useMutation({
    mutationFn: async () => {
      if (!api || !txAccount || !selectedTournament) {
        throw new Error("Select a tournament and connect a wallet first.");
      }

      return closePosition(
        api,
        programId,
        txAccount,
        toBigIntValue(selectedTournament.tournament_id),
      );
    },
    onSuccess: (result) => {
      setStopLossPrice("");
      setTakeProfitPrice("");

      if (
        account?.address &&
        selectedTournament?.tournament_id &&
        participant?.position &&
        currentPriceValue > 0n
      ) {
        const nextHistory = appendTradeHistory(
          programId,
          account.address,
          selectedTournament.tournament_id,
          tradeHistory,
          {
            action: "CLOSE",
            direction: participant.position.direction,
            size: participant.position.size,
            entryPrice: participant.position.entry_price,
            exitPrice: currentPriceValue.toString(),
            pnl: calculateSyntheticPnl(
              participant.position.direction,
              toBigIntValue(participant.position.size),
              toBigIntValue(participant.position.entry_price),
              currentPriceValue,
            ).toString(),
            closeReason: result.last_close_reason,
            timestamp: Date.now(),
          },
        );
        setTradeHistory(nextHistory);
      }
    },
  });

  const claimRewardMutation = useMutation({
    mutationFn: async () => {
      if (!api || !txAccount || !selectedTournament) {
        throw new Error("Select a tournament and connect a wallet first.");
      }

      return claimReward(
        api,
        programId,
        txAccount,
        toBigIntValue(selectedTournament.tournament_id),
      );
    },
  });

  const handleCreateTournament = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTournamentMutation.reset();
    setCreateFormError(null);

    try {
      if (!hasProgramId) throw new Error("Paste a deployed program ID before using admin actions.");

      const name = createForm.name.trim();
      if (!name) throw new Error("Tournament name is required.");
      if (createTimeValidation.error) throw new Error(createTimeValidation.error);
      if (createTimeValidation.startMs == null || createTimeValidation.endMs == null) {
        throw new Error("Start and end times must be valid timestamps.");
      }

      const input: CreateTournamentInput = {
        name,
        entryFee: parsePlanck(createForm.entryFee),
        startTime: BigInt(createTimeValidation.startMs),
        endTime: BigInt(createTimeValidation.endMs),
        initialVirtualBalance: parseUnsignedInteger(
          createForm.initialVirtualBalance,
          "Initial virtual balance",
        ),
        maxParticipants: Number(
          parseUnsignedInteger(createForm.maxParticipants, "Max participants"),
        ),
      };

      if (input.maxParticipants <= 0) {
        throw new Error("Max participants must be greater than zero.");
      }

      void runUserTx(
        "Create Tournament",
        () => createTournamentMutation.mutateAsync(input),
        {
          requireAdmin: true,
          retryMessage: "Wallet connected. Click Create Tournament again to continue.",
          successMessage: "Tournament created.",
        },
      );
    } catch (error) {
      setCreateFormError(extractErrorMessage(error));
    }
  };

  const handleOpenPosition = () => {
    openPositionMutation.reset();
    setTradeFormError(null);

    try {
      if (!selectedTournament) throw new Error("Pick a tournament first.");
      if (!participant) {
        throw new Error("Join the selected tournament before opening a position.");
      }
      const tradingBlockedReason = getTradingDisabledReason(
        selectedTournament,
        participant,
        now,
        priceStale,
      );
      if (tradingBlockedReason) {
        throw new Error(tradingBlockedReason);
      }
      const parsedRiskControls = parseRiskControls({
        direction: tradeDirection,
        entryPrice: currentTournamentPriceNumber,
        stopLossInput: stopLossPrice,
        takeProfitInput: takeProfitPrice,
      });
      const parsedSize = parseUnsignedInteger(tradeSize, "Position size");
      pendingTradeRef.current = {
        direction: tradeDirection,
        size: parsedSize,
        sizeLabel: formatUsd(Number(parsedSize)),
        riskControls: {
          stopLossPrice: parsedRiskControls.stopLossPrice ?? null,
          takeProfitPrice: parsedRiskControls.takeProfitPrice ?? null,
        },
        stopLossLabel: stopLossPrice.trim() ? stopLossPrice.trim() : null,
        takeProfitLabel: takeProfitPrice.trim() ? takeProfitPrice.trim() : null,
      };
      setTradeConfirmState({
        direction: tradeDirection,
        sizeLabel: formatUsd(Number(parsedSize)),
        tournamentPriceLabel: formatChainUsdPrice(currentPriceValue),
        stopLossLabel: stopLossPrice.trim() ? stopLossPrice.trim() : null,
        takeProfitLabel: takeProfitPrice.trim() ? takeProfitPrice.trim() : null,
      });
    } catch (error) {
      setTradeFormError(extractErrorMessage(error));
    }
  };

  useEffect(() => {
    return connectLiveBtcTickerStream({
      onUpdate: (snapshot) => {
        setStreamedLivePrice(snapshot);
      },
      onStatusChange: (status) => {
        setLivePriceFeedStatus(status);
        if (status === "reconnecting") {
          setStreamedLivePrice(null);
        }
      },
    });
  }, []);

  const activeLivePrice =
    livePriceFeedStatus === "streaming" && streamedLivePrice
      ? streamedLivePrice
      : livePriceQuery.data ?? streamedLivePrice ?? null;
  const currentPriceValue = currentPriceQuery.data ? toBigIntValue(currentPriceQuery.data) : 0n;
  const displayedTournamentPriceValue =
    selectedTournament?.final_btc_price != null
      ? toBigIntValue(selectedTournament.final_btc_price)
      : currentPriceValue;
  const livePriceValue = activeLivePrice ? toContractPrice(activeLivePrice.price) : 0n;
  const currentTournamentPriceNumber =
    displayedTournamentPriceValue > 0n ? fromContractPrice(displayedTournamentPriceValue) : 0;
  const livePriceNumber = activeLivePrice?.price ?? 0;
  const livePriceChange24h = activeLivePrice?.change24h ?? 0;
  const usingFallbackPriceSource = activeLivePrice?.source === "fallback";
  const livePriceLabel = activeLivePrice ? formatUsdPrice(activeLivePrice.price) : "BTC --";
  const tournamentPriceLabel = displayedTournamentPriceValue
    ? formatChainUsdPrice(displayedTournamentPriceValue)
    : "$0.00";
  const priceSourceNotice =
    livePriceFeedStatus === "reconnecting"
      ? "Reconnecting price feed..."
      : usingFallbackPriceSource
        ? "Using fallback price source"
        : undefined;
  useEffect(() => {
    if (!liveHistoryQuery.data?.length) return;
    setStreamedLiveHistory((current) =>
      current.length ? current : liveHistoryQuery.data.slice(-120),
    );
  }, [liveHistoryQuery.data]);

  useEffect(() => {
    const nextLivePrice = activeLivePrice?.price;
    if (typeof nextLivePrice !== "number") return;

    setStreamedLiveHistory((current) => {
      const base = current.length ? current : liveHistoryQuery.data?.slice(-120) ?? [];
      const nextTimestamp = Math.floor((activeLivePrice?.updatedAt ?? Date.now()) / 1000) * 1000;
      const previousTimestamp = base.length
        ? Math.floor(base[base.length - 1]!.timestamp / 1000) * 1000
        : 0;
      if (nextTimestamp <= previousTimestamp) {
        return current;
      }
      const nextPoint: LivePricePoint = {
        price: nextLivePrice,
        timestamp: nextTimestamp,
        open: nextLivePrice,
        high: nextLivePrice,
        low: nextLivePrice,
        close: nextLivePrice,
      };
      return [...base, nextPoint].slice(-120);
    });
  }, [activeLivePrice, liveHistoryQuery.data]);

  const liveHistory = streamedLiveHistory;
  const tradeSizeNumber = parseTradeSizeNumber(tradeSize);
  const estimatedTradeMetrics =
    currentTournamentPriceNumber > 0 && livePriceNumber > 0 && tradeSizeNumber > 0
      ? calculatePnl({
          direction: tradeDirection,
          size: tradeSizeNumber,
          entryPrice: currentTournamentPriceNumber,
          currentPrice: livePriceNumber,
        })
      : { pnl: 0, returnPct: 0 };

  const featuredTournaments = tournaments.slice(0, 3);
  const selectedTournamentState = selectedTournament
    ? getTournamentLifecycleState(selectedTournament, now)
    : null;
  const selectedTournamentStatusKind = selectedTournamentState
    ? mapStatusKind(selectedTournamentState)
    : "ended";
  const selectedTournamentStatusLabel = selectedTournamentState
    ? mapStatusLabel(selectedTournamentState)
    : "Idle";
  const onChainLastPriceSyncAt = lastPriceUpdateTimeQuery.data
    ? normalizeTimestampMs(lastPriceUpdateTimeQuery.data)
    : null;
  const maxStaleMsValue = Number(toBigIntValue(maxStaleMsQuery.data ?? 30_000));
  const keeperFreshnessMs =
    onChainLastPriceSyncAt != null
      ? Math.max(0, now - onChainLastPriceSyncAt)
      : null;
  const priceStale =
    selectedTournamentState === "Live"
      && (
        currentPriceValue <= 0n
        || onChainLastPriceSyncAt == null
        || keeperFreshnessMs == null
        || keeperFreshnessMs > maxStaleMsValue
      );
  const syncStatusLabel = getPriceSyncStatus({
    isSyncing: updatePriceMutation.isPending,
    lastPriceSyncAt: onChainLastPriceSyncAt,
    now,
    tournamentState: selectedTournamentState,
    isStale: priceStale,
    maxStaleMs: maxStaleMsValue,
  });
  const tournamentPriceHelperText =
    selectedTournamentState === "Live"
      ? "Keeper updates tournament price on-chain."
      : "Tournament price is fixed once the tournament closes.";
  const marketSourceNotice = syncWarning ?? priceSourceNotice;
  const livePreviewMetrics =
    participant?.position?.is_open && livePriceNumber > 0
      ? calculatePnl({
          direction: participant.position.direction,
          size: Number(toBigIntValue(participant.position.size)),
          entryPrice: fromContractPrice(participant.position.entry_price),
          currentPrice: livePriceNumber,
        })
      : { pnl: 0, returnPct: 0 };
  const tradeDisabledReasonBase = selectedTournament
    ? getTradingDisabledReason(selectedTournament, participant, now, priceStale)
    : null;
  const tradeDisabledReason = tradeDisabledReasonBase;

  useEffect(() => {
    if (!participant?.position?.is_open || !selectedTournament) return;

    const id = window.setInterval(() => {
      void Promise.allSettled([
        participantQuery.refetch(),
        currentPriceQuery.refetch(),
        leaderboardQuery.refetch(),
      ]);
    }, 3_000);

    return () => window.clearInterval(id);
  }, [
    currentPriceQuery.refetch,
    leaderboardQuery.refetch,
    participant?.position?.is_open,
    participantQuery.refetch,
    selectedTournament?.tournament_id,
  ]);

  useEffect(() => {
    if (participant?.position?.is_open && selectedTournament?.tournament_id) {
      previousOpenPositionRef.current = {
        tournamentId: selectedTournament.tournament_id,
        direction: participant.position.direction,
        size: participant.position.size,
        entryPrice: participant.position.entry_price,
      };
      return;
    }

    const previousOpenPosition = previousOpenPositionRef.current;
    if (
      !previousOpenPosition ||
      !participant ||
      !account?.address ||
      !selectedTournament?.tournament_id ||
      previousOpenPosition.tournamentId !== selectedTournament.tournament_id ||
      !participant.last_close_reason ||
      !participant.last_close_price
    ) {
      return;
    }

    const closeKey = `${selectedTournament.tournament_id}-${participant.last_close_reason}-${participant.last_close_price}-${participant.realized_pnl}`;
    if (lastDetectedCloseRef.current === closeKey) {
      previousOpenPositionRef.current = null;
      return;
    }

    setTradeHistory((current) =>
      appendTradeHistory(
        programId,
        account.address,
        selectedTournament.tournament_id,
        current,
        {
          action: "CLOSE",
          direction: previousOpenPosition.direction,
          size: previousOpenPosition.size,
          entryPrice: previousOpenPosition.entryPrice,
          exitPrice: participant.last_close_price ?? undefined,
          pnl:
            participant.last_close_price != null
              ? calculateSyntheticPnl(
                  previousOpenPosition.direction,
                  toBigIntValue(previousOpenPosition.size),
                  toBigIntValue(previousOpenPosition.entryPrice),
                  toBigIntValue(participant.last_close_price),
                ).toString()
              : undefined,
          closeReason: participant.last_close_reason,
          timestamp: Date.now(),
        },
      ),
    );
    lastDetectedCloseRef.current = closeKey;
    previousOpenPositionRef.current = null;
  }, [
    account?.address,
    participant,
    participant?.position?.is_open,
    programId,
    selectedTournament?.tournament_id,
  ]);

  const openTournament = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setRoute({ page: "trade", tournamentId });
  };

  const handleModalWalletConnect = useCallback(
    async (enabledWallet: EnabledWallet, address?: string): Promise<boolean> => {
      try {
        await connectWallet(enabledWallet, address);
        setWalletModalOpen(false);
        pushToast(
          "success",
          postConnectNoticeRef.current ?? "Wallet connected.",
        );
        postConnectNoticeRef.current = null;
        return true;
      } catch (error) {
        pushToast("error", extractErrorMessage(error));
        return false;
      }
    },
    [connectWallet, pushToast],
  );

  const handleConnectWallet = useCallback(async (postConnectMessage?: string): Promise<"picker" | "failed"> => {
    if (isWalletConnectBusy) return "failed";

    try {
      postConnectNoticeRef.current = postConnectMessage ?? null;
      setWalletModalOpen(true);
      return "picker";
    } catch (error) {
      pushToast("error", extractErrorMessage(error));
      return "failed";
    }
  }, [isWalletConnectBusy, pushToast]);

  const runUserTx = useCallback(
    async <T,>(
      actionName: string,
      fn: () => Promise<T>,
      options?: {
        requireAdmin?: boolean;
        retryMessage?: string;
        successMessage?: string;
        submittedMessage?: string;
      },
    ): Promise<T | undefined> => {
      if (txInFlightRef.current) return undefined;

      if (!account) {
        await handleConnectWallet(
          options?.retryMessage ?? `Wallet connected. Click ${actionName} again to continue.`,
        );
        return undefined;
      }

      if (!signer) {
        pushToast("error", "Wallet signer not ready.");
        return undefined;
      }

      if (options?.requireAdmin && !isAdmin) {
        pushToast("error", "Admin wallet required.");
        return undefined;
      }

      txInFlightRef.current = true;
      try {
        pushToast("info", "Waiting for wallet approval");
        const result = await fn();
        pushToast("info", options?.submittedMessage ?? "Transaction submitted");
        pushToast("success", options?.successMessage ?? "Confirmed");
        await refreshArena();
        return result;
      } catch (error) {
        pushToast("error", getFriendlyTxError(error));
        throw error;
      } finally {
        txInFlightRef.current = false;
      }
    },
    [account, handleConnectWallet, isAdmin, pushToast, refreshArena, signer],
  );

  const confirmOpenPosition = useCallback(() => {
    const pendingTrade = pendingTradeRef.current;
    if (!pendingTrade) return;

    void runUserTx(
      pendingTrade.direction === "Long" ? "Open Long" : "Open Short",
      () =>
        openPositionMutation.mutateAsync({
          direction: pendingTrade.direction,
          size: pendingTrade.size,
          riskControls: pendingTrade.riskControls,
        }),
      {
        retryMessage: "Wallet connected. Click the trade button again to continue.",
        submittedMessage: "Transaction submitted",
        successMessage: `${pendingTrade.direction} position confirmed at ${formatChainUsdPrice(currentPriceValue)}.`,
      },
    ).finally(() => {
      pendingTradeRef.current = null;
      setTradeConfirmState(null);
    });
  }, [currentPriceValue, openPositionMutation, runUserTx]);

  const handleJoinTournament = useCallback(
    (tournament: TournamentView) => {
      const reason = getJoinReason(tournament, now);
      if (reason) {
        pushToast("error", reason);
        return;
      }
      joinMutation.reset();
      void runUserTx(
        "Join Tournament",
        () => joinMutation.mutateAsync(tournament),
        {
          retryMessage: "Wallet connected. Click Join again to confirm your entry.",
          successMessage: `Joined tournament. ${formatPlanck(tournament.entry_fee)} entry fee submitted.`,
        },
      );
    },
    [joinMutation, now, pushToast, runUserTx],
  );

  const banner = resolveBanner({
    apiError,
    apiStatus,
    hasProgramId,
    networkName: network.name,
    walletError,
    walletStatus,
    accountAddress: account?.address ?? null,
  });

  const preferredTradeTournament =
    selectedTournament ??
    tournaments.find((tournament) => getTournamentLifecycleState(tournament, now) === "Live") ??
    tournaments.find((tournament) => getTournamentLifecycleState(tournament, now) === "Upcoming") ??
    tournaments[0] ??
    null;

  const tradeRoute: AppRoute = selectedTournament
    ? { page: "trade", tournamentId: selectedTournament.tournament_id }
    : { page: "trade" };
  const tradeViewTournament =
    route.page === "trade" && !route.tournamentId ? null : selectedTournament;

  function handleManualPriceSync() {
    if (!selectedTournament) {
      pushToast("error", "Select a tournament first.");
      return;
    }
    if (livePriceValue <= 0n) {
      setSyncWarning("Live BTC price is not ready.");
      return;
    }
    updatePriceMutation.reset();
    void runUserTx(
      "Sync Price & Process",
      () => updatePriceMutation.mutateAsync(livePriceValue),
      {
        requireAdmin: true,
        retryMessage: "Wallet connected. Click Sync Price & Process again to continue.",
        successMessage: "Sync Price & Process completed.",
      },
    );
  }

  function handleSettleTournament() {
    if (!selectedTournament) {
      pushToast("error", "Select a tournament first.");
      return;
    }
    settleTournamentMutation.reset();
    void runUserTx(
      "Settle Tournament",
      () => settleTournamentMutation.mutateAsync(),
      {
        requireAdmin: true,
        retryMessage: "Wallet connected. Click Settle Tournament again to continue.",
        successMessage: "Tournament settled.",
      },
    );
  }

  function handleOpenDocs() {
    setRoute({ page: "docs" });
  }

  function parseKeeperAddressInput() {
    const normalized = keeperAddressInput.trim();
    if (!normalized) {
      throw new Error("Enter a keeper wallet address.");
    }
    toActorId(normalized);
    return normalized;
  }

  function handleAddKeeper() {
    addKeeperMutation.reset();
    try {
      const keeperAddress = parseKeeperAddressInput();
      void runUserTx(
        "Add Keeper",
        () => addKeeperMutation.mutateAsync(keeperAddress),
        {
          requireAdmin: true,
          retryMessage: "Wallet connected. Click Add Keeper again to continue.",
          successMessage: "Keeper added.",
        },
      );
    } catch (error) {
      pushToast("error", extractErrorMessage(error));
    }
  }

  function handleRemoveKeeper() {
    removeKeeperMutation.reset();
    try {
      const keeperAddress = parseKeeperAddressInput();
      void runUserTx(
        "Remove Keeper",
        () => removeKeeperMutation.mutateAsync(keeperAddress),
        {
          requireAdmin: true,
          retryMessage: "Wallet connected. Click Remove Keeper again to continue.",
          successMessage: "Keeper removed.",
        },
      );
    } catch (error) {
      pushToast("error", extractErrorMessage(error));
    }
  }

  function handleClosePosition() {
    if (!tradeViewTournament) {
      pushToast("error", "Select a tournament first.");
      return;
    }
    closePositionMutation.reset();
    void runUserTx(
      "Close Position",
      () => closePositionMutation.mutateAsync(),
      {
        retryMessage: "Wallet connected. Click Close Position again to continue.",
        successMessage: `Position closed with ${formatSignedUsd(Number(toBigIntValue(participant?.realized_pnl ?? 0n)))} PnL.`,
      },
    );
  }

  const pageTitle =
    route.page === "home"
      ? "TradeVault Arena"
      : route.page === "tournaments"
        ? "Tournaments"
      : route.page === "trade" || route.page === "tournament"
          ? tradeViewTournament?.name ?? "Trade"
        : route.page === "leaderboard"
            ? "Leaderboard"
            : route.page === "docs"
              ? "Documentation"
            : route.page === "vault" || route.page === "rewards"
              ? "My Vault"
              : "Admin";

  const activeRouteKey =
    (route.page === "tournament" || route.page === "trade") && route.tournamentId
      ? `${route.page}-${route.tournamentId}`
      : route.page;

  const shellActiveKey =
    route.page === "tournament" || route.page === "trade"
      ? "trade"
      : route.page === "vault" || route.page === "rewards"
        ? "vault"
        : route.page;

  const shellNavItems = [
    { key: "home", label: "Home", icon: <Home size={16} />, onClick: () => setRoute({ page: "home" }) },
    { key: "tournaments", label: "Tournaments", icon: <LayoutDashboard size={16} />, onClick: () => setRoute({ page: "tournaments" }) },
    { key: "trade", label: "Trade", icon: <BarChart3 size={16} />, onClick: () => setRoute(tradeRoute) },
    { key: "leaderboard", label: "Leaderboard", icon: <Trophy size={16} />, onClick: () => setRoute({ page: "leaderboard" }) },
    { key: "vault", label: "My Vault", icon: <WalletCards size={16} />, onClick: () => setRoute({ page: "vault" }) },
    { key: "docs", label: "Docs", icon: <BookOpen size={16} />, onClick: () => setRoute({ page: "docs" }) },
    ...(isAdmin ? [{ key: "admin", label: "Admin", badge: "Admin", icon: <ShieldCheck size={16} />, onClick: () => setRoute({ page: "admin" }) }] : []),
  ];

  const leaderboardEntries = leaderboardQuery.data ?? [];
  const leaderboardProjection = useMemo(
    () =>
      buildLeaderboardProjection({
        entries: leaderboardEntries,
        tournament: selectedTournament,
        currentAccount: account?.address ?? null,
        currentTradeCount: tradeHistory.length,
      }),
    [account?.address, leaderboardEntries, selectedTournament, tradeHistory.length],
  );
  const leaderboardPodium = leaderboardProjection.qualified.slice(0, 3).map((entry) => ({
    key: `podium-${entry.rank}-${entry.participant}`,
    rank: entry.rank,
    address: shortAddress(entry.participant),
    returnPct: formatPercentBps(entry.return_percentage_bps),
    prize: entry.rank === 1 ? "1st place · 60%" : entry.rank === 2 ? "2nd place · 30%" : "3rd place · 10%",
    highlight: sameAddress(entry.participant, account?.address ?? null),
    badgeLabel: sameAddress(entry.participant, account?.address ?? null) ? "You" : undefined,
  }));
  const leaderboardRows = leaderboardProjection.qualified.map((entry) => {
    const returnBps = toBigIntValue(entry.return_percentage_bps);
    return {
      key: `row-${entry.rank}-${entry.participant}`,
      rank: entry.rank,
      address: shortAddress(entry.participant),
      returnPct: formatPercentBps(entry.return_percentage_bps),
      pnl: formatSignedUsd(Number(toBigIntValue(entry.realized_pnl))),
      vault: formatUsd(Number(toBigIntValue(entry.final_value))),
      highlight: sameAddress(entry.participant, account?.address ?? null),
      positive: returnBps > 0n,
      negative: returnBps < 0n,
      badgeLabel: sameAddress(entry.participant, account?.address ?? null) ? "You" : undefined,
    };
  });
  const leaderboardInactiveRows = leaderboardProjection.inactive.map((entry) => ({
    key: `inactive-${entry.participant}`,
    address: shortAddress(entry.participant),
    note: "Not qualified: no trades placed",
    highlight: sameAddress(entry.participant, account?.address ?? null),
    badgeLabel: sameAddress(entry.participant, account?.address ?? null) ? "You" : undefined,
  }));
  const participantLeaderboardEntry = participant
    ? leaderboardProjection.qualified.find((entry) =>
        sameAddress(entry.participant, participant.participant),
      ) ?? null
    : null;
  const participantWinner = selectedTournament?.winners.find((winner) =>
    sameAddress(winner.participant, participant?.participant ?? null),
  ) ?? null;
  const participantQualified = participant
    ? isParticipantQualified({
        participantAddress: participant.participant,
        finalValue: participant.final_value,
        realizedPnl: participant.realized_pnl,
        unrealizedPnl: participant.unrealized_pnl,
        positionOpen: Boolean(participant.position?.is_open),
        tournament: selectedTournament,
        currentAccount: account?.address ?? null,
        currentTradeCount: tradeHistory.length,
      })
    : false;
  const leaderboardTournamentState = selectedTournamentState;
  const leaderboardIsUpcoming = leaderboardTournamentState === "Upcoming";
  const leaderboardIsActive = leaderboardTournamentState === "Live";
  const leaderboardIsEndedPending = leaderboardTournamentState === "Ended";
  const leaderboardIsSettled =
    leaderboardTournamentState === "Settled" || leaderboardTournamentState === "Claim Open";
  const leaderboardHasTrades = leaderboardProjection.qualified.length > 0;
  const leaderboardHasJoinedNoTrade = Boolean(participant) && !participantQualified;
  const leaderboardHeaderCopy = leaderboardIsUpcoming
    ? "Leaderboard opens when trading begins."
    : leaderboardIsActive
      ? "Live BTC rankings update as traders place positions and climb Return %."
      : leaderboardIsEndedPending
        ? "Tournament ended. Final leaderboard is being prepared."
        : "Final rankings, winners, and prize split are locked in here.";
  const leaderboardCountdownLabel = selectedTournament
    ? describeCountdown(selectedTournament.start_time, selectedTournament.end_time, now)
    : "No arena";
  const leaderboardRankCaption = leaderboardIsUpcoming
    ? "Waiting for trading to begin"
    : participantLeaderboardEntry
      ? "Among qualified traders"
      : leaderboardHasJoinedNoTrade && leaderboardIsActive
        ? "Trade to enter the board"
        : "Unranked";
  const leaderboardReturnCaption = leaderboardIsUpcoming
    ? "Opens with the tournament"
    : leaderboardIsActive
      ? "Live tournament score"
      : leaderboardIsEndedPending
        ? "Final score pending settlement"
        : "Final tournament score";
  const leaderboardQualificationView = leaderboardIsUpcoming
    ? {
        title: "Waiting for start",
        body: "Leaderboard opens when the tournament starts.",
        qualified: false,
        badgeLabel: "Waiting for start",
      }
    : leaderboardIsActive && leaderboardHasJoinedNoTrade
      ? {
          title: "Trade to qualify",
          body: "Place your first trade to enter the leaderboard.",
          qualified: false,
          badgeLabel: "Trade to qualify",
        }
      : participantQualified
        ? {
            title: "Qualified",
            body: "Eligible for reward ranking.",
            qualified: true,
            badgeLabel: "Qualified",
          }
        : leaderboardIsEndedPending || leaderboardIsSettled
          ? {
              title: "Not qualified",
              body: "Joined traders without a valid trade are excluded from reward ranking.",
              qualified: false,
              badgeLabel: "Not qualified",
            }
          : {
              title: "Trade to qualify",
              body: "Place at least one trade to qualify.",
              qualified: false,
              badgeLabel: "Trade to qualify",
            };
  const showLeaderboardEmptyState = !leaderboardHasTrades && !leaderboardQuery.isLoading;
  const leaderboardEmptyState = leaderboardIsUpcoming
    ? {
        title: "Tournament has not started yet",
        copy: "Leaderboard opens when the tournament starts.",
        actionLabel: participant ? "View Tournament" : "Join Arena",
      }
    : leaderboardIsActive
      ? {
          title: "No trades yet",
          copy: "Be the first to place a trade.",
          actionLabel: "Place first trade",
        }
      : leaderboardIsEndedPending
        ? {
            title: "Tournament ended",
            copy: "No qualified traders found.",
            actionLabel: "View Tournament",
          }
        : {
            title: "Final leaderboard complete.",
            copy: "Final rankings and prize split are ready.",
            actionLabel: "View Tournament",
          };
  const showNotQualifiedSection =
    (leaderboardIsEndedPending || leaderboardIsSettled) &&
    leaderboardProjection.inactive.length > 0;
  const claimableRewardValue = participant ? toBigIntValue(participant.claimable_reward) : 0n;
  const settledRewardValue = participantWinner ? toBigIntValue(participantWinner.payout) : 0n;
  const canClaimReward =
    Boolean(selectedTournament) &&
    selectedTournament?.status === "Settled" &&
    Boolean(participant) &&
    claimableRewardValue > 0n;

  function handleClaimReward() {
    if (!selectedTournament) {
      pushToast("error", "Select a tournament first.");
      return;
    }
    if (!canClaimReward) {
      pushToast("error", "No claimable reward available.");
      return;
    }
    claimRewardMutation.reset();
    void runUserTx(
      "Claim Reward",
      () => claimRewardMutation.mutateAsync(),
      {
        retryMessage: "Wallet connected. Click Claim Reward again to continue.",
        successMessage: `Reward claimed: ${formatPlanck(claimableRewardValue)}.`,
      },
    );
  }
  const rewardStatus = getRewardStatus({
    participant,
    participantQualified,
    tournament: selectedTournament,
    winner: participantWinner,
    claimableRewardValue,
  });
  const rewardRankLabel = participantLeaderboardEntry
    ? `#${participantLeaderboardEntry.rank}`
    : rewardStatus === "Not qualified"
      ? "Not qualified"
      : participantWinner
        ? `#${participantWinner.rank}`
        : "—";
  const rewardAmountLabel =
    claimableRewardValue > 0n
      ? formatPlanck(claimableRewardValue)
      : settledRewardValue > 0n
        ? formatPlanck(settledRewardValue)
        : rewardStatus === "Not joined"
          ? "Join and trade to compete"
          : rewardStatus === "Not qualified" || rewardStatus === "Not eligible"
            ? "No reward available for this tournament"
            : "Pending settlement";
  const currentUserTradeCount = tradeHistory.filter((item) => item.action === "OPEN").length;
  const leaderboardUiEntries: UiLeaderboardEntry[] = leaderboardProjection.qualified.map((entry) => ({
    rank: entry.rank,
    address: entry.participant,
    pnlPercent: Number(entry.return_percentage_bps) / 100,
    tradeCount: entry.tradeCount,
    virtualBalance: Number(toBigIntValue(entry.final_value)),
    rewardEstimate: entry.rank === 1 ? 60 : entry.rank === 2 ? 30 : entry.rank === 3 ? 10 : undefined,
    isCurrentUser: sameAddress(entry.participant, account?.address ?? null),
    isQualified: true,
  }));
  const notQualifiedUiEntries: UiLeaderboardEntry[] = leaderboardProjection.inactive.map((entry) => ({
    rank: 0,
    address: entry.participant,
    pnlPercent: Number(entry.return_percentage_bps) / 100,
    tradeCount: 0,
    virtualBalance: Number(toBigIntValue(entry.final_value)),
    isCurrentUser: sameAddress(entry.participant, account?.address ?? null),
    isQualified: false,
  }));
  const vaultSummaryView: VaultSummary = {
    walletAddress: account?.address ?? "",
    varaBalance: balance ? `${balance} VARA` : "—",
    totalClaimableRewards: Number(claimableRewardValue) / 1e12,
    totalClaimedRewards: rewardStatus === "Claimed" ? Number(settledRewardValue) / 1e12 : 0,
    activePositions: participant?.position?.is_open ? 1 : 0,
    completedTournaments: participant ? 1 : 0,
  };
  const claimableRewardsView: ClaimableReward[] = selectedTournament
    ? [
        {
          tournamentId: selectedTournament.tournament_id,
          tournamentName: selectedTournament.name,
          rank: participantLeaderboardEntry?.rank ?? participantWinner?.rank ?? 0,
          pnlPercent: participant ? Number(participant.return_percentage_bps) / 100 : 0,
          amountVara: Number(claimableRewardValue > 0n ? claimableRewardValue : settledRewardValue) / 1e12,
          status:
            rewardStatus === "Ready to claim"
              ? "claimable"
              : rewardStatus === "Claimed"
                ? "claimed"
                : rewardStatus === "Not eligible" || rewardStatus === "Not qualified"
                  ? "not_eligible"
                  : claimRewardMutation.isPending
                    ? "claiming"
                    : "not_eligible",
        },
      ]
    : [];
  const vaultPositionsView: VaultPosition[] = participant?.position?.is_open && selectedTournament
    ? [
        {
          id: `${selectedTournament.tournament_id}-${participant.position.direction}`,
          tournamentName: selectedTournament.name,
          side: participant.position.direction === "Long" ? "long" : "short",
          entryPrice: fromContractPrice(participant.position.entry_price),
          currentPrice: fromContractPrice(currentPriceValue),
          pnlPercent: Number(participant.return_percentage_bps) / 100,
          endsAt: describeCountdown(selectedTournament.start_time, selectedTournament.end_time, now),
          status: "open",
        },
      ]
    : [];
  const tournamentHistoryView: TournamentHistoryItem[] = selectedTournament
    ? [
        {
          id: selectedTournament.tournament_id,
          tournamentName: selectedTournament.name,
          finalRank: participantLeaderboardEntry?.rank ?? participantWinner?.rank ?? null,
          pnlPercent: participant ? Number(participant.return_percentage_bps) / 100 : null,
          rewardEarned: Number(claimableRewardValue > 0n ? claimableRewardValue : settledRewardValue) / 1e12,
          status:
            rewardStatus === "Claimed"
              ? "claimed"
              : rewardStatus === "Not qualified"
                ? "not_qualified"
                : claimableRewardValue > 0n || settledRewardValue > 0n
                  ? "won"
                  : "no_reward",
        },
      ]
    : [];
  const txHistoryView: TxHistoryItem[] = [];
  const hasJoinedTournament = Boolean(participant);
  const hasOpenPosition = Boolean(participant?.position?.is_open);
  const hasClaimableReward = rewardStatus === "Ready to claim";
  const firstTimeUser = Boolean(account) && !hasJoinedTournament && tradeHistory.length === 0;
  const endedUnqualified = Boolean(selectedTournament) && rewardStatus === "Not qualified";
  const primaryArenaAction = hasClaimableReward
    ? "Claim your reward"
    : hasOpenPosition
      ? "Continue trading"
      : hasJoinedTournament
        ? "Open trade terminal"
        : "Start your first arena";
  const adminOverviewMetrics = [
    {
      label: "Upcoming",
      value: String(tournaments.filter((t) => getTournamentLifecycleState(t, now) === "Upcoming").length),
      meta: "Tournaments waiting to open",
    },
    {
      label: "Live",
      value: String(tournaments.filter((t) => getTournamentLifecycleState(t, now) === "Live").length),
      meta: "Tournaments accepting trades",
      tone: "positive" as const,
    },
    {
      label: "Pending Settlement",
      value: String(tournaments.filter((t) => getTournamentLifecycleState(t, now) === "Ended").length),
      meta: "Awaiting live engine processing",
      tone: "warning" as const,
    },
    {
      label: "Claim Open",
      value: String(tournaments.filter((t) => getTournamentLifecycleState(t, now) === "Claim Open").length),
      meta: "Winners can withdraw now",
    },
  ];
  const adminLifecycleTournaments = tournaments.map((tournament) => {
    const lifecycle = getTournamentLifecycleState(tournament, now);
    return {
      tournament,
      lifecycle,
      statusLabel: mapStatusLabel(lifecycle),
      statusKind: mapStatusKind(lifecycle),
      countdown: describeCountdown(tournament.start_time, tournament.end_time, now),
      needsSettlement: lifecycle === "Ended",
    };
  });

  const vaultCards = participant
    ? [
        {
          label: "Current Vault",
          value: formatUsd(Number(toBigIntValue(participant.final_value))),
          meta: "Tournament score",
        },
        {
          label: "Total Profit / Loss",
          value: formatSignedUsd(Number(toBigIntValue(participant.realized_pnl))),
          tone:
            toBigIntValue(participant.realized_pnl) > 0n
              ? ("positive" as const)
              : toBigIntValue(participant.realized_pnl) < 0n
                ? ("negative" as const)
                : ("default" as const),
          meta: "Closed trades",
        },
        {
          label: "Return %",
          value: formatPercentBps(participant.return_percentage_bps),
          tone:
            toBigIntValue(participant.return_percentage_bps) > 0n
              ? ("positive" as const)
              : toBigIntValue(participant.return_percentage_bps) < 0n
                ? ("negative" as const)
                : ("default" as const),
          meta: "Leaderboard score",
        },
        {
          label: "Tournaments",
          value: "1",
          meta: "Current joined arena",
        },
      ]
    : [
        { label: "Current Vault", value: "—", meta: "Join a tournament" },
        { label: "Total Profit / Loss", value: "—", meta: "No active trades" },
        { label: "Return %", value: "—", meta: "No score yet" },
        { label: "Tournaments", value: "0", meta: "Not joined" },
      ];

  const homeTournament = preferredTradeTournament;
  const homeTournamentState = homeTournament
    ? getTournamentLifecycleState(homeTournament, now)
    : null;
  const homeTournamentStatusKind = homeTournamentState
    ? mapStatusKind(homeTournamentState)
    : "soon";
  const homeTournamentStatusLabel = homeTournamentState
    ? mapStatusLabel(homeTournamentState)
    : "Soon";
  const totalPrizePoolValue = tournaments.reduce(
    (acc, tournament) => acc + toBigIntValue(tournament.prize_pool),
    0n,
  );
  const activeTournamentCount = tournaments.filter((tournament) => {
    const state = getTournamentLifecycleState(tournament, now);
    return state === "Live" || state === "Upcoming";
  }).length;
  const heroPrimaryLabel = account ? "View Tournaments" : "Connect Wallet";
  const heroPrimaryAction = account
    ? () => setRoute({ page: "tournaments" })
    : () => {
        void handleConnectWallet();
      };
  const heroStats = [
    {
      label: "Active tournaments",
      value: activeTournamentCount ? String(activeTournamentCount) : "0",
    },
    {
      label: "Total prize pool",
      value: totalPrizePoolValue > 0n ? formatPlanck(totalPrizePoolValue) : "Waiting for first pool",
    },
    {
      label: "Real-time leaderboard",
      value: homeTournament
        ? leaderboardProjection.qualified.length
          ? `${leaderboardProjection.qualified.length} ranked now`
          : "Waiting for first trade"
        : "Standings update live",
    },
  ];
  const userStatusHelper = !account
    ? "Connect your wallet to track balance, rank, return %, and current vault value."
    : participant && homeTournament
      ? `You are competing in ${homeTournament.name}.`
      : homeTournament
        ? `Join ${homeTournament.name} to start trading with virtual balance.`
        : "Join the next arena to start trading with virtual balance.";
  const userStatusActionLabel = !account
    ? "Connect Wallet"
    : hasJoinedTournament || hasOpenPosition
      ? "Continue Trading"
      : "Join Arena";
  const userStatusAction = !account
    ? handleConnectWallet
    : hasJoinedTournament || hasOpenPosition
      ? () => setRoute(tradeRoute)
      : () => setRoute({ page: "tournaments" });
  const quickActions: QuickActionItem[] = [
    {
      id: "join-arena",
      title: "Join Arena",
      description: "Browse live BTC tournaments and reserve a place before the timer starts.",
      buttonLabel: "View Tournaments",
      onClick: () => setRoute({ page: "tournaments" }),
      icon: <LayoutDashboard size={18} />,
      variant: "primary",
    },
    {
      id: "open-trade",
      title: "Open Trade",
      description: "Jump into the trade terminal and manage your next BTC position.",
      buttonLabel: "Open Trade",
      onClick: () => setRoute(tradeRoute),
      icon: <BarChart3 size={18} />,
      variant: "secondary",
    },
    {
      id: "view-vault",
      title: "View Vault",
      description: "Check rewards, rank, return %, and your current tournament vault value.",
      buttonLabel: "View Vault",
      onClick: () => setRoute({ page: "vault" }),
      icon: <WalletCards size={18} />,
      variant: "secondary",
    },
  ];
  const activeHomeTournaments = tournaments
    .filter((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      return state === "Live" || state === "Upcoming";
    })
    .map((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      const isSelectedTournament = selectedTournamentId === tournament.tournament_id;
      const isJoinedTournament = isSelectedTournament && Boolean(participant);
      const joinReason = getJoinReason(tournament, now);
      return {
        tournament,
        statusLabel: mapStatusLabel(state),
        statusKind: mapStatusKind(state),
        entryFee: formatPlanck(tournament.entry_fee),
        prizePool: formatPlanck(tournament.prize_pool),
        players: `${tournament.participant_count}/${tournament.max_participants}`,
        timeLeft: describeCountdown(tournament.start_time, tournament.end_time, now),
        endsAt: formatTimestamp(tournament.end_time),
        primaryLabel:
          state === "Upcoming"
            ? "View"
            : state === "Live"
              ? isJoinedTournament
                ? "Trade"
                : "View"
              : "View",
        onPrimary:
          () => openTournament(tournament.tournament_id),
        secondaryLabel: state === "Upcoming" ? "Join" : undefined,
        onSecondary: state === "Upcoming" ? () => handleJoinTournament(tournament) : undefined,
        secondaryDisabled:
          state === "Upcoming"
            ? Boolean(joinReason) || joinMutation.isPending
            : undefined,
        secondaryTitle: state === "Upcoming" ? joinReason ?? undefined : undefined,
        active: isSelectedTournament,
      };
    });
  const pastHomeTournaments = tournaments
    .filter((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      return state !== "Live" && state !== "Upcoming";
    })
    .map((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      const winnerForAccount = account
        ? tournament.winners.find((winner) => sameAddress(winner.participant, account.address))
        : null;
      return {
        tournament,
        statusLabel: mapStatusLabel(state),
        statusKind: mapStatusKind(state),
        entryFee: formatPlanck(tournament.entry_fee),
        prizePool: formatPlanck(tournament.prize_pool),
        players: `${tournament.participant_count}/${tournament.max_participants}`,
        timeLeft: describeCountdown(tournament.start_time, tournament.end_time, now),
        endsAt: formatTimestamp(tournament.end_time),
        primaryLabel: state === "Claim Open" && winnerForAccount ? "Claim Reward" : "View Results",
        onPrimary: () =>
          state === "Claim Open" && winnerForAccount
            ? setRoute({ page: "vault" })
            : openTournament(tournament.tournament_id),
        active: selectedTournamentId === tournament.tournament_id,
      };
    });
  const claimRewardItems = account
    ? tournaments
        .filter((tournament) =>
          tournament.winners.some((winner) => sameAddress(winner.participant, account.address)),
        )
        .map((tournament) => {
          const winner = tournament.winners.find((entry) =>
            sameAddress(entry.participant, account.address),
          )!;
          const readyToClaim =
            tournament.tournament_id === selectedTournament?.tournament_id && canClaimReward;

          return {
            id: `reward-${tournament.tournament_id}`,
            tournamentName: tournament.name,
            amount: formatPlanck(winner.payout),
            rankLabel: `Rank #${winner.rank}`,
            statusLabel: readyToClaim ? "Ready to claim" : "Payout recorded",
            detail: readyToClaim
              ? "Your payout is ready. Open your vault to claim it."
              : "Your finishing payout is recorded for this settled tournament.",
            onOpen: () => setRoute({ page: "vault" }),
          };
        })
    : [];

  const homeStatsCompact = [
    {
      label: "Active arenas",
      value: String(activeTournamentCount),
    },
    {
      label: "Total prize pool",
      value: totalPrizePoolValue > 0n ? formatPlanck(totalPrizePoolValue) : "Waiting for first pool",
    },
    {
      label: "Your balance",
      value: account ? (balance ? `${balance} VARA` : "Balance syncing") : "Connect wallet",
    },
  ];

  const onboardingGuideNode = (
    <HowToStartCard />
  );

  const emptyActionViewTournaments = (
    <Button variant="primary" onClick={() => setRoute({ page: "tournaments" })}>
      View Tournaments
    </Button>
  );

  const rewardEmptyState = !selectedTournament
    ? {
        title: "Select a tournament",
        copy: "Pick an arena to check rewards and payout status.",
        action: emptyActionViewTournaments,
      }
    : !participant
      ? {
          title: "No rewards yet",
          copy: "Join a tournament, place trades, and finish high on Return % to earn rewards.",
          action: emptyActionViewTournaments,
        }
      : !canClaimReward && settledRewardValue <= 0n
        ? {
            title: "No rewards available",
            copy: "Rewards appear here after the tournament settles and your result qualifies for payout.",
            action: (
              <Button variant="secondary" onClick={() => setRoute(tradeRoute)}>
                Open Trade
              </Button>
            ),
          }
        : null;

  const tournamentActiveRows = tournaments
    .filter((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      return state === "Live" || state === "Upcoming";
    })
    .map((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      const isActive = selectedTournamentId === tournament.tournament_id;
      const isJoined = isActive && Boolean(participant);
      const joinReason = getJoinReason(tournament, now);

      let actionLabel = "View";
      let onAction = () => openTournament(tournament.tournament_id);
      let disabled = false;

      if (isJoined) {
        actionLabel = "Trade";
        onAction = () => openTournament(tournament.tournament_id);
      } else if (state === "Upcoming" || state === "Live") {
        actionLabel = "Join";
        onAction = () => handleJoinTournament(tournament);
        disabled = Boolean(joinReason);
      }

      return {
        key: `active-${tournament.tournament_id}`,
        name: tournament.name,
        statusLabel: mapStatusLabel(state),
        statusKind: mapStatusKind(state),
        entryFee: formatPlanck(tournament.entry_fee),
        prizePool: formatPlanck(tournament.prize_pool),
        players: `${tournament.participant_count}/${tournament.max_participants}`,
        timeLabel: describeCountdown(tournament.start_time, tournament.end_time, now),
        timeSubLabel: formatTimestamp(state === "Upcoming" ? tournament.start_time : tournament.end_time),
        actionLabel,
        onAction,
        disabled,
        active: isActive,
      };
    });

  const tournamentPastRows = tournaments
    .filter((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      return state !== "Live" && state !== "Upcoming";
    })
    .map((tournament) => {
      const state = getTournamentLifecycleState(tournament, now);
      const winnerForAccount = account
        ? tournament.winners.find((winner) => sameAddress(winner.participant, account.address))
        : null;
      const canClaimHere = state === "Claim Open" && Boolean(winnerForAccount);

      return {
        key: `past-${tournament.tournament_id}`,
        name: tournament.name,
        statusLabel: mapStatusLabel(state),
        statusKind: mapStatusKind(state),
        entryFee: formatPlanck(tournament.entry_fee),
        prizePool: formatPlanck(tournament.prize_pool),
        players: `${tournament.participant_count}/${tournament.max_participants}`,
        timeLabel: describeCountdown(tournament.start_time, tournament.end_time, now),
        timeSubLabel: formatTimestamp(tournament.end_time),
        actionLabel: canClaimHere ? "Claim" : "View Results",
        onAction: canClaimHere
          ? () => setRoute({ page: "vault" })
          : () => openTournament(tournament.tournament_id),
        active: selectedTournamentId === tournament.tournament_id,
      };
    });

  const leaderboardTabs = tournaments.map((tournament) => ({
    key: tournament.tournament_id,
    label: tournament.name,
    active: selectedTournamentId === tournament.tournament_id,
    onClick: () => setSelectedTournamentId(tournament.tournament_id),
  }));

  const tradeTopNotices = (
    <>
      <Notice tone="info">Keeper updates tournament price on-chain.</Notice>
      {participantQuery.isLoading && account ? (
        <Notice tone="info">Loading your tournament state...</Notice>
      ) : null}
      {participantQuery.error && !participantNotFound ? (
        <Notice tone="error">{extractErrorMessage(participantQuery.error)}</Notice>
      ) : null}
      {renderMutationNotice(joinMutation, {
        pending: "Waiting for wallet approval...",
        success: "Confirmed: tournament joined.",
      })}
      {renderMutationNotice(openPositionMutation, {
        pending: "Waiting for wallet approval...",
        success: "Confirmed: position opened.",
      })}
      {renderMutationNotice(closePositionMutation, {
        pending: "Waiting for wallet approval...",
        success: "Confirmed: position closed.",
      })}
    </>
  );

  const tradePrompt = !tradeViewTournament
    ? {
        title: "Select a tournament",
        copy: "Choose a BTC arena to start trading.",
        actionLabel: "View Tournaments",
        onAction: () => setRoute({ page: "tournaments" }),
      }
    : !account
      ? {
          title: "Connect wallet to trade",
          copy: "Connect your wallet first, then join a tournament and open your BTC position.",
          actionLabel: isWalletConnectBusy ? "Connecting..." : "Connect Wallet",
          onAction: () => {
            void handleConnectWallet();
          },
          actionDisabled: isWalletConnectBusy,
        }
      : !participant && selectedTournamentState === "Upcoming"
        ? {
            title: "Join this tournament to trade",
            copy: "Reserve your place first, then the trade panel will unlock.",
            actionLabel: joinMutation.isPending ? "Joining..." : "Join Tournament",
            onAction: () => {
              if (tradeViewTournament) handleJoinTournament(tradeViewTournament);
            },
            actionDisabled:
              !tradeViewTournament
              || Boolean(getJoinReason(tradeViewTournament, now))
              || joinMutation.isPending,
          }
        : !participant && selectedTournamentState === "Live"
          ? {
              title: "Trading is already live",
              copy: "This tournament has already started. Join the next arena before the countdown ends.",
            }
          : selectedTournamentState === "Ended"
            ? {
                title: "Tournament ended. Trading is closed.",
                copy: "Final rankings are being prepared.",
              }
            : null;

  const tradeWarning = priceStale ? "Tournament price is stale. Waiting for keeper sync." : tradeFormError ?? null;

  const keeperStatusLabel =
    selectedTournamentState === "Live"
      ? priceStale
        ? "Stale"
        : onChainLastPriceSyncAt && currentPriceValue > 0n
          ? "Online"
          : "Waiting"
      : onChainLastPriceSyncAt && currentPriceValue > 0n
        ? "Online"
        : "Idle";
  const keeperStatusTone =
    keeperStatusLabel === "Online"
      ? ("positive" as const)
      : keeperStatusLabel === "Stale"
        ? ("negative" as const)
        : ("default" as const);
  const lastSyncLabel = onChainLastPriceSyncAt
    ? formatRelativeSeconds(onChainLastPriceSyncAt, now)
    : "Never";
  const keeperAccounts = keepersQuery.data ?? [];
  const slTpCloseCount = tradeHistory.filter(
    (item) => item.action === "CLOSE" && (item.closeReason === "StopLoss" || item.closeReason === "TakeProfit"),
  ).length;

  const tradeChartNode = tradeViewTournament ? (
    <TradingChart
      livePrice={livePriceLabel === "BTC --" ? "$0.00" : livePriceLabel}
      liveChange={`${livePriceChange24h >= 0 ? "+" : ""}${livePriceChange24h.toFixed(2)}%`}
      tournamentPrice={tournamentPriceLabel}
      priceHistory={liveHistory}
      tournamentPriceValue={displayedTournamentPriceValue}
      entryPriceValue={
        participant?.position?.is_open
          ? toBigIntValue(participant.position.entry_price)
          : null
      }
      liveLabel="Live BTC"
      tournamentLabel="Tournament price"
    />
  ) : null;

  const tradeStatusNode = tradeViewTournament ? (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="tv-panel p-4">
        <p className="tv-kicker">Trading feedback</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoPanel title="Last Synced" value={lastSyncLabel} />
          <InfoPanel title="Keeper Status" value={keeperStatusLabel} tone={keeperStatusTone} />
          <InfoPanel title="Price Sync" value={syncStatusLabel} tone={priceStale ? "negative" : "positive"} />
          <InfoPanel title="Feed Status" value={marketSourceNotice ?? "Live market connected"} />
        </div>
      </div>
      <div className="tv-panel p-4">
        <p className="tv-kicker">Fairness</p>
        <div className="mt-4">
          <FairTradingRulesCard />
        </div>
      </div>
    </div>
  ) : null;

  const tradeOrderNode = tradeViewTournament ? (
    <OrderPanel
      tournamentName={tradeViewTournament.name}
      timeLeft={describeCountdown(tradeViewTournament.start_time, tradeViewTournament.end_time, now)}
      prizePool={formatPlanck(tradeViewTournament.prize_pool)}
      direction={tradeDirection}
      onDirectionChange={setTradeDirection}
      size={tradeSize}
      onSizeChange={setTradeSize}
      availableBalance={participant ? formatUsd(Number(toBigIntValue(participant.final_value))) : "Join to unlock"}
      entryPrice={tournamentPriceLabel}
      currentPrice={livePriceLabel === "BTC --" ? "$0.00" : livePriceLabel}
      estimatedPnl={{
        value: formatSignedUsd(estimatedTradeMetrics.pnl),
        tone:
          estimatedTradeMetrics.pnl > 0
            ? "positive"
            : estimatedTradeMetrics.pnl < 0
              ? "negative"
              : "default",
      }}
      actionLabel={tradeDirection === "Long" ? "Open Long" : "Open Short"}
      actionVariant={tradeDirection === "Long" ? "positive" : "danger"}
      onAction={handleOpenPosition}
      actionDisabled={Boolean(tradeDisabledReason) || openPositionMutation.isPending || Boolean(participant?.position?.is_open)}
      actionDisabledReason={tradeDisabledReason}
      secondaryActionLabel={participant?.position?.is_open ? "Close Position" : undefined}
      onSecondaryAction={participant?.position?.is_open ? handleClosePosition : undefined}
      secondaryDisabled={closePositionMutation.isPending}
      activePositionSummary={
        participant?.position?.is_open
          ? {
              direction: participant.position.direction,
              size: formatUsd(Number(toBigIntValue(participant.position.size))),
              entryPrice: formatChainUsdPrice(participant.position.entry_price),
            }
          : null
      }
      stopLossPrice={stopLossPrice}
      onStopLossChange={setStopLossPrice}
      takeProfitPrice={takeProfitPrice}
      onTakeProfitChange={setTakeProfitPrice}
      helper={tradeDisabledReason ? null : tournamentPriceHelperText}
      warning={tradeWarning ?? tradeDisabledReason ?? undefined}
    />
  ) : null;

  const tradePositionNode = (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Current Position</p>
      <div className="mt-4">
        <PositionCard
          hasPosition={Boolean(participant?.position?.is_open)}
          direction={participant?.position?.direction ?? null}
          size={participant?.position ? formatUsd(Number(toBigIntValue(participant.position.size))) : null}
          entryPrice={participant?.position ? formatChainUsdPrice(participant.position.entry_price) : null}
          livePrice={livePriceLabel === "BTC --" ? "$0.00" : livePriceLabel}
          tournamentPrice={tournamentPriceLabel}
          livePreviewPnl={
            participant?.position?.is_open
              ? {
                  label: formatSignedUsd(livePreviewMetrics.pnl),
                  positive: livePreviewMetrics.pnl > 0,
                  negative: livePreviewMetrics.pnl < 0,
                  key: `live-${Math.round(livePreviewMetrics.pnl * 100)}`,
                }
              : null
          }
          tournamentPnl={
            participant
              ? {
                  label: formatSignedUsd(Number(toBigIntValue(participant.unrealized_pnl))),
                  positive: toBigIntValue(participant.unrealized_pnl) > 0n,
                  negative: toBigIntValue(participant.unrealized_pnl) < 0n,
                  key: `tournament-${participant.unrealized_pnl}`,
                }
              : null
          }
          returnPct={
            participant?.position?.is_open
              ? {
                  label: formatSignedPercent(livePreviewMetrics.returnPct),
                  positive: livePreviewMetrics.returnPct > 0,
                  negative: livePreviewMetrics.returnPct < 0,
                  key: `return-${Math.round(livePreviewMetrics.returnPct * 100)}`,
                }
              : null
          }
          riskControls={
            participant?.position
              ? {
                  stopLossPrice:
                    participant.position.stop_loss_price != null
                      ? formatChainUsdPrice(participant.position.stop_loss_price)
                      : null,
                  takeProfitPrice:
                    participant.position.take_profit_price != null
                      ? formatChainUsdPrice(participant.position.take_profit_price)
                      : null,
                }
              : null
          }
          onClose={participant?.position?.is_open ? handleClosePosition : undefined}
          closePending={closePositionMutation.isPending}
          emptyAction={
            tradeViewTournament && participant && selectedTournamentState === "Live" && !priceStale ? (
              <Button variant={tradeDirection === "Long" ? "positive" : "danger"} onClick={handleOpenPosition}>
                {tradeDirection === "Long" ? "Open Long" : "Open Short"}
              </Button>
            ) : undefined
          }
        />
      </div>
    </div>
  );

  const tradeVaultSummaryNode = (
    <VaultSummaryPanel cards={vaultCards} />
  );

  const tradeLeaderboardNode = (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Mini Leaderboard</p>
      <div className="mt-4">
        {leaderboardRows.length ? (
          <CompactLeaderboardPanel
            podium={leaderboardPodium.slice(0, 3)}
            rows={leaderboardRows.slice(0, 5)}
            inactiveRows={[]}
          />
        ) : (
          <EmptyStatePanel
            eyebrow="Leaderboard"
            title={selectedTournamentState === "Upcoming" ? "Leaderboard opens soon" : "No leaderboard entries yet"}
            copy={
              selectedTournamentState === "Upcoming"
                ? "Leaderboard opens when tournament trading starts."
                : "Place the first trade in this tournament to create the board."
            }
            action={
              <Button variant="secondary" onClick={() => setRoute(tradeRoute)}>
                Open Trade
              </Button>
            }
          />
        )}
      </div>
    </div>
  );

  const leaderboardEmptyAction = selectedTournament
    ? (
        <Button variant="primary" onClick={() => openTournament(selectedTournament.tournament_id)}>
          {leaderboardEmptyState.actionLabel}
        </Button>
      )
    : undefined;

  const vaultConnectPrompt = !account ? (
    <EmptyStatePanel
      eyebrow="My Vault"
      title="Connect a wallet to open your vault"
      copy="See your current position, return %, and rewards after you connect."
      action={
        <Button
          variant="primary"
          onClick={() => {
            void handleConnectWallet();
          }}
          disabled={isWalletConnectBusy}
        >
          {isWalletConnectBusy ? "Connecting..." : "Connect Wallet"}
        </Button>
      }
    />
  ) : null;

  const vaultRewardNode = rewardEmptyState ? (
    <EmptyStatePanel
      eyebrow="Rewards"
      title={rewardEmptyState.title}
      copy={rewardEmptyState.copy}
      action={rewardEmptyState.action}
    />
  ) : (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Rewards</p>
      <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
        <p className="text-lg font-semibold text-[var(--text)]">{rewardAmountLabel}</p>
        <p>Status: {rewardStatus}</p>
        <p>Rank: {rewardRankLabel}</p>
        <p>Return: {participant ? formatPercentBps(participant.return_percentage_bps) : "—"}</p>
      </div>
      {canClaimReward ? (
        <div className="mt-4">
          <Button
            variant="primary"
            onClick={handleClaimReward}
            disabled={!canClaimReward || claimRewardMutation.isPending}
          >
            {claimRewardMutation.isPending ? "Claiming..." : "Claim Reward"}
          </Button>
        </div>
      ) : null}
    </div>
  );

  const vaultPositionNode = (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Current Position</p>
        <div className="mt-4">{tradePositionNode}</div>
      </div>
      {renderMutationNotice(claimRewardMutation, {
        pending: "Waiting for wallet approval...",
        success: claimRewardMutation.data
          ? `Confirmed: reward claimed ${formatPlanck(claimRewardMutation.data)}`
          : "Confirmed: reward claimed.",
      })}
    </div>
  );

  const adminCreatePanel = (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5">
      <form onSubmit={handleCreateTournament} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Create Tournament</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Set the entry fee, schedule, and player cap.</p>
          </div>
          <RocketLaunch size={20} className="text-[var(--primary)]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tournament name" className="sm:col-span-2">
            <input
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, name: event.target.value }))
              }
              className="input-base"
            />
          </Field>
          <Field label="Entry fee (VARA)">
            <input
              value={createForm.entryFee}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, entryFee: event.target.value }))
              }
              className="input-base"
            />
          </Field>
          <Field label="Virtual balance">
            <input
              value={createForm.initialVirtualBalance}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  initialVirtualBalance: event.target.value,
                }))
              }
              className="input-base"
            />
          </Field>
          <Field label="Start time">
            <input
              type="datetime-local"
              value={createForm.startTime}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, startTime: event.target.value }))
              }
              className="input-base"
            />
            <p className="text-xs text-[var(--muted)]">Start must be in the future.</p>
          </Field>
          <Field label="End time">
            <input
              type="datetime-local"
              value={createForm.endTime}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, endTime: event.target.value }))
              }
              className="input-base"
            />
            <p className="text-xs text-[var(--muted)]">End must be after start.</p>
          </Field>
          <div className="sm:col-span-2 rounded-[10px] border border-[var(--border-soft)] bg-[var(--sidebar)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-[var(--text)]">
                Duration: {createTimeValidation.durationLabel}
              </span>
              <span className="text-[var(--muted)]">Contract timestamps use milliseconds.</span>
            </div>
          </div>
          <Field label="Max participants" className="sm:col-span-2">
            <input
              value={createForm.maxParticipants}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  maxParticipants: event.target.value,
                }))
              }
              className="input-base"
            />
          </Field>
        </div>
        {!createFormError && createTimeValidation.error ? (
          <Notice tone="warning">{createTimeValidation.error}</Notice>
        ) : null}
        {createFormError ? <Notice tone="error">{createFormError}</Notice> : null}
        {renderMutationNotice(createTournamentMutation, {
          pending: "Waiting for wallet approval...",
          success: createTournamentMutation.data
            ? `Confirmed: tournament #${createTournamentMutation.data.tournament_id} created.`
            : "Confirmed: tournament created.",
        })}
        <Button
          type="submit"
          variant="primary"
          disabled={createTournamentMutation.isPending || !hasProgramId || Boolean(createTimeValidation.error)}
        >
          Create Tournament
        </Button>
      </form>
    </div>
  );

  const adminKeeperPanel = (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Keeper Panel</p>
      <p className="mt-2 text-sm text-[var(--muted)]">Manage the wallets allowed to push price and lifecycle updates on-chain.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoPanel title="Keeper" value={keeperStatusLabel} tone={keeperStatusTone} />
        <InfoPanel title="Last Sync" value={lastSyncLabel} />
        <InfoPanel title="Last BTC Price" value={currentPriceValue > 0n ? tournamentPriceLabel : "$0.00"} />
        <InfoPanel title="Price Sync" value={syncStatusLabel} tone={priceStale ? "negative" : "positive"} />
        <InfoPanel title="Freshness Window" value={`${Math.round(maxStaleMsValue / 1000)}s max`} />
        <InfoPanel title="Keeper Wallets" value={String(keeperAccounts.length)} />
      </div>
      <div className="mt-4 space-y-3">
        <Field label="Keeper Address">
          <input
            value={keeperAddressInput}
            onChange={(event) => setKeeperAddressInput(event.target.value)}
            placeholder="5F..."
            className="input-base"
          />
        </Field>
        {renderMutationNotice(addKeeperMutation, {
          pending: "Waiting for wallet approval...",
          success: "Confirmed: keeper added.",
        })}
        {renderMutationNotice(removeKeeperMutation, {
          pending: "Waiting for wallet approval...",
          success: "Confirmed: keeper removed.",
        })}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={handleAddKeeper}
            disabled={!keeperAddressInput.trim() || addKeeperMutation.isPending}
          >
            {addKeeperMutation.isPending ? "Adding..." : "Add Keeper"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleRemoveKeeper}
            disabled={!keeperAddressInput.trim() || removeKeeperMutation.isPending}
          >
            {removeKeeperMutation.isPending ? "Removing..." : "Remove Keeper"}
          </Button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {keeperAccounts.length ? keeperAccounts.map((keeperAddress) => (
          <div
            key={keeperAddress}
            className="flex items-center justify-between rounded-[10px] border border-[var(--border-soft)] bg-[var(--sidebar)] px-3 py-2 text-sm"
          >
            <span className="text-[var(--text)]">{shortAddress(keeperAddress)}</span>
            <span className="text-[var(--muted)]">{keeperAddress}</span>
          </div>
        )) : (
          <p className="text-sm text-[var(--muted)]">No keeper wallets configured yet.</p>
        )}
      </div>
    </div>
  );

  const adminControlsPanel = (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Fallback Controls</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoPanel title="Status" value={selectedTournament ? selectedTournamentStatusLabel : "No tournament selected"} />
        <InfoPanel
          title="Time Left"
          value={selectedTournament ? describeCountdown(selectedTournament.start_time, selectedTournament.end_time, now) : "Select a tournament"}
        />
        <InfoPanel title="Live BTC" value={activeLivePrice ? livePriceLabel : "Not loaded"} />
        <InfoPanel title="Tournament Price" value={currentPriceValue ? tournamentPriceLabel : "Not loaded"} />
        <InfoPanel title="SL/TP Closes" value={String(slTpCloseCount)} />
        <InfoPanel title="Last Sync" value={lastSyncLabel} />
      </div>
      {priceStale ? (
        <p className="mt-4 text-sm text-amber-300">Tournament price is stale. Use the manual keeper tick if automation is delayed.</p>
      ) : null}
      {syncWarning ? <p className="mt-3 text-sm text-amber-300">{syncWarning}</p> : null}
      {renderMutationNotice(updatePriceMutation, {
        pending: "Waiting for wallet approval...",
        success: "Confirmed: Sync Price & Process completed.",
      })}
      {renderMutationNotice(settleTournamentMutation, {
        pending: "Waiting for wallet approval...",
        success: "Confirmed: tournament settled.",
      })}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={handleManualPriceSync}
          disabled={!selectedTournament || livePriceValue <= 0n || updatePriceMutation.isPending}
        >
          {updatePriceMutation.isPending ? "Syncing..." : "Sync Price & Process"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleSettleTournament}
          disabled={!selectedTournament || settleTournamentMutation.isPending}
        >
          {settleTournamentMutation.isPending ? "Settling..." : "Settle Fallback"}
        </Button>
      </div>
    </div>
  );

  const adminLifecyclePanel = (
    <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Tournament Lifecycle</p>
      <div className="mt-4 space-y-3">
        {adminLifecycleTournaments.map(({ tournament, statusKind, statusLabel, countdown }) => (
          <div
            key={`admin-${tournament.tournament_id}`}
            className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text)]">{tournament.name}</p>
                  <UiStatusPill kind={statusKind} label={statusLabel} />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {countdown} · Prize pool {formatPlanck(tournament.prize_pool)}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedTournamentId(tournament.tournament_id);
                  setRoute({ page: "trade", tournamentId: tournament.tournament_id });
                }}
              >
                Open
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const tradeGuideNode =
    account && !participant ? (
      <HowToStartCard copy="Connect once, join before the countdown ends, trade BTC, then track your rank and claim any rewards." />
    ) : null;

  const pageContent =
    route.page === "home" ? (
      <HomePage
        primaryLabel={heroPrimaryLabel}
        onPrimary={heroPrimaryAction}
        onSecondary={() => setRoute({ page: "leaderboard" })}
        stats={homeStatsCompact}
        onboardingGuide={onboardingGuideNode}
      />
    ) : route.page === "tournaments" ? (
      <TournamentsPage
        activeRows={tournamentActiveRows}
        pastRows={tournamentPastRows}
        loading={tournamentsQuery.isLoading}
        loadingState={<CardSkeletonGrid count={3} />}
        error={tournamentsQuery.error ? extractErrorMessage(tournamentsQuery.error) : null}
        notices={renderMutationNotice(joinMutation, {
          pending: "Waiting for wallet approval...",
          success: "Confirmed: tournament joined.",
        })}
        emptyAction={<Button variant="primary" onClick={() => setRoute({ page: "home" })}>Back Home</Button>}
        pastEmptyAction={<Button variant="secondary" onClick={() => setRoute({ page: "leaderboard" })}>View Leaderboard</Button>}
      />
    ) : route.page === "trade" || route.page === "tournament" ? (
      <TradePage
        tournamentName={tradeViewTournament?.name ?? null}
        market={
          tradeViewTournament
            ? {
                livePrice: livePriceLabel === "BTC --" ? "$0.00" : livePriceLabel,
                tournamentPrice: tournamentPriceLabel,
                timeLeft: describeCountdown(tradeViewTournament.start_time, tradeViewTournament.end_time, now),
                statusLabel: selectedTournamentStatusLabel,
                statusKind: selectedTournamentStatusKind,
              }
            : null
        }
        prompt={tradePrompt}
        warning={priceStale ? "Tournament price is stale. Waiting for keeper sync." : null}
        notices={tradeTopNotices}
        statusPanel={tradeStatusNode}
        chart={tradeChartNode}
        orderPanel={tradeOrderNode}
        fairnessCard={
          <>
            {tradeGuideNode}
          </>
        }
        positionPanel={tradePositionNode}
        vaultSummary={tradeVaultSummaryNode}
        leaderboardPanel={tradeLeaderboardNode}
        confirmationModal={
          <TradeConfirmModal
            open={Boolean(tradeConfirmState)}
            direction={tradeConfirmState?.direction ?? "Long"}
            size={tradeConfirmState?.sizeLabel ?? "$0.00"}
            tournamentPrice={tradeConfirmState?.tournamentPriceLabel ?? "$0.00"}
            stopLoss={tradeConfirmState?.stopLossLabel}
            takeProfit={tradeConfirmState?.takeProfitLabel}
            pending={openPositionMutation.isPending}
            onCancel={() => {
              pendingTradeRef.current = null;
              setTradeConfirmState(null);
            }}
            onConfirm={confirmOpenPosition}
          />
        }
      />
    ) : route.page === "leaderboard" ? (
      <LeaderboardPage
        tabs={leaderboardTabs}
        subtitle={leaderboardHeaderCopy}
        podium={leaderboardPodium}
        rows={leaderboardRows}
        inactiveRows={showNotQualifiedSection ? leaderboardInactiveRows : []}
        loading={leaderboardQuery.isLoading}
        loadingState={<LeaderboardSkeleton count={5} />}
        error={leaderboardQuery.error ? extractErrorMessage(leaderboardQuery.error) : null}
        emptyState={
          showLeaderboardEmptyState
            ? {
                title: leaderboardEmptyState.title,
                copy: leaderboardEmptyState.copy,
                action: leaderboardEmptyAction,
              }
            : null
        }
      />
    ) : route.page === "vault" || route.page === "rewards" ? (
      <VaultPage
        tournamentTabs={
          tournaments.length ? (
            <TournamentSelector
              tournaments={tournaments}
              selectedTournamentId={selectedTournamentId}
              onSelect={setSelectedTournamentId}
            />
          ) : null
        }
        connectPrompt={vaultConnectPrompt}
        notices={
          <>
            {participantQuery.isLoading && account ? <Notice tone="info">Loading your vault...</Notice> : null}
            {participantNotFound && account ? <Notice tone="warning">You have not joined this tournament yet.</Notice> : null}
            {participantQuery.error && !participantNotFound ? (
              <Notice tone="error">{extractErrorMessage(participantQuery.error)}</Notice>
            ) : null}
          </>
        }
        summary={participantQuery.isLoading ? <CardSkeletonGrid count={2} /> : <VaultSummaryPanel cards={vaultCards} />}
        reward={vaultRewardNode}
        onboardingGuide={!participant ? tradeGuideNode : null}
        position={vaultPositionNode}
      />
    ) : route.page === "admin" ? (
      !isAdmin ? (
        <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-4">
          <Notice tone="error">You do not have permission to access this page.</Notice>
        </div>
      ) : (
        <AdminPage
          createPanel={adminCreatePanel}
          keeperPanel={adminKeeperPanel}
          controlsPanel={adminControlsPanel}
          lifecyclePanel={adminLifecyclePanel}
        />
      )
    ) : route.page === "docs" ? (
      <DocsPage />
    ) : null;

  return (
    <div className="tv-shell">
      <AnimatePresence>
        {toasts.length ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-md flex-col gap-2 px-4"
          >
            {toasts.map((toast) => (
              <Toast key={toast.id} tone={toast.tone} message={toast.message} />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <WalletConnectModal
        open={walletModalOpen}
        onClose={() => {
          postConnectNoticeRef.current = null;
          setWalletModalOpen(false);
        }}
        onConnect={handleModalWalletConnect}
        onError={(message) => {
          pushToast("error", message);
        }}
      />
      <AppShell
        navItems={shellNavItems}
        mobileNavItems={shellNavItems}
        activeKey={shellActiveKey}
        sidebarFooter={
          <div className="tv-panel-soft p-4">
            <p className="tv-label">
              How it works
            </p>
            <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <p>1. Pick a tournament</p>
              <p>2. Trade BTC with virtual balance</p>
              <p>3. Top Return % wins real VARA</p>
            </div>
          </div>
        }
      >
        <div className="tv-container w-full px-0 pb-24 pt-4 lg:pb-8 lg:pt-6">
          <TopBar
            title={pageTitle}
            right={
              <div className="relative z-30 flex items-center gap-3 pointer-events-auto">
                <div className="hidden sm:block">
                  <PriceTicker
                    label="BTC/USD"
                    price={livePriceLabel}
                    change={`${livePriceChange24h >= 0 ? "+" : ""}${livePriceChange24h.toFixed(2)}%`}
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={handleOpenDocs}
                  className="gap-2 whitespace-nowrap px-3"
                >
                  <BookOpen size={16} />
                  Docs
                </Button>
                {!account ? (
                  <div className="relative z-40 shrink-0 pointer-events-auto">
                    <Button
                      variant="primary"
                      onClick={() => {
                        void handleConnectWallet();
                      }}
                      disabled={isWalletConnectBusy}
                      className="relative z-40 pointer-events-auto"
                    >
                      {isWalletConnectBusy ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  </div>
                ) : (
                  <WalletPill
                    accountName={account.meta.name ?? "Wallet"}
                    address={account.address}
                    balance={balance}
                    isAdmin={isAdmin}
                    accounts={accounts}
                    selectedAddress={account.address}
                    onSelectAddress={(address) => {
                      const next = accounts.find((candidate) => candidate.address === address);
                      if (next) selectAccount(next);
                    }}
                    onDisconnect={disconnect}
                  />
                )}
              </div>
            }
          />

          <div className="mt-6">
            {banner ? (
              <div className="mb-6">
                <Notice tone={banner.tone}>{banner.message}</Notice>
              </div>
            ) : null}

            <AnimatePresence mode="wait" initial={false}>
              <motion.main
                key={activeRouteKey}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0 space-y-6"
              >
                {pageContent}
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </AppShell>
    </div>
  );
}

function WalletPill({
  accountName,
  address,
  balance,
  isAdmin,
  accounts,
  selectedAddress,
  onSelectAddress,
  onDisconnect,
}: {
  accountName: string;
  address: string;
  balance: string | null;
  isAdmin: boolean;
  accounts: { address: string; meta: { name?: string } }[];
  selectedAddress: string;
  onSelectAddress: (address: string) => void;
  onDisconnect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="tv-pill relative z-40 flex flex-wrap items-center gap-2 px-3 py-2 pointer-events-auto"
    >
      <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
      <div className="text-sm font-medium text-[var(--text)]">{shortAddress(address)}</div>
      {balance ? (
        <div className="font-mono text-sm tabular-nums text-[var(--muted)]">{balance} VARA</div>
      ) : (
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--primary-soft)]" />
      )}
      {isAdmin ? <UiStatusPill kind="admin" label="Admin" /> : null}
      {accounts.length > 1 ? (
        <select
          value={selectedAddress}
          onChange={(event) => onSelectAddress(event.target.value)}
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] outline-none"
        >
          {accounts.map((candidate) => (
            <option key={candidate.address} value={candidate.address}>
              {(candidate.meta.name ?? accountName).trim()} · {shortAddress(candidate.address)}
            </option>
          ))}
        </select>
      ) : null}
      <button type="button" onClick={onDisconnect} className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--text)]">
        Disconnect
      </button>
    </motion.div>
  );
}

function TournamentSelector({
  tournaments,
  selectedTournamentId,
  onSelect,
  onOpen,
  now = Date.now(),
}: {
  tournaments: TournamentView[];
  selectedTournamentId: string;
  onSelect: (tournamentId: string) => void;
  onOpen?: (tournamentId: string) => void;
  now?: number;
}) {
  if (!tournaments.length) {
    return <Notice tone="warning">No tournaments available yet.</Notice>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tournaments.map((tournament) => {
        const active = selectedTournamentId === tournament.tournament_id;
        const lifecycle = getTournamentLifecycleState(tournament, now);
        const dotClass =
          lifecycle === "Live"
            ? "bg-[var(--long)]"
            : lifecycle === "Upcoming"
              ? "bg-amber-400"
              : lifecycle === "Claim Open"
                ? "bg-[var(--primary)]"
                : "bg-[var(--muted)]";
        return (
          <motion.button
            key={tournament.tournament_id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onSelect(tournament.tournament_id);
              onOpen?.(tournament.tournament_id);
            }}
            className={
              active
                ? "inline-flex items-center gap-2 rounded-full border border-[rgba(57,255,136,0.2)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]"
                : "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[#94A3B8] transition hover:text-[var(--text)]"
            }
          >
            <span className={`h-2 w-2 rounded-full ${dotClass}`} />
            {tournament.name}
          </motion.button>
        );
      })}
    </div>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="surface-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-kicker">
            {title}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)] sm:text-[15px]">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function TournamentSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="product-card p-5 sm:p-6">
      <p className="text-lg font-semibold text-[var(--text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function EmptySection({
  copy,
}: {
  copy: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--border-soft)] bg-[var(--sidebar)] p-5">
      <p className="text-sm text-[var(--muted)]">{copy}</p>
    </div>
  );
}

function SectionBadge({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "default" | "warning";
}) {
  return (
    <span
      className={
        tone === "warning"
          ? "rounded-full bg-[rgba(244,201,93,0.12)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warning)]"
          : "rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
      }
    >
      {children}
    </span>
  );
}


function InfoStat({
  label,
  value,
  inverted,
}: {
  label: string;
  value: string;
  inverted?: boolean;
}) {
  return (
    <div className={`rounded-[8px] border px-3 py-3 ${inverted ? "border-[var(--border-soft)] bg-[var(--panel-soft)]" : "border-[var(--border-soft)] bg-[var(--sidebar)]"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--subtle)]">
        {label}
      </p>
      <p className="mt-2 text-[13px] font-semibold text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

function InfoPanel({
  title,
  value,
  tone = "default",
}: {
  title: ReactNode;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--long)]"
      : tone === "negative"
        ? "text-[var(--short)]"
        : "text-[var(--text)]";
  return (
    <motion.div
      layout
      className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--subtle)]">
        {title}
      </p>
      <motion.p
        key={`${typeof title === "string" ? title : "panel"}-${value}`}
        initial={{ opacity: 0.75, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-2 text-[13px] font-semibold ${toneClass}`}
      >
        {value}
      </motion.p>
    </motion.div>
  );
}

function TradeHistoryPanel({
  history,
  currentPrice,
}: {
  history: TradeHistoryItem[];
  currentPrice: bigint;
}) {
  return (
    <div className="product-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--subtle)]">Trade History</p>
          <h3 className="mt-1 text-[18px] font-semibold text-[var(--text)]">Your Activity</h3>
        </div>
        <span className="text-xs text-[var(--subtle)]">{history.length} entries</span>
      </div>
      {history.length ? (
        <div className="space-y-2">
          {[...history].reverse().map((item, index) => (
            <div
              key={`${item.action}-${item.timestamp}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--border-soft)] bg-[var(--sidebar)] px-3 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  {item.action === "OPEN" ? "Opened" : "Closed"} {item.direction}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Entry {formatChainUsdPrice(item.entryPrice)}
                  {item.exitPrice ? ` · Exit ${formatChainUsdPrice(item.exitPrice)}` : ` · Current ${formatChainUsdPrice(currentPrice)}`}
                  {item.closeReason ? ` · ${formatCloseReason(item.closeReason)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--text)]">
                  {item.pnl ? formatSignedUsd(Number(toBigIntValue(item.pnl))) : `${formatUsd(Number(toBigIntValue(item.size)))} size`}
                </p>
                <p className="text-xs text-[var(--subtle)]">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(item.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Trades will appear here after you open or close positions in this tournament.
        </p>
      )}
    </div>
  );
}

function FairTradingRulesCard() {
  const rules = [
    "Every trader starts with the same virtual balance.",
    "Everyone uses the same tournament BTC price.",
    "Stop Loss and Take Profit are enforced by the keeper.",
    "Leaderboard ranking is based on Return %.",
    "Rewards are settled on-chain after the tournament ends.",
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {rules.map((rule) => (
          <div key={rule} className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--sidebar)] px-3 py-3 text-sm text-[var(--muted)]">
            {rule}
          </div>
        ))}
      </div>
    </div>
  );
}

function RewardPanel({
  rankLabel,
  returnLabel,
  rewardLabel,
  statusLabel,
}: {
  rankLabel: string;
  returnLabel: string;
  rewardLabel: string;
  statusLabel: string;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--panel-soft)] p-4">
      <p className="section-kicker">Reward</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <InfoPanel title="Your Rank" value={rankLabel} />
        <InfoPanel title="Final PnL %" value={returnLabel} />
        <InfoPanel title="Claimable Reward" value={rewardLabel} />
        <InfoPanel title="Status" value={statusLabel} />
      </div>
    </div>
  );
}


function Toast({
  tone,
  message,
}: {
  tone: "success" | "error" | "info";
  message: string;
}) {
  const styles = {
    success: "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.12)] text-[var(--text)]",
    error: "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.12)] text-[var(--text)]",
    info: "border-[rgba(57,255,136,0.18)] bg-[rgba(57,255,136,0.12)] text-[var(--text)]",
  } satisfies Record<typeof tone, string>;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      className={`pointer-events-auto rounded-[10px] border px-4 py-3 text-sm ${styles[tone]}`}
    >
      {message}
    </motion.div>
  );
}

function CardSkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-5"
        >
          <div className="h-3 w-28 rounded-full bg-[rgba(103,247,177,0.08)]" />
          <div className="mt-4 h-7 w-2/3 rounded-full bg-[rgba(103,247,177,0.08)]" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((__, cell) => (
              <div key={cell} className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-3">
                <div className="h-3 w-16 rounded-full bg-[rgba(103,247,177,0.08)]" />
                <div className="mt-3 h-4 w-20 rounded-full bg-[rgba(103,247,177,0.08)]" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-10 flex-1 rounded-full bg-[rgba(103,247,177,0.08)]" />
            <div className="h-10 w-28 rounded-full bg-[rgba(103,247,177,0.08)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[12px] border border-[var(--border-soft)] bg-[var(--panel)] p-4"
        >
          <div className="grid gap-3 md:grid-cols-[64px_1.3fr_repeat(4,0.9fr)]">
            <div className="h-12 w-12 rounded-[8px] bg-white/[0.05]" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-full bg-[rgba(103,247,177,0.08)]" />
              <div className="h-3 w-20 rounded-full bg-[rgba(103,247,177,0.08)]" />
            </div>
            {Array.from({ length: 4 }).map((__, cell) => (
              <div key={cell} className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--sidebar)] p-3">
                <div className="h-3 w-16 rounded-full bg-[rgba(103,247,177,0.08)]" />
                <div className="mt-3 h-4 w-20 rounded-full bg-[rgba(103,247,177,0.08)]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--border-soft)] bg-[var(--sidebar)] px-5 py-8 text-center">
      <p className="text-lg font-semibold text-[var(--text)]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{copy}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--subtle)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warning" | "error";
  children: ReactNode;
}) {
  const styles = {
    info: "border-[rgba(57,255,136,0.18)] bg-[rgba(57,255,136,0.12)] text-[var(--text)]",
    warning: "border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.12)] text-[var(--text)]",
    error: "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.12)] text-[var(--text)]",
  } satisfies Record<typeof tone, string>;

  return (
    <div className={`rounded-[10px] border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>
  );
}

function renderMutationNotice<TData>(
  mutation: {
    isPending: boolean;
    error: unknown;
    data?: TData;
  },
  copy: { pending: string; success: string },
) {
  if (mutation.isPending) return <Notice tone="info">{copy.pending}</Notice>;
  if (mutation.error) return <Notice tone="error">{extractErrorMessage(mutation.error)}</Notice>;
  if (mutation.data !== undefined) return <Notice tone="info">{copy.success}</Notice>;
  return null;
}

function mapStatusKind(
  status: string,
): "live" | "soon" | "ended" | "settled" | "settling" | "claim" {
  if (status === "Live" || status === "Active") return "live";
  if (status === "Upcoming" || status === "Soon") return "soon";
  if (status === "Settling") return "settling";
  if (status === "Claim Open") return "claim";
  if (status === "Settled") return "settled";
  return "ended";
}

function mapStatusLabel(status: string): string {
  if (status === "Active") return "Live";
  if (status === "Upcoming") return "Soon";
  return status;
}

function getTournamentLifecycleState(
  tournament: TournamentView,
  now: number,
): "Upcoming" | "Live" | "Ended" | "Settled" | "Claim Open" {
  const start = normalizeTimestampMs(tournament.start_time);
  const end = normalizeTimestampMs(tournament.end_time);

  if (tournament.status === "Settled") {
    return tournament.winners.length ? "Claim Open" : "Settled";
  }
  if (now < start) return "Upcoming";
  if (now >= start && now < end && tournament.status !== "Ended") {
    return "Live";
  }
  if (now >= end) return "Ended";

  return tournament.status === "Active" ? "Live" : "Ended";
}

function getJoinReason(
  tournament: TournamentView,
  now: number,
): string | null {
  const start = normalizeTimestampMs(tournament.start_time);
  if (tournament.status !== "Upcoming" || now >= start) {
    return "Joining closes when the tournament starts.";
  }
  if (tournament.participant_count >= tournament.max_participants) return "Tournament is full.";
  return null;
}

function getTradingDisabledReason(
  tournament: TournamentView,
  participant: ParticipantView | null,
  now: number,
  priceStale: boolean,
): string | null {
  if (!participant) return "Join this tournament before trading.";
  const start = normalizeTimestampMs(tournament.start_time);
  const end = normalizeTimestampMs(tournament.end_time);
  const displayStatus = getTournamentLifecycleState(tournament, now);
  if (displayStatus === "Upcoming" || now < start) return "Tournament has not started yet.";
  if (displayStatus !== "Live" || now >= end) return "Tournament ended. Trading is closed.";
  if (priceStale) return "Tournament price is stale. Waiting for keeper sync.";
  if (participant.position?.is_open) return "You already have an open position.";
  return null;
}

function extractErrorMessage(error: unknown): string {
  const message = rawErrorMessage(error);
  return mapArenaErrorMessage(message);
}

function rawErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected error";
  }
}

function mapArenaErrorMessage(message: string): string {
  if (message.includes("InvalidTimeRange")) {
    return "Invalid tournament time. Please choose a future start time and an end time after start.";
  }
  if (message.includes("TournamentNotActive")) return "Tournament not active.";
  if (message.includes("TournamentNotUpcoming")) return "Tournament already started.";
  if (message.includes("TournamentRequiresEnd")) return "End the tournament on-chain before settling.";
  if (message.includes("PriceStale")) return "Tournament price is stale. Wait for the keeper to sync on-chain.";
  if (message.includes("ExcessivePriceJump")) return "Price update rejected because it exceeded the keeper sanity limit.";
  if (message.includes("NotKeeper")) return "This wallet is not authorized as a keeper.";
  if (message.includes("AlreadyJoined")) return "Already joined.";
  if (message.includes("PositionAlreadyOpen")) return "Position already open.";
  if (message.includes("PositionNotOpen")) return "No open position.";
  if (message.includes("InvalidRiskControls")) return "Stop Loss / Take Profit levels are invalid for this position.";
  if (message.includes("WrongEntryFee")) return "Join requires the exact entry fee.";
  if (message.includes("ParticipantNotFound")) return "Join this tournament before trading.";
  return message;
}

function calculatePnl({
  direction,
  size,
  entryPrice,
  currentPrice,
}: {
  direction: PositionDirection;
  size: number;
  entryPrice: number;
  currentPrice: number;
}) {
  if (!Number.isFinite(size) || !Number.isFinite(entryPrice) || !Number.isFinite(currentPrice)) {
    return { pnl: 0, returnPct: 0 };
  }
  if (size <= 0 || entryPrice <= 0 || currentPrice <= 0) {
    return { pnl: 0, returnPct: 0 };
  }

  const priceDiff =
    direction === "Long" ? currentPrice - entryPrice : entryPrice - currentPrice;
  const pnl = (priceDiff / entryPrice) * size;
  const returnPct = size > 0 ? (pnl / size) * 100 : 0;

  return { pnl, returnPct };
}

function formatSignedUsd(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatUsd(Math.abs(value))}`;
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.00%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function parseTradeSizeNumber(input: string): number {
  const normalized = input.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRiskPriceInput(input: string, label: string): number | null {
  const normalized = input.trim().replace(/,/g, "");
  if (!normalized) return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`${label} must be a valid BTC price.`);
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return value;
}

function parseRiskControls({
  direction,
  entryPrice,
  stopLossInput,
  takeProfitInput,
}: {
  direction: PositionDirection;
  entryPrice: number;
  stopLossInput: string;
  takeProfitInput: string;
}): { stopLossPrice: bigint | null; takeProfitPrice: bigint | null } {
  const stopLossPrice = parseRiskPriceInput(stopLossInput, "Stop Loss");
  const takeProfitPrice = parseRiskPriceInput(takeProfitInput, "Take Profit");
  if ((stopLossPrice != null || takeProfitPrice != null) && entryPrice <= 0) {
    throw new Error("Tournament price is not ready yet.");
  }

  if (direction === "Long") {
    if (stopLossPrice != null && stopLossPrice >= entryPrice) {
      throw new Error("For Long positions, Stop Loss must be below entry price.");
    }
    if (takeProfitPrice != null && takeProfitPrice <= entryPrice) {
      throw new Error("For Long positions, Take Profit must be above entry price.");
    }
  } else {
    if (stopLossPrice != null && stopLossPrice <= entryPrice) {
      throw new Error("For Short positions, Stop Loss must be above entry price.");
    }
    if (takeProfitPrice != null && takeProfitPrice >= entryPrice) {
      throw new Error("For Short positions, Take Profit must be below entry price.");
    }
  }

  return {
    stopLossPrice: stopLossPrice != null ? toContractPrice(stopLossPrice) : null,
    takeProfitPrice: takeProfitPrice != null ? toContractPrice(takeProfitPrice) : null,
  };
}

function formatCloseReason(reason: CloseReason): string {
  if (reason === "StopLoss") return "Stop Loss";
  if (reason === "TakeProfit") return "Take Profit";
  return "Manual";
}

function calculateSyntheticPnl(
  direction: PositionDirection,
  size: bigint,
  entryPrice: bigint,
  exitPrice: bigint,
): bigint {
  if (entryPrice <= 0n) return 0n;
  const diff = direction === "Long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return (size * diff) / entryPrice;
}

function getPriceSyncStatus({
  isSyncing,
  lastPriceSyncAt,
  now,
  tournamentState,
  isStale,
  maxStaleMs,
}: {
  isSyncing: boolean;
  lastPriceSyncAt: number | null;
  now: number;
  tournamentState: "Upcoming" | "Live" | "Ended" | "Settled" | "Claim Open" | null;
  isStale: boolean;
  maxStaleMs: number;
}): string {
  if (isSyncing) return "Syncing tournament price...";
  if (!lastPriceSyncAt) {
    return "Waiting for first keeper sync";
  }
  if (isStale) {
    return `Stale for ${formatRelativeSeconds(lastPriceSyncAt, now)} · limit ${Math.round(maxStaleMs / 1000)}s`;
  }
  if (tournamentState && tournamentState !== "Live") {
    return `Tournament price synced · ${formatRelativeSeconds(lastPriceSyncAt, now)}`;
  }
  return `Tournament price synced · ${formatRelativeSeconds(lastPriceSyncAt, now)}`;
}

function getFriendlyTxError(error: unknown): string {
  const message = extractErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("rejected")
    || normalized.includes("cancelled")
    || normalized.includes("canceled")
    || normalized.includes("denied")
  ) {
    return "Transaction was cancelled in your wallet.";
  }

  if (normalized.includes("signer not ready")) {
    return "Wallet signer not ready. Reconnect your wallet and try again.";
  }

  if (normalized.includes("connect a wallet")) {
    return "Connect a wallet first.";
  }

  return message;
}

function formatRelativeSeconds(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  return `${seconds}s ago`;
}

function validateCreateTournamentTimes(startTimeInput: string, endTimeInput: string, nowMs = Date.now()) {
  const now = Math.floor(nowMs / 1000);
  const startMs = new Date(startTimeInput).getTime();
  const endMs = new Date(endTimeInput).getTime();
  const start = Math.floor(startMs / 1000);
  const end = Math.floor(endMs / 1000);
  const hasValidStart = Number.isFinite(startMs);
  const hasValidEnd = Number.isFinite(endMs);

  let error: string | null = null;
  if (!hasValidStart || !hasValidEnd) {
    error = "Start and end times must be valid timestamps.";
  } else if (start <= now + CREATE_TOURNAMENT_START_BUFFER_SECONDS) {
    error = "Start time must be at least 1 minute from now.";
  } else if (end <= start) {
    error = "End time must be after start.";
  } else if (end - start < CREATE_TOURNAMENT_MIN_DURATION_SECONDS) {
    error = "Tournament duration must be at least 5 minutes.";
  } else if (end - start > CREATE_TOURNAMENT_MAX_DURATION_SECONDS) {
    error = "Tournament duration cannot exceed 30 days.";
  }

  return {
    startMs: hasValidStart ? startMs : null,
    endMs: hasValidEnd ? endMs : null,
    durationLabel:
      hasValidStart && hasValidEnd && endMs > startMs
        ? formatDurationLabel(endMs - startMs)
        : "—",
    error,
  };
}

function formatDurationLabel(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "—";

  const totalMinutes = Math.floor(durationMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}

function isParticipantQualified({
  participantAddress,
  finalValue,
  realizedPnl,
  unrealizedPnl,
  positionOpen,
  tournament,
  currentAccount,
  currentTradeCount,
}: {
  participantAddress: string;
  finalValue: string;
  realizedPnl: string;
  unrealizedPnl: string;
  positionOpen: boolean;
  tournament: TournamentView | null;
  currentAccount: string | null;
  currentTradeCount: number;
}): boolean {
  if (!tournament) return false;
  if (sameAddress(participantAddress, currentAccount) && currentTradeCount > 0) return true;

  const initialBalance = toBigIntValue(tournament.initial_virtual_balance);
  return (
    positionOpen ||
    toBigIntValue(realizedPnl) !== 0n ||
    toBigIntValue(unrealizedPnl) !== 0n ||
    toBigIntValue(finalValue) !== initialBalance
  );
}

function buildLeaderboardProjection({
  entries,
  tournament,
  currentAccount,
  currentTradeCount,
}: {
  entries: LeaderboardEntry[];
  tournament: TournamentView | null;
  currentAccount: string | null;
  currentTradeCount: number;
}) {
  const projected = entries.map((entry, index) => {
    const qualified = isParticipantQualified({
      participantAddress: entry.participant,
      finalValue: entry.final_value,
      realizedPnl: entry.realized_pnl,
      unrealizedPnl: entry.unrealized_pnl,
      positionOpen: Boolean(entry.position?.is_open),
      tournament,
      currentAccount,
      currentTradeCount,
    });
    const tradeCount = sameAddress(entry.participant, currentAccount)
      ? currentTradeCount
      : qualified
        ? 1
        : 0;

    return { ...entry, qualified, tradeCount, originalIndex: index };
  });

  const qualified = projected
    .filter((entry) => entry.qualified)
    .sort((left, right) => {
      const returnDiff = toBigIntValue(right.return_percentage_bps) - toBigIntValue(left.return_percentage_bps);
      if (returnDiff !== 0n) return returnDiff > 0n ? 1 : -1;
      if (right.tradeCount !== left.tradeCount) return right.tradeCount - left.tradeCount;
      return left.originalIndex - right.originalIndex;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const inactive = projected.filter((entry) => !entry.qualified);

  return { qualified, inactive };
}

function getRewardStatus({
  participant,
  participantQualified,
  tournament,
  winner,
  claimableRewardValue,
}: {
  participant: ParticipantView | null;
  participantQualified: boolean;
  tournament: TournamentView | null;
  winner: TournamentView["winners"][number] | null;
  claimableRewardValue: bigint;
}): string {
  if (!participant) return "Not joined";
  if (!participantQualified) return "Not qualified";
  if (!tournament) return "No tournament selected";
  if (tournament.status !== "Settled") {
    return getTournamentLifecycleState(tournament, Date.now()) === "Ended"
      ? "Awaiting settlement"
      : "Tournament still live";
  }
  if (claimableRewardValue > 0n) return "Ready to claim";
  if (winner && toBigIntValue(winner.payout) > 0n) return "Claimed";
  return "Not eligible";
}

function tradeHistoryStorageKey(programId: string, address: string, tournamentId: string): string {
  return `tradevaultArena.tradeHistory.${programId}.${address}.${tournamentId}`;
}

function readTradeHistory(programId: string, address: string, tournamentId: string): TradeHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(tradeHistoryStorageKey(programId, address, tournamentId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as TradeHistoryItem[] : [];
  } catch {
    return [];
  }
}

function appendTradeHistory(
  programId: string,
  address: string,
  tournamentId: string,
  current: TradeHistoryItem[],
  nextItem: TradeHistoryItem,
): TradeHistoryItem[] {
  const next = [...current, nextItem].slice(-20);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      tradeHistoryStorageKey(programId, address, tournamentId),
      JSON.stringify(next),
    );
  }
  return next;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function useHashRoute(): [AppRoute, (route: AppRoute) => void] {
  const [route, setRouteState] = useState<AppRoute>(() => parseCurrentRoute(window.location));

  useEffect(() => {
    const onRouteChange = () => setRouteState(parseCurrentRoute(window.location));
    window.addEventListener("hashchange", onRouteChange);
    window.addEventListener("popstate", onRouteChange);
    return () => {
      window.removeEventListener("hashchange", onRouteChange);
      window.removeEventListener("popstate", onRouteChange);
    };
  }, []);

  const setRoute = (next: AppRoute) => {
    const path = toAppRoutePath(next);
    setRouteState(next);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath !== path || window.location.hash) {
      window.history.pushState({}, "", path);
    }
  };

  return [route, setRoute];
}

function parseCurrentRoute(locationLike: { pathname: string; hash: string }): AppRoute {
  const pathname = normalizePath(locationLike.pathname);
  if (pathname !== "/") {
    return parseRoutePath(pathname);
  }

  return parseRoutePath(normalizeHashPath(locationLike.hash));
}

function parseRoutePath(normalized: string): AppRoute {
  if (normalized === "/" || normalized === "/home") {
    return { page: "home" };
  }

  if (normalized.startsWith("/trade/")) {
    const tournamentId = normalized.slice("/trade/".length).trim();
    return tournamentId ? { page: "trade", tournamentId } : { page: "trade" };
  }

  if (normalized.startsWith("/tournament/")) {
    const tournamentId = normalized.slice("/tournament/".length).trim();
    return tournamentId ? { page: "trade", tournamentId } : { page: "trade" };
  }

  if (normalized.startsWith("/tournaments/")) {
    const tournamentId = normalized.slice("/tournaments/".length).trim();
    return tournamentId ? { page: "trade", tournamentId } : { page: "tournaments" };
  }

  switch (normalized) {
    case "/tournaments":
      return { page: "tournaments" };
    case "/trade":
      return { page: "trade" };
    case "/leaderboard":
      return { page: "leaderboard" };
    case "/docs":
      return { page: "docs" };
    case "/rewards":
      return { page: "rewards" };
    case "/vault":
      return { page: "vault" };
    case "/admin":
      return { page: "admin" };
    default:
      return { page: "home" };
  }
}

function normalizeHashPath(hash: string): string {
  const raw = hash.replace(/^#/, "").trim();
  if (!raw) return "/";

  const [path] = raw.split(/[?#]/, 1);
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");

  if (collapsed === "/") return "/";
  return collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;
}

function normalizePath(pathname: string): string {
  const raw = pathname.trim() || "/";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");

  if (collapsed === "/") return "/";
  return collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;
}

function toAppRoutePath(route: AppRoute): string {
  switch (route.page) {
    case "tournaments":
      return "/tournaments";
    case "leaderboard":
      return "/leaderboard";
    case "docs":
      return "/docs";
    case "rewards":
      return "/rewards";
    case "vault":
      return "/vault";
    case "admin":
      return "/admin";
    case "trade":
      return route.tournamentId ? `/trade/${route.tournamentId}` : "/trade";
    case "tournament":
      return route.tournamentId ? `/trade/${route.tournamentId}` : "/trade";
    default:
      return "/";
  }
}

function resolveBanner({
  apiError,
  apiStatus,
  hasProgramId,
  networkName,
  walletError,
  walletStatus,
  accountAddress,
}: {
  apiError: string | null;
  apiStatus: string;
  hasProgramId: boolean;
  networkName: string;
  walletError: string | null;
  walletStatus: string;
  accountAddress: string | null;
}): { tone: "info" | "warning" | "error"; message: string } | null {
  if (!hasProgramId) {
    return {
      tone: "error",
      message: "TradeVault Arena is missing its deployed program configuration.",
    };
  }

  if (apiError) {
    return { tone: "error", message: apiError };
  }

  if (apiStatus !== "ready") {
    return { tone: "warning", message: `Connecting to ${networkName}...` };
  }

  if (walletError) {
    return { tone: "error", message: walletError };
  }

  if (walletStatus === "unavailable") {
    return {
      tone: "warning",
      message: "No Vara-compatible wallet extension was detected. Install SubWallet, Talisman, or Polkadot.js.",
    };
  }

  if (!accountAddress) {
    return {
      tone: "warning",
      message: "Connect a wallet to join tournaments, trade BTC/USD, and claim rewards.",
    };
  }

  return null;
}
