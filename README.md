# Korea Defense Markets Dashboard

A PM-facing Korea / Indo-Pacific defense market-intelligence terminal. It connects public catalysts to Korea beta, liquid U.S. defense suppliers, relative strength, volume confirmation, crowding, and explicit invalidation.

This project is designed as a proof-of-work artifact for Flow / Positioning / Market Intelligence roles across hedge funds, asset managers, and market-data teams.

## Product

The terminal answers:

- Where is capital rotating?
- Is the move confirmed by volume or positioning?
- Is the theme early or crowded?
- What is the risk/reward backdrop?
- What should a PM investigate today?
- Can a sourced single-stock note be generated and exported?

Korea / Indo-Pacific defense is the default product view. Broader rotation, stock-report, decision-journal, validation, and risk modules support the case study.

## Interview Demo

Use committed sourced snapshots when reliability matters more than a live database connection:

```bash
npm run demo
```

Production-equivalent check:

```bash
npm run demo:build
npm run demo:start
```

Open `/korea-defense`. Generated mode disables database access, derives market signals only from committed provider rows, and leaves unavailable options or short-interest fields explicitly unavailable.

## Real Data Rule

No mock market values. No fake options data. No fabricated short interest.

Rows are sourced live from providers or read from a frozen sourced snapshot with:

```bash
DEMO_AS_OF_DATE=YYYY-MM-DD
```

Demo mode blocks live fetches and reads real historical provider rows already stored in Postgres.

Explicit modes are also available:

```bash
RESEARCH_DATA_MODE=live       # latest Postgres snapshots
RESEARCH_DATA_MODE=snapshot   # Postgres snapshots through DEMO_AS_OF_DATE
RESEARCH_DATA_MODE=generated  # generated adapters only; database reads disabled
```

## Data Stack

- Polygon/Massive for OHLCV and options snapshots
- FINRA Query API for consolidated short interest and Reg SHO short-sale volume
- FRED, SEC EDGAR, OpenDART, BOK/data.go.kr, and public news/catalyst feeds where configured
- Prisma + Postgres for point-in-time storage

Every provider-backed row stores `asOfDate`, `observedAt`, `providerTimestamp`, `ingestedAt`, `source`, `provider`, `revisionFlag`, and `dataStatus`.

## Routes

- `/`
- `/korea-defense`
- `/report/[ticker]`
- `/?module=overview`
- `/?module=rotation`
- `/?module=baskets`
- `/?module=crowding`
- `/?module=validation`
- `/?module=methodology`
- `/?module=decision-log`
- `/?module=source-audit`

## Setup

```bash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run ingest
npm run validate:research
npm run audit:data
npm run dev
```

Frontend builds do not run ingestion or mutate data:

```bash
npm run build
npm run pipeline:data
npm run verify:deploy
```

Required:

```bash
DATABASE_URL=
POLYGON_API_KEY=
FINRA_CLIENT_ID=
FINRA_CLIENT_SECRET=
```

## Validation

`/research/validation` tests:

- crowding score vs 5D/20D reversal
- RS + volume confirmation vs continuation
- options volume spikes vs later realized volatility

Each test reports hit rate, average forward return, sample size, coverage, and caveats.

## Disclaimer

Research workbench only. Not investment advice. No classified, restricted, confidential, or material nonpublic information is used.
