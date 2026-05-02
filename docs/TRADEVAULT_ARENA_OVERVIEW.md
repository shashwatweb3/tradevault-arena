# TradeVault Arena Overview

TradeVault Arena is an on-chain BTC trading tournament platform where users trade with virtual balances and compete for real on-chain VARA prize pools.

## 1. Project Overview

### What TradeVault Arena Is

TradeVault Arena is a tournament-based trading application built on Vara Network. Users join a time-bound BTC/USD arena by paying a real entry fee in VARA. Inside the arena, they do not trade real BTC. Instead, they trade synthetic BTC positions using equal virtual balances. At the end of the tournament, the best-performing traders are rewarded from a real on-chain prize pool managed by a smart contract.

This means:

- trading is synthetic or paper trading
- prize distribution is real and on-chain
- tournament rules are enforced by contract logic
- rankings are based on transparent contract state rather than a private database

### Who It Is For

TradeVault Arena is intended for:

- users who want competitive but lower-risk trading practice
- communities that want transparent trading competitions
- ecosystem teams that want gamified onboarding
- builders exploring on-chain competition formats
- judges, partners, and ecosystem teams evaluating consumer-facing Vara use cases

### Why It Exists

Most paper trading competitions are easy to run, but difficult to trust. They usually depend on a centralized backend to track balances, rank users, and distribute rewards. TradeVault Arena exists to move the critical tournament logic into a smart contract while keeping the trading experience simple enough for an MVP.

### Simple Example User Journey

1. A user connects a Vara-compatible wallet.
2. The user joins a BTC tournament by paying the entry fee.
3. The user receives the same virtual starting balance as every other participant.
4. The user opens a synthetic Long or Short BTC position.
5. A keeper posts BTC price updates on-chain.
6. The contract recalculates PnL and updates the leaderboard.
7. When the tournament ends, the contract settles winners.
8. Winning users claim their VARA rewards on-chain.

## 2. Problem Statement

Existing trading competitions often have structural trust problems:

- Centralized databases control tournament state, balances, and rankings.
- Users cannot independently verify whether leaderboard updates were fair.
- Fake leaderboard manipulation is easier when all logic is off-chain.
- Prize handling is often manual and operator-dependent.
- Paper trading results rarely create a verifiable on-chain reputation.
- Many trading competitions have no meaningful economic outcome beyond screenshots and bragging rights.

In short, paper trading is accessible, but usually not transparent. On-chain rewards are attractive, but most tournament products still rely on centralized scoring infrastructure.

## 3. Proposed Solution

TradeVault Arena combines simple synthetic trading with on-chain tournament accounting.

Core design:

- tournaments are time-bound
- users pay real entry fees
- entry fees form one shared prize pool
- every participant starts with the same virtual balance
- users trade synthetic BTC/USD positions
- the leaderboard is derived from contract state
- settlement is performed by the contract
- winners claim rewards directly from on-chain state

The design goal is not to simulate a full exchange. The design goal is to create a transparent competitive arena where the rules, ranking logic, and rewards are contract-managed.

## 4. Who It Is For

TradeVault Arena is designed for several groups:

- Beginner traders who want risk-reduced practice without trading real BTC.
- Crypto communities that want structured, transparent trading competitions.
- Web3 ecosystems that want onboarding experiences tied to wallets, on-chain rewards, and public competition state.
- Traders who want a verifiable performance history rather than a private leaderboard screenshot.
- Projects or DAOs looking for tournament-based engagement loops.

## 5. How It Works

### Step-by-Step

1. Create tournament
   - An admin creates a BTC/USD arena with a start time, end time, entry fee, participant cap, and equal starting balance.
2. Join tournament
   - Users pay the exact entry fee to enter before the arena starts.
3. Start with virtual balance
   - Every participant begins with the same synthetic capital.
4. Open Long or Short BTC position
   - Users open a synthetic BTC trade based on the tournament price.
5. Optional Stop Loss / Take Profit
   - Users can provide SL/TP levels when opening a position.
6. Keeper updates tournament price
   - A server-side keeper fetches BTC price data and posts it on-chain.
7. Contract updates PnL and leaderboard
   - The contract recalculates unrealized or realized results and reorders ranking by return percentage.
8. Tournament ends
   - When the end time is reached, the contract can freeze the final tournament state.
9. Winners are settled
   - The contract computes the winners and assigns claimable rewards.
10. Rewards are claimed
   - Winners claim VARA from contract-managed reward state.

## 6. User Flow

The user flow is intentionally simple:

- Connect wallet
  - Users connect a Vara-compatible wallet in the frontend.
- Browse tournaments
  - Users review upcoming, live, ended, or settled arenas.
- Join
  - Users pay the entry fee to reserve a slot.
- Trade
  - Users open a synthetic Long or Short BTC position.
- Track PnL
  - Users see their current position, unrealized PnL, and final value.
- Track leaderboard
  - Users compare performance with other participants.
- Claim rewards
  - After settlement, winners claim real VARA rewards.

## 7. Admin Flow

Current admin responsibilities are:

- create tournament
- monitor tournament status
- manage fallback lifecycle actions
- manually sync and process the tournament if automation fails
- settle as a fallback when needed
- manage keeper wallets in the newer keeper-role architecture

In the current direction of the project, the admin should not be the normal path for frequent price syncing. The preferred path is a dedicated keeper service.

## 8. Trading Model

### Core Model

TradeVault Arena uses synthetic BTC/USD trading:

- there is no real DEX execution
- there is no real BTC custody
- positions are simulated using price updates pushed on-chain
- the current MVP supports one open position per participant at a time
- no leverage is part of the MVP

### PnL Formulas

For Long:

```text
PnL = ((current_price - entry_price) / entry_price) * position_size
```

For Short:

```text
PnL = ((entry_price - current_price) / entry_price) * position_size
```

Final Value:

```text
final_value = initial_virtual_balance + realized_pnl + unrealized_pnl
```

Return %:

```text
return_percentage = ((final_value - initial_virtual_balance) / initial_virtual_balance) * 100
```

### Stop Loss / Take Profit

SL/TP is stored on-chain with the position. When the keeper posts a new tournament price, the contract checks whether a stop loss or take profit level has been hit and can auto-close the position accordingly.

## 9. Prize Pool and Settlement

TradeVault Arena uses a real on-chain prize pool:

- every participant pays the entry fee
- the contract accumulates the entry fees into the tournament prize pool
- top performers receive rewards after settlement
- the current default split is 60% / 30% / 10% for first, second, and third place

Settlement process:

- the tournament reaches end time
- the contract finalizes ranking
- winner rewards are assigned in contract state
- winners later call `ClaimReward`

This separates settlement from payout claiming and keeps reward distribution observable on-chain.

### Prize Pool Summary

| Item | Description |
| --- | --- |
| Entry fee | Paid in real VARA by each participant |
| Prize pool | Sum of collected tournament entry fees |
| Ranking basis | Return percentage |
| Current payout split | 60% / 30% / 10% |
| Reward claim model | Winners claim after settlement |

## 10. On-Chain Components

The smart contract is responsible for:

- tournament creation
- join validation
- position opening and closing
- stop loss and take profit storage
- PnL calculation
- leaderboard calculation
- tournament end and settlement
- claimable reward tracking
- reward claiming
- event emission

### Important Contract Methods

- `CreateTournament`
- `JoinTournament`
- `OpenPosition`
- `ClosePosition`
- `KeeperTick`
- `UpdatePriceAndProcess`
- `ProcessTournament`
- `EndTournament`
- `SettleTournament`
- `ClaimReward`
- `Leaderboard`
- `Participant`
- `Tournaments`

### Contract Responsibility Boundary

The contract owns:

- tournament rules
- account state
- ranking logic
- settlement logic
- payout eligibility

The contract does not fetch external prices by itself.

## 11. Off-Chain Components

TradeVault Arena also depends on off-chain services and interfaces:

- frontend UI
- wallet connection
- Binance live BTC price preview in the UI
- keeper server
- contract client and IDL integration

Important separation:

- the frontend can read state and request user signatures
- the keeper pushes tournament prices on-chain
- the frontend does not auto-sign keeper actions

## 12. Keeper / Oracle Architecture

### Why a Keeper Is Needed

Smart contracts cannot directly fetch external BTC/USD prices from Binance or other APIs. Because of that, a separate actor must bring the price on-chain.

### Current MVP Plan

Current architecture:

- a server-side keeper fetches BTC/USDT from Binance
- the keeper calls `KeeperTick(tournament_id, price)`
- the contract updates the tournament price
- the contract processes stop loss / take profit
- the contract can also end and settle tournaments as part of keeper processing

### Future Upgrade Path

Future improvements may include:

- multi-keeper median price
- decentralized oracle integration such as Pyth or Chainlink if suitable Vara integrations exist
- stronger stale-price protection
- more explicit keeper role management and monitoring

### Important Honesty

TradeVault Arena has on-chain trading logic, ranking, and settlement, but the MVP price sourcing model is keeper-based. It should not be described as fully decentralized until price sourcing is more trust-minimized.

## 13. Why Not Frontend Auto Sync

Frontend-driven price syncing is not the correct production direction.

Reasons:

- it creates repeated wallet signature prompts
- it stops working when the browser closes
- it depends on a user session staying online
- it is unreliable for tournament automation
- users should not be responsible for price posting
- keeper/server architecture is operationally safer and cleaner

The correct model is:

- users sign user actions
- admin signs admin actions
- keeper signs oracle and processing actions

## 14. Wallet Integration

TradeVault Arena uses Vara-compatible wallet integrations through `@polkadot/extension-dapp`.

Supported desktop extension categories include:

- SubWallet
- Polkadot.js
- Talisman
- Enkrypt

Mobile note:

- mobile support depends on wallet browser support
- users should generally open the app inside a wallet browser such as the SubWallet mobile browser

### Who Signs What

Users sign only user-facing actions:

- `JoinTournament`
- `OpenPosition`
- `ClosePosition`
- `ClaimReward`

Admin or keeper signs operational actions:

- tournament creation
- keeper management
- manual fallback sync
- manual settlement or lifecycle fallback

## 15. Frontend Architecture

The frontend stack uses:

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- `lightweight-charts`

### Relevant Page Structure

- `src/pages/HomePage.tsx`
- `src/pages/TournamentsPage.tsx`
- `src/pages/TradePage.tsx`
- `src/pages/LeaderboardPage.tsx`
- `src/pages/VaultPage.tsx`
- `src/pages/AdminPage.tsx`

### Relevant Component Groups

- `src/components/layout`
- `src/components/trade`
- `src/components/tournament`
- `src/components/leaderboard`
- `src/components/vault`
- `src/components/wallet`

### Frontend Role

The frontend is responsible for:

- wallet connection
- query display
- tournament discovery
- trade input collection
- transaction submission for user or admin actions
- live BTC preview from Binance
- freshness and status display

The frontend is not the oracle.

## 16. Smart Contract / Vara Stack

TradeVault Arena is built with:

- Vara Network
- Gear Protocol
- Sails.rs
- Rust smart contract code
- IDL-based frontend integration
- testnet deployment workflow

### Current Program ID

Current Program ID:

`0x4633e693b251d976e33631c09b9277219e032d62150684ae501d8c7f2c9a5fc7`

Important note:

- the program ID may change after redeploys
- interface changes such as keeper roles or stale-price storage can require a redeploy

## 17. Current MVP Features

- [x] wallet connect
- [x] create tournament
- [x] join tournament
- [x] live BTC price display
- [x] synthetic Long/Short trading
- [x] Stop Loss / Take Profit fields
- [x] leaderboard
- [x] vault summary
- [x] admin panel
- [x] settlement and claim flow
- [x] dark black + glow green UI direction
- [x] transaction feedback

## 18. Known MVP Limitations

TradeVault Arena is still an MVP and should be described honestly.

Current limitations:

- price feed is keeper-based
- if the keeper is offline, tournament price can become stale
- there is no fully decentralized oracle yet
- keeper and admin permissions may still need future hardening
- there is no order book
- there is no real asset trading
- trading is synthetic only
- mobile wallet support depends on wallet browser behavior

Additional practical limitations:

- one synthetic market is the main MVP focus
- one open position per participant keeps the state model simpler
- no leverage or liquidation engine exists in the current MVP

## 19. Planned Improvements / Roadmap

### Phase 1: Stable MVP

- server-side keeper
- stale price protection
- price sync freshness UI
- reliable deployment
- clean wallet flow

### Phase 2: Trust-Minimized Price Resolution

- multi-keeper support
- median price validation
- keeper role management
- price jump protection

### Phase 3: Oracle Integration

- Pyth or Chainlink style oracle integration if supported on Vara
- verifiable price updates
- lower trust assumptions

### Phase 4: Trading Upgrades

- multiple tournaments running in parallel
- richer trade history
- leaderboard share cards
- stronger risk controls
- optional leverage or liquidation simulation
- advanced charting

### Phase 5: Reputation Layer

- trader profile
- performance history
- badges
- social trading or capital allocation style extensions

## 20. Security Considerations

TradeVault Arena’s security model must be explicit:

- admin and keeper keys must never be exposed in the frontend
- `.env` secrets must not be committed
- frontend auto-write loops should be avoided
- all write actions require wallet approval
- keeper permissions should be restricted to the minimum needed scope
- price manipulation risk exists in a keeper-based architecture and must be mitigated over time
- settlement and SL/TP logic require tests

### Risk Areas

| Area | Risk | Current / Planned Mitigation |
| --- | --- | --- |
| Keeper key handling | Key exposure | Server-side only, never bundled in frontend |
| Price sourcing | Incorrect or manipulated update | Sanity checks, stale checks, future multi-keeper median |
| User signing experience | Wallet spam | No frontend auto-sync loop |
| Settlement logic | Incorrect rewards | Contract tests and explicit settlement flow |
| Operational reliability | Keeper downtime | Manual admin fallback and stale-price UI |

## 21. Deployment Notes

### Frontend

- frontend is intended for deployment on Vercel
- Vercel root directory should be `frontend`
- build command should be `npm run build`
- output directory should be `dist`

### Keeper

- keeper should be deployed separately
- suitable targets include Railway, Render, or a VPS
- the keeper should run independently from the browser

### Contract

- contract is deployed on Vara testnet for the MVP flow
- redeploys may be needed when the contract interface changes

## 22. Demo Flow

Suggested demo script:

1. Open the app.
2. Connect a Vara-compatible wallet.
3. Browse available tournaments.
4. Join a tournament by paying the entry fee.
5. Admin or keeper syncs tournament price on-chain.
6. Open a synthetic Long or Short BTC position.
7. Watch PnL and leaderboard change as keeper prices update.
8. Trigger SL/TP or wait for tournament end.
9. Settle the tournament.
10. Claim the winner reward.

## 23. FAQ

### Is trading real?

No. Trading is synthetic or paper trading. Users do not buy or sell real BTC.

### Are rewards real?

Yes. Entry fees and rewards are real on-chain VARA amounts.

### Is it fully on-chain?

Not fully. Tournament accounting, ranking, settlement, and rewards are on-chain. External price sourcing is still keeper-based in the MVP.

### What is the oracle or resolution method?

In the current MVP direction, a server-side keeper fetches BTC/USDT from Binance and posts price updates on-chain using keeper methods.

### What happens if the keeper goes offline?

Tournament price can become stale. The frontend should reflect that state, and admin fallback actions can be used until a more resilient multi-keeper or oracle architecture is added.

### Can users lose more than entry fee?

Users pay a real entry fee to join the arena. Trading losses are synthetic inside the tournament. The main real economic cost to the user is the entry fee, not additional trading collateral.

### Why use Vara?

Vara and Gear provide a good environment for smart-contract-managed application logic, typed interfaces, and on-chain state transitions for tournament workflows.

### Can this support other assets?

Yes, in principle. The current MVP is intentionally narrow and focused on BTC/USD to keep product scope and contract complexity manageable.

## 24. Short Pitch

TradeVault Arena turns trading competitions into transparent on-chain arenas: users trade synthetic BTC with equal virtual balances, compete by Return %, and win real VARA rewards from a smart-contract-managed prize pool.

## Architecture Diagram

```text
                  +----------------------+
                  |   Binance BTC/USDT   |
                  |  external price data |
                  +----------+-----------+
                             |
                             v
                  +----------------------+
                  |    Keeper Server     |
                  | fetch + validate +   |
                  | call KeeperTick()    |
                  +----------+-----------+
                             |
                             v
+-------------------+   +---------------------------+   +----------------------+
| User Wallets      |<->| TradeVault Arena Program  |<->| Vara Testnet State   |
| Join / Trade /    |   | tournaments, positions,   |   | prize pool, rewards, |
| Claim Reward      |   | PnL, ranking, settlement  |   | events, balances     |
+---------+---------+   +---------------------------+   +----------------------+
          ^
          |
          v
+---------------------------+
| Frontend (React + Vite)   |
| read state, show charts,  |
| submit user/admin txs     |
+---------------------------+
```

## Product Summary Table

| Category | Current MVP Position |
| --- | --- |
| Market | BTC/USD |
| Trading style | Synthetic / paper trading |
| Rewards | Real VARA prize pool |
| Ranking metric | Return % |
| Price source | Keeper-posted external price |
| Settlement | On-chain |
| Wallet model | Vara-compatible extension wallets |
| Trust model | On-chain logic with keeper-based price input |

