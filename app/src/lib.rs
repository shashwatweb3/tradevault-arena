#![no_std]

use sails_rs::{
    cell::RefCell,
    collections::{BTreeMap, BTreeSet},
    gstd::{exec, msg},
    prelude::*,
};

type TournamentId = u64;

const WINNER_SHARES: [u128; 3] = [60, 30, 10];
const RETURN_SCALE_BPS: i128 = 10_000;
const PAYOUT_MESSAGE: &[u8] = b"tradevault-payout";
const DEFAULT_MAX_STALE_MS: u64 = 30_000;
const MAX_PRICE_JUMP_BPS: u128 = 1_000;
const BPS_SCALE: u128 = 10_000;

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum TournamentStatus {
    Upcoming,
    Active,
    Ended,
    Settled,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum PositionDirection {
    Long,
    Short,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum CloseReason {
    Manual,
    StopLoss,
    TakeProfit,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum ArenaError {
    Unauthorized,
    NotKeeper,
    EmptyName,
    InvalidEntryFee,
    InvalidTimeRange,
    InvalidInitialBalance,
    InvalidMaxParticipants,
    InvalidPrice,
    PriceStale,
    ExcessivePriceJump,
    TournamentNotFound,
    TournamentNotUpcoming,
    TournamentNotActive,
    TournamentNotEnded,
    TournamentAlreadyEnded,
    TournamentAlreadySettled,
    TournamentRequiresEnd,
    TournamentFull,
    JoinWindowClosed,
    AlreadyJoined,
    IncorrectEntryFee,
    ParticipantNotFound,
    PositionAlreadyOpen,
    PositionNotOpen,
    InvalidPositionSize,
    InvalidRiskControls,
    InsufficientEquity,
    MathOverflow,
    PayoutFailed,
    RewardNotAvailable,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct Position {
    pub entry_price: u128,
    pub size: u128,
    pub direction: PositionDirection,
    pub stop_loss_price: Option<u128>,
    pub take_profit_price: Option<u128>,
    pub is_open: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct ParticipantState {
    pub initial_virtual_balance: u128,
    pub realized_pnl: i128,
    pub position: Option<Position>,
    pub claimable_reward: u128,
    pub last_close_reason: Option<CloseReason>,
    pub last_close_price: Option<u128>,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct WinnerPayout {
    pub rank: u8,
    pub participant: ActorId,
    pub payout: u128,
    pub final_value: i128,
    pub return_percentage_bps: i128,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct SettlementResult {
    pub tournament_id: TournamentId,
    pub final_btc_price: u128,
    pub prize_pool: u128,
    pub winners: Vec<WinnerPayout>,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct Tournament {
    pub tournament_id: TournamentId,
    pub name: String,
    pub entry_fee: u128,
    pub start_time: u64,
    pub end_time: u64,
    pub initial_virtual_balance: u128,
    pub max_participants: u32,
    pub status: TournamentStatus,
    pub prize_pool: u128,
    pub final_btc_price: Option<u128>,
    pub participants: Vec<ActorId>,
    pub participant_states: BTreeMap<ActorId, ParticipantState>,
    pub settlement: Option<SettlementResult>,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct TournamentView {
    pub tournament_id: TournamentId,
    pub name: String,
    pub entry_fee: u128,
    pub start_time: u64,
    pub end_time: u64,
    pub initial_virtual_balance: u128,
    pub max_participants: u32,
    pub participant_count: u32,
    pub prize_pool: u128,
    pub status: TournamentStatus,
    pub final_btc_price: Option<u128>,
    pub winners: Vec<WinnerPayout>,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct ParticipantView {
    pub tournament_id: TournamentId,
    pub participant: ActorId,
    pub initial_virtual_balance: u128,
    pub realized_pnl: i128,
    pub unrealized_pnl: i128,
    pub final_value: i128,
    pub return_percentage_bps: i128,
    pub position: Option<Position>,
    pub claimable_reward: u128,
    pub last_close_reason: Option<CloseReason>,
    pub last_close_price: Option<u128>,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct LeaderboardEntry {
    pub rank: u8,
    pub participant: ActorId,
    pub final_value: i128,
    pub realized_pnl: i128,
    pub unrealized_pnl: i128,
    pub return_percentage_bps: i128,
    pub position: Option<Position>,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct KeeperTickSummary {
    pub price_updated: bool,
    pub positions_closed: u32,
    pub tournament_ended: bool,
    pub tournament_settled: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
#[sails_rs::event]
pub enum TradeVaultArenaEvent {
    TournamentCreated {
        tournament_id: TournamentId,
        name: String,
    },
    TournamentJoined {
        tournament_id: TournamentId,
        participant: ActorId,
        prize_pool: u128,
    },
    MockPriceUpdated {
        price: u128,
    },
    PriceUpdated {
        tournament_id: TournamentId,
        price: u128,
        timestamp: u64,
    },
    KeeperAdded {
        keeper: ActorId,
    },
    KeeperRemoved {
        keeper: ActorId,
    },
    PositionOpened {
        tournament_id: TournamentId,
        participant: ActorId,
        direction: PositionDirection,
        size: u128,
        entry_price: u128,
        stop_loss_price: Option<u128>,
        take_profit_price: Option<u128>,
    },
    PositionClosed {
        tournament_id: TournamentId,
        participant: ActorId,
        realized_pnl: i128,
        exit_price: u128,
        close_reason: CloseReason,
    },
    StopLossTriggered {
        tournament_id: TournamentId,
        participant: ActorId,
        trigger_price: u128,
    },
    TakeProfitTriggered {
        tournament_id: TournamentId,
        participant: ActorId,
        trigger_price: u128,
    },
    TournamentEnded {
        tournament_id: TournamentId,
        final_btc_price: u128,
    },
    TournamentSettled {
        tournament_id: TournamentId,
        winners: Vec<WinnerPayout>,
    },
    KeeperTickProcessed {
        tournament_id: TournamentId,
        positions_closed: u32,
        tournament_ended: bool,
        tournament_settled: bool,
    },
    RewardClaimed {
        tournament_id: TournamentId,
        participant: ActorId,
        payout: u128,
    },
}

#[derive(Clone, Debug, Default)]
pub struct ArenaState {
    pub admin: ActorId,
    pub current_btc_price: u128,
    pub last_price_update_time: u64,
    pub max_stale_ms: u64,
    pub keepers: BTreeSet<ActorId>,
    pub next_tournament_id: TournamentId,
    pub tournaments: BTreeMap<TournamentId, Tournament>,
}

pub struct Program {
    state: RefCell<ArenaState>,
}

#[sails_rs::program]
impl Program {
    pub fn create(initial_btc_price: u128) -> Self {
        assert!(initial_btc_price > 0, "Initial BTC price must be positive");

        Self {
            state: RefCell::new(ArenaState {
                admin: msg::source(),
                current_btc_price: initial_btc_price,
                last_price_update_time: exec::block_timestamp(),
                max_stale_ms: DEFAULT_MAX_STALE_MS,
                keepers: BTreeSet::new(),
                next_tournament_id: 1,
                tournaments: BTreeMap::new(),
            }),
        }
    }

    pub fn tradevault_arena(&self) -> TradeVaultArenaService<'_> {
        TradeVaultArenaService::new(&self.state)
    }
}

pub struct TradeVaultArenaService<'a> {
    state: &'a RefCell<ArenaState>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct AutoCloseRecord {
    participant: ActorId,
    realized_pnl: i128,
    exit_price: u128,
    close_reason: CloseReason,
}

impl<'a> TradeVaultArenaService<'a> {
    pub fn new(state: &'a RefCell<ArenaState>) -> Self {
        Self { state }
    }

    fn now() -> u64 {
        exec::block_timestamp()
    }

    fn caller() -> ActorId {
        msg::source()
    }

    fn ensure_admin(&self) -> Result<(), ArenaError> {
        if TradeVaultArenaService::caller() != self.state.borrow().admin {
            return Err(ArenaError::Unauthorized);
        }

        Ok(())
    }

    fn ensure_keeper_or_admin(&self) -> Result<bool, ArenaError> {
        let caller = TradeVaultArenaService::caller();
        let state = self.state.borrow();
        if caller == state.admin {
            return Ok(true);
        }
        if state.keepers.contains(&caller) {
            return Ok(false);
        }

        Err(ArenaError::NotKeeper)
    }

    fn is_price_stale_at(now: u64, last_price_update_time: u64, max_stale_ms: u64) -> bool {
        now.saturating_sub(last_price_update_time) > max_stale_ms
    }

    fn ensure_fresh_price(state: &ArenaState) -> Result<(), ArenaError> {
        if TradeVaultArenaService::is_price_stale_at(
            TradeVaultArenaService::now(),
            state.last_price_update_time,
            state.max_stale_ms,
        ) {
            return Err(ArenaError::PriceStale);
        }

        Ok(())
    }

    fn validate_price_update(
        previous_price: u128,
        new_price: u128,
        allow_large_jump: bool,
    ) -> Result<(), ArenaError> {
        if new_price == 0 {
            return Err(ArenaError::InvalidPrice);
        }

        if allow_large_jump || previous_price == 0 || previous_price == new_price {
            return Ok(());
        }

        let price_diff = previous_price.abs_diff(new_price);
        let scaled_diff = price_diff
            .checked_mul(BPS_SCALE)
            .ok_or(ArenaError::MathOverflow)?;
        let max_allowed = previous_price
            .checked_mul(MAX_PRICE_JUMP_BPS)
            .ok_or(ArenaError::MathOverflow)?;
        if scaled_diff > max_allowed {
            return Err(ArenaError::ExcessivePriceJump);
        }

        Ok(())
    }

    fn write_price_update(
        state: &mut ArenaState,
        new_price: u128,
        allow_large_jump: bool,
    ) -> Result<u64, ArenaError> {
        TradeVaultArenaService::validate_price_update(
            state.current_btc_price,
            new_price,
            allow_large_jump,
        )?;

        let timestamp = TradeVaultArenaService::now();
        state.current_btc_price = new_price;
        state.last_price_update_time = timestamp;

        Ok(timestamp)
    }

    fn sync_active_status(tournament: &mut Tournament) {
        if matches!(tournament.status, TournamentStatus::Upcoming) {
            let now = TradeVaultArenaService::now();
            if now >= tournament.start_time && now < tournament.end_time {
                tournament.status = TournamentStatus::Active;
            }
        }
    }

    fn ranking_price(current_price: u128, tournament: &Tournament) -> u128 {
        tournament.final_btc_price.unwrap_or(current_price)
    }

    fn validate_risk_controls(
        direction: &PositionDirection,
        entry_price: u128,
        stop_loss_price: Option<u128>,
        take_profit_price: Option<u128>,
    ) -> Result<(), ArenaError> {
        if let Some(stop_loss_price) = stop_loss_price {
            if stop_loss_price == 0 {
                return Err(ArenaError::InvalidRiskControls);
            }

            match direction {
                PositionDirection::Long if stop_loss_price >= entry_price => {
                    return Err(ArenaError::InvalidRiskControls);
                }
                PositionDirection::Short if stop_loss_price <= entry_price => {
                    return Err(ArenaError::InvalidRiskControls);
                }
                _ => {}
            }
        }

        if let Some(take_profit_price) = take_profit_price {
            if take_profit_price == 0 {
                return Err(ArenaError::InvalidRiskControls);
            }

            match direction {
                PositionDirection::Long if take_profit_price <= entry_price => {
                    return Err(ArenaError::InvalidRiskControls);
                }
                PositionDirection::Short if take_profit_price >= entry_price => {
                    return Err(ArenaError::InvalidRiskControls);
                }
                _ => {}
            }
        }

        Ok(())
    }

    fn unrealized_pnl_at(
        participant: &ParticipantState,
        current_price: u128,
    ) -> Result<i128, ArenaError> {
        let Some(position) = &participant.position else {
            return Ok(0);
        };

        let entry = i128::try_from(position.entry_price).map_err(|_| ArenaError::MathOverflow)?;
        let current = i128::try_from(current_price).map_err(|_| ArenaError::MathOverflow)?;
        let size = i128::try_from(position.size).map_err(|_| ArenaError::MathOverflow)?;
        let delta = current.checked_sub(entry).ok_or(ArenaError::MathOverflow)?;
        let scaled = size
            .checked_mul(delta)
            .ok_or(ArenaError::MathOverflow)?
            .checked_div(entry)
            .ok_or(ArenaError::MathOverflow)?;
        let directional = match position.direction {
            PositionDirection::Long => scaled,
            PositionDirection::Short => scaled.checked_neg().ok_or(ArenaError::MathOverflow)?,
        };

        Ok(directional.max(-size))
    }

    fn final_value_at(
        participant: &ParticipantState,
        current_price: u128,
    ) -> Result<i128, ArenaError> {
        let initial = i128::try_from(participant.initial_virtual_balance)
            .map_err(|_| ArenaError::MathOverflow)?;
        let unrealized = TradeVaultArenaService::unrealized_pnl_at(participant, current_price)?;

        initial
            .checked_add(participant.realized_pnl)
            .and_then(|value| value.checked_add(unrealized))
            .ok_or(ArenaError::MathOverflow)
    }

    fn return_percentage_bps(final_value: i128, initial_balance: u128) -> Result<i128, ArenaError> {
        let initial = i128::try_from(initial_balance).map_err(|_| ArenaError::MathOverflow)?;
        let gain = final_value
            .checked_sub(initial)
            .ok_or(ArenaError::MathOverflow)?;

        gain.checked_mul(RETURN_SCALE_BPS)
            .and_then(|value| value.checked_div(initial))
            .ok_or(ArenaError::MathOverflow)
    }

    fn close_position_state(
        participant_state: &mut ParticipantState,
        current_price: u128,
        close_reason: CloseReason,
    ) -> Result<i128, ArenaError> {
        if participant_state.position.is_none() {
            return Err(ArenaError::PositionNotOpen);
        }

        let realized_pnl =
            TradeVaultArenaService::unrealized_pnl_at(participant_state, current_price)?;
        participant_state.realized_pnl = participant_state
            .realized_pnl
            .checked_add(realized_pnl)
            .ok_or(ArenaError::MathOverflow)?;
        participant_state.position = None;
        participant_state.last_close_reason = Some(close_reason);
        participant_state.last_close_price = Some(current_price);

        Ok(realized_pnl)
    }

    fn close_reason_for_price(position: &Position, current_price: u128) -> Option<CloseReason> {
        match position.direction {
            PositionDirection::Long => {
                if let Some(stop_loss_price) = position.stop_loss_price {
                    if current_price <= stop_loss_price {
                        return Some(CloseReason::StopLoss);
                    }
                }
                if let Some(take_profit_price) = position.take_profit_price {
                    if current_price >= take_profit_price {
                        return Some(CloseReason::TakeProfit);
                    }
                }
                None
            }
            PositionDirection::Short => {
                if let Some(stop_loss_price) = position.stop_loss_price {
                    if current_price >= stop_loss_price {
                        return Some(CloseReason::StopLoss);
                    }
                }
                if let Some(take_profit_price) = position.take_profit_price {
                    if current_price <= take_profit_price {
                        return Some(CloseReason::TakeProfit);
                    }
                }
                None
            }
        }
    }

    fn participant_view(
        tournament_id: TournamentId,
        participant: ActorId,
        participant_state: &ParticipantState,
        current_price: u128,
    ) -> Result<ParticipantView, ArenaError> {
        let unrealized_pnl =
            TradeVaultArenaService::unrealized_pnl_at(participant_state, current_price)?;
        let final_value = TradeVaultArenaService::final_value_at(participant_state, current_price)?;
        let return_percentage_bps = TradeVaultArenaService::return_percentage_bps(
            final_value,
            participant_state.initial_virtual_balance,
        )?;

        Ok(ParticipantView {
            tournament_id,
            participant,
            initial_virtual_balance: participant_state.initial_virtual_balance,
            realized_pnl: participant_state.realized_pnl,
            unrealized_pnl,
            final_value,
            return_percentage_bps,
            position: participant_state.position.clone(),
            claimable_reward: participant_state.claimable_reward,
            last_close_reason: participant_state.last_close_reason.clone(),
            last_close_price: participant_state.last_close_price,
        })
    }

    fn tournament_view(tournament: &Tournament) -> TournamentView {
        TournamentView {
            tournament_id: tournament.tournament_id,
            name: tournament.name.clone(),
            entry_fee: tournament.entry_fee,
            start_time: tournament.start_time,
            end_time: tournament.end_time,
            initial_virtual_balance: tournament.initial_virtual_balance,
            max_participants: tournament.max_participants,
            participant_count: tournament.participants.len() as u32,
            prize_pool: tournament.prize_pool,
            status: tournament.status.clone(),
            final_btc_price: tournament.final_btc_price,
            winners: tournament
                .settlement
                .as_ref()
                .map(|result| result.winners.clone())
                .unwrap_or_default(),
        }
    }

    fn sorted_leaderboard(
        tournament_id: TournamentId,
        tournament: &Tournament,
        current_price: u128,
    ) -> Result<Vec<LeaderboardEntry>, ArenaError> {
        let mut entries = Vec::new();

        for participant in &tournament.participants {
            let state = tournament
                .participant_states
                .get(participant)
                .ok_or(ArenaError::ParticipantNotFound)?;
            let view = TradeVaultArenaService::participant_view(
                tournament_id,
                *participant,
                state,
                TradeVaultArenaService::ranking_price(current_price, tournament),
            )?;

            entries.push(LeaderboardEntry {
                rank: 0,
                participant: *participant,
                final_value: view.final_value,
                realized_pnl: view.realized_pnl,
                unrealized_pnl: view.unrealized_pnl,
                return_percentage_bps: view.return_percentage_bps,
                position: view.position,
            });
        }

        entries.sort_by(|a, b| {
            b.return_percentage_bps
                .cmp(&a.return_percentage_bps)
                .then_with(|| b.final_value.cmp(&a.final_value))
                .then_with(|| a.participant.as_ref().cmp(b.participant.as_ref()))
        });

        for (index, entry) in entries.iter_mut().enumerate() {
            entry.rank = (index + 1) as u8;
        }

        Ok(entries)
    }

    fn payout_shares(winner_count: usize) -> Vec<u128> {
        if winner_count == 0 {
            return Vec::new();
        }

        let used_total: u128 = WINNER_SHARES.iter().take(winner_count).sum();
        WINNER_SHARES
            .iter()
            .take(winner_count)
            .map(|share| share * 100 / used_total)
            .collect()
    }

    fn process_price_update(
        tournament_id: TournamentId,
        tournament: &mut Tournament,
        current_price: u128,
    ) -> Result<Vec<AutoCloseRecord>, ArenaError> {
        TradeVaultArenaService::sync_active_status(tournament);
        let now = TradeVaultArenaService::now();
        if !matches!(tournament.status, TournamentStatus::Active) || now >= tournament.end_time {
            return Ok(Vec::new());
        }

        let participants = tournament.participants.clone();
        let mut closed_positions = Vec::new();
        for participant in participants {
            let Some(participant_state) = tournament.participant_states.get_mut(&participant)
            else {
                continue;
            };
            let Some(position) = participant_state.position.clone() else {
                continue;
            };
            let Some(close_reason) =
                TradeVaultArenaService::close_reason_for_price(&position, current_price)
            else {
                continue;
            };

            let realized_pnl = TradeVaultArenaService::close_position_state(
                participant_state,
                current_price,
                close_reason.clone(),
            )?;

            closed_positions.push(AutoCloseRecord {
                participant,
                realized_pnl,
                exit_price: current_price,
                close_reason,
            });
        }

        let _ = tournament_id;
        Ok(closed_positions)
    }

    fn end_tournament_state(
        tournament: &mut Tournament,
        current_price: u128,
    ) -> Result<bool, ArenaError> {
        if matches!(tournament.status, TournamentStatus::Settled) {
            return Ok(false);
        }
        if matches!(tournament.status, TournamentStatus::Ended) {
            return Ok(false);
        }
        if TradeVaultArenaService::now() < tournament.end_time {
            return Ok(false);
        }

        tournament.status = TournamentStatus::Ended;
        tournament.final_btc_price = Some(current_price);
        Ok(true)
    }

    fn settle_tournament_state(
        tournament_id: TournamentId,
        tournament: &mut Tournament,
        current_price: u128,
    ) -> Result<Option<SettlementResult>, ArenaError> {
        if matches!(tournament.status, TournamentStatus::Settled) {
            return Ok(None);
        }
        if !matches!(tournament.status, TournamentStatus::Ended) {
            return Ok(None);
        }

        let final_price = TradeVaultArenaService::ranking_price(current_price, tournament);
        let leaderboard =
            TradeVaultArenaService::sorted_leaderboard(tournament_id, tournament, current_price)?;
        let winner_count = leaderboard.len().min(3);
        let shares = TradeVaultArenaService::payout_shares(winner_count);
        let mut distributed = 0u128;
        let mut winners = Vec::new();

        for (index, entry) in leaderboard.iter().take(winner_count).enumerate() {
            let mut payout = tournament
                .prize_pool
                .checked_mul(shares[index])
                .ok_or(ArenaError::MathOverflow)?
                .checked_div(100)
                .ok_or(ArenaError::MathOverflow)?;
            distributed = distributed
                .checked_add(payout)
                .ok_or(ArenaError::MathOverflow)?;

            if index + 1 == winner_count {
                let remainder = tournament
                    .prize_pool
                    .checked_sub(distributed)
                    .ok_or(ArenaError::MathOverflow)?;
                payout = payout
                    .checked_add(remainder)
                    .ok_or(ArenaError::MathOverflow)?;
                distributed = distributed
                    .checked_add(remainder)
                    .ok_or(ArenaError::MathOverflow)?;
            }
            if payout > 0 {
                let participant_state = tournament
                    .participant_states
                    .get_mut(&entry.participant)
                    .ok_or(ArenaError::ParticipantNotFound)?;
                participant_state.claimable_reward = payout;
            }

            winners.push(WinnerPayout {
                rank: (index + 1) as u8,
                participant: entry.participant,
                payout,
                final_value: entry.final_value,
                return_percentage_bps: entry.return_percentage_bps,
            });
        }

        let settlement = SettlementResult {
            tournament_id,
            final_btc_price: final_price,
            prize_pool: tournament.prize_pool,
            winners: winners.clone(),
        };

        tournament.status = TournamentStatus::Settled;
        tournament.final_btc_price = Some(final_price);
        tournament.settlement = Some(settlement.clone());

        Ok(Some(settlement))
    }
}

#[sails_rs::service(events = TradeVaultArenaEvent)]
impl TradeVaultArenaService<'_> {
    #[export]
    pub fn admin(&self) -> ActorId {
        self.state.borrow().admin
    }

    #[export]
    pub fn is_keeper(&self, address: ActorId) -> bool {
        self.state.borrow().keepers.contains(&address)
    }

    #[export]
    pub fn keepers(&self) -> Vec<ActorId> {
        self.state.borrow().keepers.iter().copied().collect()
    }

    #[export]
    pub fn current_mock_price(&self) -> u128 {
        self.state.borrow().current_btc_price
    }

    #[export]
    pub fn last_price_update_time(&self) -> u64 {
        self.state.borrow().last_price_update_time
    }

    #[export]
    pub fn max_stale_ms(&self) -> u64 {
        self.state.borrow().max_stale_ms
    }

    #[export]
    pub fn tournaments(&self) -> Vec<TournamentView> {
        self.state
            .borrow()
            .tournaments
            .values()
            .map(TradeVaultArenaService::tournament_view)
            .collect()
    }

    #[export(unwrap_result)]
    pub fn tournament(&self, tournament_id: TournamentId) -> Result<TournamentView, ArenaError> {
        let state = self.state.borrow();
        let tournament = state
            .tournaments
            .get(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;

        Ok(TradeVaultArenaService::tournament_view(tournament))
    }

    #[export(unwrap_result)]
    pub fn participant(
        &self,
        tournament_id: TournamentId,
        participant: ActorId,
    ) -> Result<ParticipantView, ArenaError> {
        let state = self.state.borrow();
        let tournament = state
            .tournaments
            .get(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;
        let participant_state = tournament
            .participant_states
            .get(&participant)
            .ok_or(ArenaError::ParticipantNotFound)?;

        TradeVaultArenaService::participant_view(
            tournament_id,
            participant,
            participant_state,
            TradeVaultArenaService::ranking_price(state.current_btc_price, tournament),
        )
    }

    #[export(unwrap_result)]
    pub fn leaderboard(
        &self,
        tournament_id: TournamentId,
    ) -> Result<Vec<LeaderboardEntry>, ArenaError> {
        let state = self.state.borrow();
        let tournament = state
            .tournaments
            .get(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;

        TradeVaultArenaService::sorted_leaderboard(
            tournament_id,
            tournament,
            state.current_btc_price,
        )
    }

    #[export(unwrap_result)]
    pub fn create_tournament(
        &mut self,
        name: String,
        entry_fee: u128,
        start_time: u64,
        end_time: u64,
        initial_virtual_balance: u128,
        max_participants: u32,
    ) -> Result<TournamentView, ArenaError> {
        self.ensure_admin()?;

        if name.trim().is_empty() {
            return Err(ArenaError::EmptyName);
        }
        if entry_fee == 0 {
            return Err(ArenaError::InvalidEntryFee);
        }
        if initial_virtual_balance == 0 {
            return Err(ArenaError::InvalidInitialBalance);
        }
        if max_participants == 0 {
            return Err(ArenaError::InvalidMaxParticipants);
        }
        let now = TradeVaultArenaService::now();
        if start_time <= now || end_time <= start_time {
            return Err(ArenaError::InvalidTimeRange);
        }

        let mut state = self.state.borrow_mut();
        let tournament_id = state.next_tournament_id;
        state.next_tournament_id = state
            .next_tournament_id
            .checked_add(1)
            .ok_or(ArenaError::MathOverflow)?;

        let tournament = Tournament {
            tournament_id,
            name: name.clone(),
            entry_fee,
            start_time,
            end_time,
            initial_virtual_balance,
            max_participants,
            status: TournamentStatus::Upcoming,
            prize_pool: 0,
            final_btc_price: None,
            participants: Vec::new(),
            participant_states: BTreeMap::new(),
            settlement: None,
        };

        let view = TradeVaultArenaService::tournament_view(&tournament);
        state.tournaments.insert(tournament_id, tournament);
        self.emit_event(TradeVaultArenaEvent::TournamentCreated {
            tournament_id,
            name,
        })
        .expect("event error");

        Ok(view)
    }

    #[export(unwrap_result)]
    pub fn add_keeper(&mut self, keeper: ActorId) -> Result<bool, ArenaError> {
        self.ensure_admin()?;

        let added = self.state.borrow_mut().keepers.insert(keeper);
        if added {
            self.emit_event(TradeVaultArenaEvent::KeeperAdded { keeper })
                .expect("event error");
        }

        Ok(added)
    }

    #[export(unwrap_result)]
    pub fn remove_keeper(&mut self, keeper: ActorId) -> Result<bool, ArenaError> {
        self.ensure_admin()?;

        let removed = self.state.borrow_mut().keepers.remove(&keeper);
        if removed {
            self.emit_event(TradeVaultArenaEvent::KeeperRemoved { keeper })
                .expect("event error");
        }

        Ok(removed)
    }

    #[export(unwrap_result)]
    pub fn join_tournament(
        &mut self,
        tournament_id: TournamentId,
    ) -> Result<ParticipantView, ArenaError> {
        let caller = TradeVaultArenaService::caller();
        let paid_value = msg::value();
        let now = TradeVaultArenaService::now();

        let mut state = self.state.borrow_mut();
        let current_price = state.current_btc_price;
        let tournament = state
            .tournaments
            .get_mut(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;
        TradeVaultArenaService::sync_active_status(tournament);

        if !matches!(tournament.status, TournamentStatus::Upcoming) {
            return Err(ArenaError::TournamentNotUpcoming);
        }
        if now >= tournament.start_time {
            return Err(ArenaError::JoinWindowClosed);
        }
        if paid_value != tournament.entry_fee {
            return Err(ArenaError::IncorrectEntryFee);
        }
        if tournament.participant_states.contains_key(&caller) {
            return Err(ArenaError::AlreadyJoined);
        }
        if tournament.participants.len() >= tournament.max_participants as usize {
            return Err(ArenaError::TournamentFull);
        }

        let participant_state = ParticipantState {
            initial_virtual_balance: tournament.initial_virtual_balance,
            realized_pnl: 0,
            position: None,
            claimable_reward: 0,
            last_close_reason: None,
            last_close_price: None,
        };

        tournament.participants.push(caller);
        tournament
            .participant_states
            .insert(caller, participant_state.clone());
        tournament.prize_pool = tournament
            .prize_pool
            .checked_add(paid_value)
            .ok_or(ArenaError::MathOverflow)?;

        let view = TradeVaultArenaService::participant_view(
            tournament_id,
            caller,
            &participant_state,
            TradeVaultArenaService::ranking_price(current_price, tournament),
        )?;
        let prize_pool = tournament.prize_pool;

        self.emit_event(TradeVaultArenaEvent::TournamentJoined {
            tournament_id,
            participant: caller,
            prize_pool,
        })
        .expect("event error");

        Ok(view)
    }

    #[export(unwrap_result)]
    pub fn update_mock_price(&mut self, new_price: u128) -> Result<u128, ArenaError> {
        self.ensure_admin()?;

        let mut state = self.state.borrow_mut();
        TradeVaultArenaService::write_price_update(&mut state, new_price, true)?;
        self.emit_event(TradeVaultArenaEvent::MockPriceUpdated { price: new_price })
            .expect("event error");

        Ok(new_price)
    }

    #[export(unwrap_result)]
    pub fn open_position(
        &mut self,
        tournament_id: TournamentId,
        direction: PositionDirection,
        size: u128,
        stop_loss_price: Option<u128>,
        take_profit_price: Option<u128>,
    ) -> Result<ParticipantView, ArenaError> {
        if size == 0 {
            return Err(ArenaError::InvalidPositionSize);
        }

        let caller = TradeVaultArenaService::caller();
        let now = TradeVaultArenaService::now();
        let mut state = self.state.borrow_mut();
        TradeVaultArenaService::ensure_fresh_price(&state)?;
        let current_price = state.current_btc_price;
        let tournament = state
            .tournaments
            .get_mut(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;
        TradeVaultArenaService::sync_active_status(tournament);

        if !matches!(tournament.status, TournamentStatus::Active) {
            return Err(ArenaError::TournamentNotActive);
        }
        if now >= tournament.end_time {
            return Err(ArenaError::TournamentNotActive);
        }

        let participant_state = tournament
            .participant_states
            .get_mut(&caller)
            .ok_or(ArenaError::ParticipantNotFound)?;
        if participant_state.position.is_some() {
            return Err(ArenaError::PositionAlreadyOpen);
        }

        let equity = TradeVaultArenaService::final_value_at(participant_state, current_price)?;
        if equity <= 0 {
            return Err(ArenaError::InsufficientEquity);
        }
        let size_i128 = i128::try_from(size).map_err(|_| ArenaError::MathOverflow)?;
        if size_i128 > equity {
            return Err(ArenaError::InsufficientEquity);
        }
        TradeVaultArenaService::validate_risk_controls(
            &direction,
            current_price,
            stop_loss_price,
            take_profit_price,
        )?;

        participant_state.position = Some(Position {
            entry_price: current_price,
            size,
            direction: direction.clone(),
            stop_loss_price,
            take_profit_price,
            is_open: true,
        });
        participant_state.last_close_reason = None;
        participant_state.last_close_price = None;

        let view = TradeVaultArenaService::participant_view(
            tournament_id,
            caller,
            participant_state,
            current_price,
        )?;
        self.emit_event(TradeVaultArenaEvent::PositionOpened {
            tournament_id,
            participant: caller,
            direction,
            size,
            entry_price: current_price,
            stop_loss_price,
            take_profit_price,
        })
        .expect("event error");

        Ok(view)
    }

    #[export(unwrap_result)]
    pub fn close_position(
        &mut self,
        tournament_id: TournamentId,
    ) -> Result<ParticipantView, ArenaError> {
        let caller = TradeVaultArenaService::caller();
        let now = TradeVaultArenaService::now();
        let mut state = self.state.borrow_mut();
        TradeVaultArenaService::ensure_fresh_price(&state)?;
        let current_price = state.current_btc_price;
        let tournament = state
            .tournaments
            .get_mut(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;
        TradeVaultArenaService::sync_active_status(tournament);

        if !matches!(tournament.status, TournamentStatus::Active) {
            return Err(ArenaError::TournamentNotActive);
        }
        if now >= tournament.end_time {
            return Err(ArenaError::TournamentNotActive);
        }

        let participant_state = tournament
            .participant_states
            .get_mut(&caller)
            .ok_or(ArenaError::ParticipantNotFound)?;
        if participant_state.position.is_none() {
            return Err(ArenaError::PositionNotOpen);
        }

        let realized_pnl = TradeVaultArenaService::close_position_state(
            participant_state,
            current_price,
            CloseReason::Manual,
        )?;

        let view = TradeVaultArenaService::participant_view(
            tournament_id,
            caller,
            participant_state,
            current_price,
        )?;
        self.emit_event(TradeVaultArenaEvent::PositionClosed {
            tournament_id,
            participant: caller,
            realized_pnl,
            exit_price: current_price,
            close_reason: CloseReason::Manual,
        })
        .expect("event error");

        Ok(view)
    }

    #[export(unwrap_result)]
    pub fn end_tournament(
        &mut self,
        tournament_id: TournamentId,
    ) -> Result<TournamentView, ArenaError> {
        self.ensure_admin()?;

        let now = TradeVaultArenaService::now();
        let mut state = self.state.borrow_mut();
        let current_price = state.current_btc_price;
        let tournament = state
            .tournaments
            .get_mut(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;
        TradeVaultArenaService::sync_active_status(tournament);

        if matches!(tournament.status, TournamentStatus::Settled) {
            return Err(ArenaError::TournamentAlreadySettled);
        }
        if matches!(tournament.status, TournamentStatus::Ended) {
            return Err(ArenaError::TournamentAlreadyEnded);
        }
        if now < tournament.end_time {
            return Err(ArenaError::TournamentNotEnded);
        }
        let ended = TradeVaultArenaService::end_tournament_state(tournament, current_price)?;
        if !ended {
            return Err(ArenaError::TournamentAlreadyEnded);
        }

        let view = TradeVaultArenaService::tournament_view(tournament);
        self.emit_event(TradeVaultArenaEvent::TournamentEnded {
            tournament_id,
            final_btc_price: current_price,
        })
        .expect("event error");

        Ok(view)
    }

    #[export(unwrap_result)]
    pub fn settle_tournament(
        &mut self,
        tournament_id: TournamentId,
    ) -> Result<SettlementResult, ArenaError> {
        self.ensure_admin()?;

        let mut state = self.state.borrow_mut();
        let current_price = state.current_btc_price;
        let tournament = state
            .tournaments
            .get_mut(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;

        if matches!(tournament.status, TournamentStatus::Settled) {
            return Err(ArenaError::TournamentAlreadySettled);
        }
        if !matches!(tournament.status, TournamentStatus::Ended) {
            return Err(ArenaError::TournamentRequiresEnd);
        }
        let settlement = TradeVaultArenaService::settle_tournament_state(
            tournament_id,
            tournament,
            current_price,
        )?
        .ok_or(ArenaError::TournamentAlreadySettled)?;

        self.emit_event(TradeVaultArenaEvent::TournamentSettled {
            tournament_id,
            winners: settlement.winners.clone(),
        })
        .expect("event error");

        Ok(settlement)
    }

    #[export(unwrap_result)]
    pub fn update_price_and_process(
        &mut self,
        tournament_id: TournamentId,
        new_btc_price: u128,
    ) -> Result<KeeperTickSummary, ArenaError> {
        self.ensure_admin()?;

        let (closed_positions, summary, timestamp) = {
            let mut state = self.state.borrow_mut();
            let timestamp =
                TradeVaultArenaService::write_price_update(&mut state, new_btc_price, true)?;
            let tournament = state
                .tournaments
                .get_mut(&tournament_id)
                .ok_or(ArenaError::TournamentNotFound)?;
            let closed_positions = TradeVaultArenaService::process_price_update(
                tournament_id,
                tournament,
                new_btc_price,
            )?;
            let summary = KeeperTickSummary {
                price_updated: true,
                positions_closed: closed_positions.len() as u32,
                tournament_ended: false,
                tournament_settled: false,
            };
            (closed_positions, summary, timestamp)
        };

        self.emit_event(TradeVaultArenaEvent::PriceUpdated {
            tournament_id,
            price: new_btc_price,
            timestamp,
        })
        .expect("event error");

        for closed_position in closed_positions {
            match closed_position.close_reason {
                CloseReason::StopLoss => self
                    .emit_event(TradeVaultArenaEvent::StopLossTriggered {
                        tournament_id,
                        participant: closed_position.participant,
                        trigger_price: closed_position.exit_price,
                    })
                    .expect("event error"),
                CloseReason::TakeProfit => self
                    .emit_event(TradeVaultArenaEvent::TakeProfitTriggered {
                        tournament_id,
                        participant: closed_position.participant,
                        trigger_price: closed_position.exit_price,
                    })
                    .expect("event error"),
                CloseReason::Manual => {}
            }

            self.emit_event(TradeVaultArenaEvent::PositionClosed {
                tournament_id,
                participant: closed_position.participant,
                realized_pnl: closed_position.realized_pnl,
                exit_price: closed_position.exit_price,
                close_reason: closed_position.close_reason,
            })
            .expect("event error");
        }

        Ok(summary)
    }

    #[export(unwrap_result)]
    pub fn process_tournament(
        &mut self,
        tournament_id: TournamentId,
    ) -> Result<KeeperTickSummary, ArenaError> {
        self.ensure_admin()?;

        let (ended, settlement) = {
            let mut state = self.state.borrow_mut();
            let current_price = state.current_btc_price;
            let tournament = state
                .tournaments
                .get_mut(&tournament_id)
                .ok_or(ArenaError::TournamentNotFound)?;
            let ended = TradeVaultArenaService::end_tournament_state(tournament, current_price)?;
            let settlement = TradeVaultArenaService::settle_tournament_state(
                tournament_id,
                tournament,
                current_price,
            )?;
            (ended, settlement)
        };

        if ended {
            let final_btc_price = self
                .state
                .borrow()
                .tournaments
                .get(&tournament_id)
                .and_then(|tournament| tournament.final_btc_price)
                .ok_or(ArenaError::TournamentNotFound)?;
            self.emit_event(TradeVaultArenaEvent::TournamentEnded {
                tournament_id,
                final_btc_price,
            })
            .expect("event error");
        }

        if let Some(settlement) = &settlement {
            self.emit_event(TradeVaultArenaEvent::TournamentSettled {
                tournament_id,
                winners: settlement.winners.clone(),
            })
            .expect("event error");
        }

        Ok(KeeperTickSummary {
            price_updated: false,
            positions_closed: 0,
            tournament_ended: ended,
            tournament_settled: settlement.is_some(),
        })
    }

    #[export(unwrap_result)]
    pub fn keeper_tick(
        &mut self,
        tournament_id: TournamentId,
        new_btc_price: u128,
    ) -> Result<KeeperTickSummary, ArenaError> {
        let is_admin = self.ensure_keeper_or_admin()?;

        let (closed_positions, ended, settlement, timestamp) = {
            let mut state = self.state.borrow_mut();
            let timestamp =
                TradeVaultArenaService::write_price_update(&mut state, new_btc_price, is_admin)?;
            let tournament = state
                .tournaments
                .get_mut(&tournament_id)
                .ok_or(ArenaError::TournamentNotFound)?;
            let closed_positions = TradeVaultArenaService::process_price_update(
                tournament_id,
                tournament,
                new_btc_price,
            )?;
            let ended = TradeVaultArenaService::end_tournament_state(tournament, new_btc_price)?;
            let settlement = TradeVaultArenaService::settle_tournament_state(
                tournament_id,
                tournament,
                new_btc_price,
            )?;
            (closed_positions, ended, settlement, timestamp)
        };

        self.emit_event(TradeVaultArenaEvent::PriceUpdated {
            tournament_id,
            price: new_btc_price,
            timestamp,
        })
        .expect("event error");

        for closed_position in &closed_positions {
            match closed_position.close_reason {
                CloseReason::StopLoss => self
                    .emit_event(TradeVaultArenaEvent::StopLossTriggered {
                        tournament_id,
                        participant: closed_position.participant,
                        trigger_price: closed_position.exit_price,
                    })
                    .expect("event error"),
                CloseReason::TakeProfit => self
                    .emit_event(TradeVaultArenaEvent::TakeProfitTriggered {
                        tournament_id,
                        participant: closed_position.participant,
                        trigger_price: closed_position.exit_price,
                    })
                    .expect("event error"),
                CloseReason::Manual => {}
            }

            self.emit_event(TradeVaultArenaEvent::PositionClosed {
                tournament_id,
                participant: closed_position.participant,
                realized_pnl: closed_position.realized_pnl,
                exit_price: closed_position.exit_price,
                close_reason: closed_position.close_reason.clone(),
            })
            .expect("event error");
        }

        if ended {
            self.emit_event(TradeVaultArenaEvent::TournamentEnded {
                tournament_id,
                final_btc_price: new_btc_price,
            })
            .expect("event error");
        }

        if let Some(settlement) = &settlement {
            self.emit_event(TradeVaultArenaEvent::TournamentSettled {
                tournament_id,
                winners: settlement.winners.clone(),
            })
            .expect("event error");
        }

        let summary = KeeperTickSummary {
            price_updated: true,
            positions_closed: closed_positions.len() as u32,
            tournament_ended: ended,
            tournament_settled: settlement.is_some(),
        };

        self.emit_event(TradeVaultArenaEvent::KeeperTickProcessed {
            tournament_id,
            positions_closed: summary.positions_closed,
            tournament_ended: summary.tournament_ended,
            tournament_settled: summary.tournament_settled,
        })
        .expect("event error");

        Ok(summary)
    }

    #[export(unwrap_result)]
    pub fn claim_reward(&mut self, tournament_id: TournamentId) -> Result<u128, ArenaError> {
        let caller = TradeVaultArenaService::caller();

        let payout = {
            let state = self.state.borrow();
            let tournament = state
                .tournaments
                .get(&tournament_id)
                .ok_or(ArenaError::TournamentNotFound)?;

            if !matches!(tournament.status, TournamentStatus::Settled) {
                return Err(ArenaError::TournamentNotEnded);
            }

            let participant_state = tournament
                .participant_states
                .get(&caller)
                .ok_or(ArenaError::ParticipantNotFound)?;

            if participant_state.claimable_reward == 0 {
                return Err(ArenaError::RewardNotAvailable);
            }

            participant_state.claimable_reward
        };

        msg::send_bytes(caller, PAYOUT_MESSAGE, payout).map_err(|_| ArenaError::PayoutFailed)?;

        let mut state = self.state.borrow_mut();
        let tournament = state
            .tournaments
            .get_mut(&tournament_id)
            .ok_or(ArenaError::TournamentNotFound)?;
        let participant_state = tournament
            .participant_states
            .get_mut(&caller)
            .ok_or(ArenaError::ParticipantNotFound)?;
        participant_state.claimable_reward = 0;

        self.emit_event(TradeVaultArenaEvent::RewardClaimed {
            tournament_id,
            participant: caller,
            payout,
        })
        .expect("event error");

        Ok(payout)
    }
}
