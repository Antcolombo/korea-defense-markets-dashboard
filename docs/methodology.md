# Methodology

This project uses provider-backed point-in-time rows in Postgres. It does not invent market prices, options activity, short interest, catalyst facts, or memo conclusions when provider data is unavailable.

## Source Vs Derived Fields

Source fields come from providers such as Polygon/Massive, FINRA, FRED, SEC EDGAR, OpenDART, BOK/data.go.kr/KRX exports, and public catalyst feeds.

Derived fields are deterministic calculations:

- 1D/5D/20D/60D returns
- relative strength versus SPY
- volume confirmation
- realized volatility
- moving-average distance
- trend label
- positioning proxy aggregation
- crowding score
- validation hit rates and forward returns
- PM daily-note sections assembled from sourced snapshots

## Point-In-Time Metadata

Every provider-backed row stores:

- `asOfDate`
- `observedAt`
- `providerTimestamp`
- `ingestedAt`
- `source`
- `provider`
- `revisionFlag`
- `dataStatus`

## Data Availability

Signals expose:

- `Available`
- `Unavailable`
- `Stale`
- `Partial`
- `Entitlement Missing`
- `Provider Error`

Missing values are not estimated. Crowding scores use only sourced available components and show excluded inputs.

## Validation

`/research/validation` tests whether:

- high crowding predicts 5D/20D reversal
- relative strength plus volume confirmation predicts continuation
- options-volume spikes lead later realized volatility

The validation output displays hit rate, average forward return, sample size, coverage, and caveats.

## Publication Gate

`npm run audit:data` checks Postgres availability, required sourced rows, provider runs, stale data, and entitlement/provider errors. `npm run build` runs that audit before `next build`.
