# Flow & Positioning Research Terminal

A PM-facing research dashboard that uses sourced public and provider-backed market-data proxies to monitor sector rotation, theme sponsorship, positioning pressure, crowding, and reversal risk.

This project is designed as a proof-of-work artifact for Flow / Positioning / Market Intelligence roles across hedge funds, asset managers, and market-data teams.

## Product

The terminal answers:

- Where is capital rotating?
- Is the move confirmed by volume or positioning?
- Is the theme early or crowded?
- What is the risk/reward backdrop?
- What should a PM investigate today?
- Can a sourced single-stock note be generated and exported?

The first applied case study is Korea / Indo-Pacific defense.

## Real Data Rule

No mock market values. No fake options data. No fabricated short interest.

Rows are sourced live from providers or read from a frozen sourced snapshot with:

```bash
DEMO_AS_OF_DATE=YYYY-MM-DD
```

Demo mode blocks live fetches and reads real historical provider rows already stored in Postgres.

## Data Stack

- Polygon/Massive for OHLCV and options snapshots
- FINRA Query API for consolidated short interest and Reg SHO short-sale volume
- FRED, SEC EDGAR, OpenDART, BOK/data.go.kr, and public news/catalyst feeds where configured
- Prisma + Postgres for point-in-time storage

Every provider-backed row stores `asOfDate`, `observedAt`, `providerTimestamp`, `ingestedAt`, `source`, `provider`, `revisionFlag`, and `dataStatus`.

## Routes

- `/`
- `/stock-report`
- `/report/[ticker]`
- `/rotation`
- `/baskets`
- `/baskets/[slug]`
- `/positioning`
- `/crowding`
- `/daily-note`
- `/research/validation`
- `/case-studies/korea-defense`
- `/methodology`

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
