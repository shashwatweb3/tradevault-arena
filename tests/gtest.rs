use ::tradevault_arena::WASM_BINARY;
use sails_rs::gtest::constants::UNITS;
use sails_rs::{ActorId, client::*, gtest::*};
use tradevault_arena_client::{
    CloseReason, KeeperTickSummary, LeaderboardEntry, ParticipantView, PositionDirection,
    SettlementResult, TournamentStatus, TournamentView, TradevaultArenaClient,
    TradevaultArenaClientCtors, TradevaultArenaClientProgram,
    tradevault_arena::{self, *},
};

const ADMIN: u64 = 42;
const BOB: u64 = 43;
const CHARLIE: u64 = 44;
const DAVE: u64 = 45;
const EVE: u64 = 46;

const BLOCK_MS: u64 = 3_000;
const INITIAL_PRICE: u128 = 100;
const ENTRY_FEE: u128 = 3 * UNITS;
const INITIAL_BALANCE: u128 = 1_000;
const PROGRAM_RESERVE: u128 = 3 * UNITS;

type ArenaService = sails_rs::client::Service<tradevault_arena::TradevaultArenaImpl, GtestEnv>;

async fn deploy_program() -> (Actor<TradevaultArenaClientProgram, GtestEnv>, GtestEnv) {
    let system = System::new();
    system.init_logger_with_default_filter("gwasm=debug,gtest=info,sails_rs=debug");

    for account in [ADMIN, BOB, CHARLIE, DAVE, EVE] {
        system.mint_to(account, 100_000 * UNITS);
    }

    let code_id = system.submit_code(WASM_BINARY);
    let env = GtestEnv::new(system, ADMIN.into());
    let program = env
        .deploy::<TradevaultArenaClientProgram>(code_id, b"tradevault-arena".to_vec())
        .create(INITIAL_PRICE)
        .with_value(PROGRAM_RESERVE)
        .await
        .unwrap();

    (program, env)
}

fn service_for(program_id: ActorId, env: &GtestEnv) -> ArenaService {
    Actor::<TradevaultArenaClientProgram, GtestEnv>::new(env.clone(), program_id).tradevault_arena()
}

fn actor_env(env: &GtestEnv, actor: u64) -> GtestEnv {
    env.clone().with_actor_id(actor.into())
}

async fn create_tournament(
    program_id: ActorId,
    env: &GtestEnv,
    name: &str,
    start_time: u64,
    end_time: u64,
    max_participants: u32,
) -> TournamentView {
    let mut service = service_for(program_id, env);
    service
        .create_tournament(
            name.into(),
            ENTRY_FEE,
            start_time,
            end_time,
            INITIAL_BALANCE,
            max_participants,
        )
        .await
        .unwrap()
}

async fn join_tournament(
    program_id: ActorId,
    env: &GtestEnv,
    actor: u64,
    tournament_id: u64,
) -> ParticipantView {
    let actor_env = actor_env(env, actor);
    let mut service = service_for(program_id, &actor_env);
    service
        .join_tournament(tournament_id)
        .with_value(ENTRY_FEE)
        .await
        .unwrap()
}

async fn add_keeper(program_id: ActorId, env: &GtestEnv, keeper: u64) -> bool {
    let mut service = service_for(program_id, env);
    service.add_keeper(keeper.into()).await.unwrap()
}

async fn refresh_tournament_price(
    program_id: ActorId,
    env: &GtestEnv,
    tournament_id: u64,
    price: u128,
) -> KeeperTickSummary {
    let mut service = service_for(program_id, env);
    service
        .update_price_and_process(tournament_id, price)
        .await
        .unwrap()
}

fn advance_to_timestamp(env: &GtestEnv, target_timestamp: u64) {
    for _ in 0..64 {
        if env.system().block_timestamp() >= target_timestamp {
            return;
        }
        env.run_next_block();
    }

    panic!("failed to advance test time to target timestamp");
}

#[tokio::test]
async fn admin_creates_tournament_with_expected_fields() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let start_time = now + 5 * BLOCK_MS;
    let end_time = now + 12 * BLOCK_MS;

    let created =
        create_tournament(program_id, &env, "Opening Bell", start_time, end_time, 25).await;

    assert_eq!(created.tournament_id, 1);
    assert!(matches!(created.status, TournamentStatus::Upcoming));
    assert_eq!(created.entry_fee, ENTRY_FEE);
    assert_eq!(created.start_time, start_time);
    assert_eq!(created.end_time, end_time);
    assert_eq!(created.initial_virtual_balance, INITIAL_BALANCE);
    assert_eq!(created.max_participants, 25);

    let service = service_for(program_id, &env);
    let queried = service.tournament(created.tournament_id).await.unwrap();

    assert_eq!(queried.tournament_id, 1);
    assert!(matches!(queried.status, TournamentStatus::Upcoming));
    assert_eq!(queried.entry_fee, ENTRY_FEE);
    assert_eq!(queried.start_time, start_time);
    assert_eq!(queried.end_time, end_time);
    assert_eq!(queried.initial_virtual_balance, INITIAL_BALANCE);
    assert_eq!(queried.max_participants, 25);
}

#[tokio::test]
async fn admin_can_add_keeper() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();

    let added = add_keeper(program_id, &env, BOB).await;
    assert!(added);

    let service = service_for(program_id, &env);
    assert!(service.is_keeper(BOB.into()).await.unwrap());

    let keepers = service.keepers().await.unwrap();
    assert_eq!(keepers, vec![BOB.into()]);
}

#[tokio::test]
async fn non_admin_cannot_add_keeper() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);

    let result: Result<bool, _> = bob_service.add_keeper(CHARLIE.into()).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn keeper_can_call_keeper_tick() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Keeper Access",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _ = add_keeper(program_id, &env, BOB).await;

    let before = service_for(program_id, &env)
        .last_price_update_time()
        .await
        .unwrap();
    env.run_next_block();

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let summary = bob_service
        .keeper_tick(tournament.tournament_id, 101)
        .await
        .unwrap();
    assert!(summary.price_updated);

    let service = service_for(program_id, &env);
    assert_eq!(service.current_mock_price().await.unwrap(), 101);
    assert!(service.last_price_update_time().await.unwrap() > before);
}

#[tokio::test]
async fn random_wallet_cannot_call_keeper_tick() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Unauthorized Keeper",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let eve_env = actor_env(&env, EVE);
    let mut eve_service = service_for(program_id, &eve_env);
    let result: Result<KeeperTickSummary, _> =
        eve_service.keeper_tick(tournament.tournament_id, 101).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn users_join_tournament_and_pool_tracking_updates() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Join Window",
        now + 20 * BLOCK_MS,
        now + 40 * BLOCK_MS,
        4,
    )
    .await;

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let wrong_fee_result: Result<ParticipantView, _> = bob_service
        .join_tournament(tournament.tournament_id)
        .with_value(ENTRY_FEE - 1)
        .await;
    assert!(wrong_fee_result.is_err());

    let bob_join = join_tournament(program_id, &env, BOB, tournament.tournament_id).await;
    assert_eq!(bob_join.participant, BOB.into());
    assert_eq!(bob_join.initial_virtual_balance, INITIAL_BALANCE);

    let admin_service = service_for(program_id, &env);
    let after_bob = admin_service
        .tournament(tournament.tournament_id)
        .await
        .unwrap();
    assert_eq!(after_bob.participant_count, 1);
    assert_eq!(after_bob.prize_pool, ENTRY_FEE);

    let duplicate_join_result: Result<ParticipantView, _> = bob_service
        .join_tournament(tournament.tournament_id)
        .with_value(ENTRY_FEE)
        .await;
    assert!(duplicate_join_result.is_err());

    let _charlie_join = join_tournament(program_id, &env, CHARLIE, tournament.tournament_id).await;
    let after_charlie = admin_service
        .tournament(tournament.tournament_id)
        .await
        .unwrap();
    assert_eq!(after_charlie.participant_count, 2);
    assert_eq!(after_charlie.prize_pool, 2 * ENTRY_FEE);
}

#[tokio::test]
async fn long_trade_flow_realizes_positive_pnl_and_leads_leaderboard() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Long Arena",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, BOB, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let opened = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            1_000,
            None,
            None,
        )
        .await
        .unwrap();
    assert!(opened.position.is_some());

    let mut admin_service = service_for(program_id, &env);
    let updated_price = admin_service.update_mock_price(120).await.unwrap();
    assert_eq!(updated_price, 120);

    let closed = bob_service
        .close_position(tournament.tournament_id)
        .await
        .unwrap();
    assert!(closed.realized_pnl > 0);
    assert_eq!(closed.realized_pnl, 200);
    assert_eq!(closed.final_value, 1_200);
    assert!(closed.position.is_none());

    let leaderboard: Vec<LeaderboardEntry> = admin_service
        .leaderboard(tournament.tournament_id)
        .await
        .unwrap();
    assert_eq!(leaderboard.len(), 1);
    assert_eq!(leaderboard[0].rank, 1);
    assert_eq!(leaderboard[0].participant, BOB.into());
    assert_eq!(leaderboard[0].realized_pnl, 200);
    assert_eq!(leaderboard[0].final_value, 1_200);
}

#[tokio::test]
async fn short_trade_flow_realizes_positive_pnl() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Short Arena",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, CHARLIE, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);

    let charlie_env = actor_env(&env, CHARLIE);
    let mut charlie_service = service_for(program_id, &charlie_env);
    let opened = charlie_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Short,
            500,
            None,
            None,
        )
        .await
        .unwrap();
    assert!(opened.position.is_some());

    let mut admin_service = service_for(program_id, &env);
    let updated_price = admin_service.update_mock_price(90).await.unwrap();
    assert_eq!(updated_price, 90);

    let closed = charlie_service
        .close_position(tournament.tournament_id)
        .await
        .unwrap();
    assert!(closed.realized_pnl > 0);
    assert_eq!(closed.realized_pnl, 50);
    assert_eq!(closed.final_value, 1_050);
    assert!(closed.position.is_none());
}

#[tokio::test]
async fn stale_price_prevents_open_position() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Stale Guard",
        now + 12 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, BOB, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let result: Result<ParticipantView, _> = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            100,
            None,
            None,
        )
        .await;
    assert!(result.is_err());
}

#[tokio::test]
async fn price_update_refreshes_timestamp() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Price Timestamp",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let service = service_for(program_id, &env);
    let before = service.last_price_update_time().await.unwrap();
    env.run_next_block();

    let summary = refresh_tournament_price(program_id, &env, tournament.tournament_id, 101).await;
    assert!(summary.price_updated);

    let after = service_for(program_id, &env)
        .last_price_update_time()
        .await
        .unwrap();
    assert!(after > before);
}

#[tokio::test]
async fn keeper_tick_closes_long_position_on_stop_loss() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Long Stop Loss",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, BOB, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);
    let _ =
        refresh_tournament_price(program_id, &env, tournament.tournament_id, INITIAL_PRICE).await;

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let opened = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            1_000,
            Some(95),
            Some(130),
        )
        .await
        .unwrap();
    assert_eq!(opened.position.unwrap().stop_loss_price, Some(95));

    let mut admin_service = service_for(program_id, &env);
    let summary: KeeperTickSummary = admin_service
        .keeper_tick(tournament.tournament_id, 95)
        .await
        .unwrap();
    assert_eq!(summary.positions_closed, 1);
    assert!(summary.price_updated);

    let participant = bob_service
        .participant(tournament.tournament_id, BOB.into())
        .await
        .unwrap();
    assert!(participant.position.is_none());
    assert_eq!(participant.last_close_reason, Some(CloseReason::StopLoss));
    assert_eq!(participant.last_close_price, Some(95));
}

#[tokio::test]
async fn keeper_tick_closes_long_position_on_take_profit() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Long Take Profit",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, BOB, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);
    let _ =
        refresh_tournament_price(program_id, &env, tournament.tournament_id, INITIAL_PRICE).await;

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let _ = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            1_000,
            Some(95),
            Some(120),
        )
        .await
        .unwrap();

    let mut admin_service = service_for(program_id, &env);
    let summary = admin_service
        .keeper_tick(tournament.tournament_id, 120)
        .await
        .unwrap();
    assert_eq!(summary.positions_closed, 1);

    let participant = bob_service
        .participant(tournament.tournament_id, BOB.into())
        .await
        .unwrap();
    assert_eq!(participant.last_close_reason, Some(CloseReason::TakeProfit));
    assert_eq!(participant.last_close_price, Some(120));
}

#[tokio::test]
async fn keeper_tick_closes_short_position_on_stop_loss() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Short Stop Loss",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, CHARLIE, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);
    let _ =
        refresh_tournament_price(program_id, &env, tournament.tournament_id, INITIAL_PRICE).await;

    let charlie_env = actor_env(&env, CHARLIE);
    let mut charlie_service = service_for(program_id, &charlie_env);
    let _ = charlie_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Short,
            500,
            Some(110),
            Some(90),
        )
        .await
        .unwrap();

    let mut admin_service = service_for(program_id, &env);
    let summary = admin_service
        .keeper_tick(tournament.tournament_id, 110)
        .await
        .unwrap();
    assert_eq!(summary.positions_closed, 1);

    let participant = charlie_service
        .participant(tournament.tournament_id, CHARLIE.into())
        .await
        .unwrap();
    assert_eq!(participant.last_close_reason, Some(CloseReason::StopLoss));
    assert_eq!(participant.last_close_price, Some(110));
}

#[tokio::test]
async fn keeper_tick_closes_short_position_on_take_profit() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Short Take Profit",
        now + 8 * BLOCK_MS,
        now + 24 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, CHARLIE, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);
    let _ =
        refresh_tournament_price(program_id, &env, tournament.tournament_id, INITIAL_PRICE).await;

    let charlie_env = actor_env(&env, CHARLIE);
    let mut charlie_service = service_for(program_id, &charlie_env);
    let _ = charlie_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Short,
            500,
            Some(110),
            Some(90),
        )
        .await
        .unwrap();

    let mut admin_service = service_for(program_id, &env);
    let summary = admin_service
        .keeper_tick(tournament.tournament_id, 90)
        .await
        .unwrap();
    assert_eq!(summary.positions_closed, 1);

    let participant = charlie_service
        .participant(tournament.tournament_id, CHARLIE.into())
        .await
        .unwrap();
    assert_eq!(participant.last_close_reason, Some(CloseReason::TakeProfit));
    assert_eq!(participant.last_close_price, Some(90));
}

#[tokio::test]
async fn keeper_tick_updates_price_and_processes_lifecycle_once() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Keeper Lifecycle",
        now + 8 * BLOCK_MS,
        now + 18 * BLOCK_MS,
        3,
    )
    .await;

    let _joined = join_tournament(program_id, &env, BOB, tournament.tournament_id).await;
    advance_to_timestamp(&env, tournament.start_time);
    let _ =
        refresh_tournament_price(program_id, &env, tournament.tournament_id, INITIAL_PRICE).await;

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let _ = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            100,
            None,
            None,
        )
        .await
        .unwrap();

    advance_to_timestamp(&env, tournament.end_time);

    let mut admin_service = service_for(program_id, &env);
    let summary = admin_service
        .keeper_tick(tournament.tournament_id, 111)
        .await
        .unwrap();
    assert!(summary.price_updated);
    assert!(summary.tournament_ended);
    assert!(summary.tournament_settled);

    let settled = admin_service
        .tournament(tournament.tournament_id)
        .await
        .unwrap();
    assert!(matches!(settled.status, TournamentStatus::Settled));
    assert_eq!(admin_service.current_mock_price().await.unwrap(), 111);

    let second_summary = admin_service
        .keeper_tick(tournament.tournament_id, 112)
        .await
        .unwrap();
    assert!(second_summary.price_updated);
    assert!(!second_summary.tournament_ended);
    assert!(!second_summary.tournament_settled);
}

#[tokio::test]
async fn settlement_flow_ranks_top_three_and_distributes_603010() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let tournament = create_tournament(
        program_id,
        &env,
        "Final Table",
        now + 24 * BLOCK_MS,
        now + 60 * BLOCK_MS,
        8,
    )
    .await;

    for actor in [BOB, CHARLIE, DAVE, EVE] {
        let _ = join_tournament(program_id, &env, actor, tournament.tournament_id).await;
    }

    advance_to_timestamp(&env, tournament.start_time);
    let _ =
        refresh_tournament_price(program_id, &env, tournament.tournament_id, INITIAL_PRICE).await;

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);
    let charlie_env = actor_env(&env, CHARLIE);
    let mut charlie_service = service_for(program_id, &charlie_env);
    let dave_env = actor_env(&env, DAVE);
    let mut dave_service = service_for(program_id, &dave_env);

    let _ = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            1_000,
            None,
            None,
        )
        .await
        .unwrap();
    let _ = charlie_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Short,
            500,
            None,
            None,
        )
        .await
        .unwrap();
    let _ = dave_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Short,
            500,
            None,
            None,
        )
        .await
        .unwrap();

    let mut admin_service = service_for(program_id, &env);
    let _ = admin_service.update_mock_price(120).await.unwrap();
    let _ = bob_service
        .close_position(tournament.tournament_id)
        .await
        .unwrap();

    let _ = admin_service.update_mock_price(90).await.unwrap();
    let _ = charlie_service
        .close_position(tournament.tournament_id)
        .await
        .unwrap();

    let _ = admin_service.update_mock_price(110).await.unwrap();

    advance_to_timestamp(&env, tournament.end_time);

    let ended = admin_service
        .end_tournament(tournament.tournament_id)
        .await
        .unwrap();
    assert!(matches!(ended.status, TournamentStatus::Ended));

    let settlement: SettlementResult = admin_service
        .settle_tournament(tournament.tournament_id)
        .await
        .unwrap();
    assert_eq!(settlement.winners.len(), 3);

    let settled_tournament = admin_service
        .tournament(tournament.tournament_id)
        .await
        .unwrap();
    assert!(matches!(
        settled_tournament.status,
        TournamentStatus::Settled
    ));
    assert_eq!(settled_tournament.winners.len(), 3);

    let total_pool = 4 * ENTRY_FEE;
    let first_payout = total_pool * 60 / 100;
    let second_payout = total_pool * 30 / 100;
    let third_payout = total_pool * 10 / 100;

    assert_eq!(settlement.winners[0].rank, 1);
    assert_eq!(settlement.winners[0].participant, BOB.into());
    assert_eq!(settlement.winners[0].payout, first_payout);

    assert_eq!(settlement.winners[1].rank, 2);
    assert_eq!(settlement.winners[1].participant, CHARLIE.into());
    assert_eq!(settlement.winners[1].payout, second_payout);

    assert_eq!(settlement.winners[2].rank, 3);
    assert_eq!(settlement.winners[2].participant, EVE.into());
    assert_eq!(settlement.winners[2].payout, third_payout);

    let settle_twice_result: Result<SettlementResult, _> = admin_service
        .settle_tournament(tournament.tournament_id)
        .await;
    assert!(settle_twice_result.is_err());
}

#[tokio::test]
async fn guardrails_reject_unauthorized_or_invalid_actions() {
    let (program, env) = deploy_program().await;
    let program_id = program.id();
    let now = env.system().block_timestamp();
    let start_time = now + 20 * BLOCK_MS;
    let end_time = now + 40 * BLOCK_MS;

    let bob_env = actor_env(&env, BOB);
    let mut bob_service = service_for(program_id, &bob_env);

    let unauthorized_create: Result<TournamentView, _> = bob_service
        .create_tournament(
            "Not Allowed".into(),
            ENTRY_FEE,
            start_time,
            end_time,
            INITIAL_BALANCE,
            5,
        )
        .await;
    assert!(unauthorized_create.is_err());

    let tournament =
        create_tournament(program_id, &env, "Guardrails", start_time, end_time, 3).await;

    let unauthorized_price_update: Result<u128, _> = bob_service.update_mock_price(111).await;
    assert!(unauthorized_price_update.is_err());

    let _joined = join_tournament(program_id, &env, BOB, tournament.tournament_id).await;

    let trade_before_start: Result<ParticipantView, _> = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            100,
            None,
            None,
        )
        .await;
    assert!(trade_before_start.is_err());

    advance_to_timestamp(&env, tournament.start_time);
    let _ =
        refresh_tournament_price(program_id, &env, tournament.tournament_id, INITIAL_PRICE).await;

    let charlie_env = actor_env(&env, CHARLIE);
    let mut charlie_service = service_for(program_id, &charlie_env);
    let join_after_start: Result<ParticipantView, _> = charlie_service
        .join_tournament(tournament.tournament_id)
        .with_value(ENTRY_FEE)
        .await;
    assert!(join_after_start.is_err());

    let close_without_position: Result<ParticipantView, _> =
        bob_service.close_position(tournament.tournament_id).await;
    assert!(close_without_position.is_err());

    let opened = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Long,
            100,
            None,
            None,
        )
        .await
        .unwrap();
    assert!(opened.position.is_some());

    let second_open_result: Result<ParticipantView, _> = bob_service
        .open_position(
            tournament.tournament_id,
            PositionDirection::Short,
            100,
            None,
            None,
        )
        .await;
    assert!(second_open_result.is_err());
}
