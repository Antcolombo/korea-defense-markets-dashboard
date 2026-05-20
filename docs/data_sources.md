# Data Sources

The v2 data model uses automated ingestion with provenance.

## Providers
- Google News RSS: public event/article metadata.
- Alpha Vantage: market prices, FX, commodities, and selected series when an API key is configured.
- FRED: macroeconomic and rates series when an API key is configured.
- SEC EDGAR: U.S. company filing metadata and company facts.
- OpenDART: Korean company disclosure integration when an API key and corp-code mapping are configured.

## Rules
- No fabricated article titles, dates, source names, or URLs.
- No fabricated market prices or returns.
- No fabricated company filing details.
- Derived classifications must be labeled as derived.
- No fallback, demo, stale, or curated seed data is used in strict source mode.
- Missing provider data is an ingestion or build error, not a publishable dashboard state.

## Local Setup

Create `.env.local` from `.env.example`, fill the real provider keys, then run:

```bash
npm run setup:check
npm run ingest
npm run audit:data
```

The ingestion scripts load `.env.local` automatically.

## Scheduled Refresh

GitHub Actions runs `.github/workflows/refresh-data.yml` on weekdays at:

- 12:30 UTC / 8:30 AM New York
- 21:30 UTC / 5:30 PM New York
- 02:30 UTC / 10:30 PM New York on the prior calendar day

The workflow creates a scheduled empty commit on `main`. Vercel then redeploys production, and the production build runs `npm run build:data` with the provider env vars configured in Vercel. If ingestion or the source audit fails, Vercel keeps the previous ready deployment live.

Required Vercel production environment variables:

- `ALPHA_VANTAGE_API_KEY`
- `FRED_API_KEY`
- `OPENDART_API_KEY`
- `SEC_USER_AGENT`

Optional Vercel production environment variable:

- `EIA_API_KEY`
- `MARKET_DATA_PROVIDER`, defaulting to `nasdaq`
- `ALLOW_STALE_CACHE`, normally `false`
