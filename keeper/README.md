# TradeVault Keeper

Server-side keeper for TradeVault Arena on Vara testnet.

## What it does

- Connects to Vara using the repo IDL and `PROGRAM_ID`
- Loads the keeper seed from `KEEPER_SEED`
- Polls Binance `BTCUSDT`
- Every `TICK_INTERVAL_MS`, queries tournaments and filters to live or ended arenas
- Calls `KeeperTick(tournamentId, priceScaled)` with cents scaling
- Retries failed price fetches and tx submissions with exponential backoff
- Prevents duplicate in-flight keeper tx per tournament

## Environment

Copy `.env.example` to `.env` and fill in the keeper seed.

Required:

- `KEEPER_SEED`

Optional:

- `VARA_WS`
- `PROGRAM_ID`
- `BINANCE_SYMBOL`
- `TICK_INTERVAL_MS`

## Commands

```bash
npm install
npm run build
npm run start
```

For development:

```bash
npm run dev
```

## Logging

Each keeper tick logs:

- tournament id
- BTC price
- scaled price
- positions closed
- whether the tournament ended
- whether the tournament settled
- tx result
