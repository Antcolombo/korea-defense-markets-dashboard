# Data Sources

The Flow & Positioning Research Terminal uses sourced rows in Postgres with point-in-time metadata.

## Primary Providers

- Polygon/Massive: OHLCV bars and options snapshots.
- FINRA Query API: consolidated short interest and Reg SHO daily short-sale volume.
- FRED: macro and rates series where configured.
- SEC EDGAR: U.S. filing metadata.
- OpenDART: Korean disclosure metadata.
- BOK/data.go.kr/KRX exports: optional Korea macro, local equity, and investor-flow inputs.
- Public news/catalyst feeds: catalyst context with URLs and provider metadata.

## Required Row Metadata

Every provider-backed row stores:

- `asOfDate`
- `observedAt`
- `providerTimestamp`
- `ingestedAt`
- `source`
- `provider`
- `revisionFlag`
- `dataStatus`

## Availability

Every signal exposes one availability state:

- `Available`
- `Unavailable`
- `Stale`
- `Partial`
- `Entitlement Missing`
- `Provider Error`

Missing options/short-interest entitlements are shown as unavailable or entitlement-missing, not imputed.

## Demo Mode

`DEMO_AS_OF_DATE=YYYY-MM-DD` freezes the app to real sourced rows already stored in Postgres. Live fetches are blocked while demo mode is active.

## Local Setup

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run ingest
npm run validate:research
npm run audit:data
```

Required:

- `DATABASE_URL`
- `POLYGON_API_KEY`
- `FINRA_CLIENT_ID`
- `FINRA_CLIENT_SECRET`

Optional:

- `FRED_API_KEY`
- `SEC_USER_AGENT`
- `OPENDART_API_KEY`
- `DATA_GO_KR_SERVICE_KEY`
- `BOK_ECOS_API_KEY`
