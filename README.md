# Asia Macro Research OS

## Purpose
Public-source Asia macro research operating system for market tape, Korea/semis/defense coverage, source provenance, event studies, and portfolio-style research outputs.

## Why I built this
Built to combine macro monitoring, business analysis, coding work, and investment research interest. The dashboard is designed to show how sourced public information can become structured research workflows without using classified, restricted, confidential, or material nonpublic information.

## Features
- Market Regime Board driven by sourced price/rates/FX/coverage inputs instead of event-text scoring
- Public-source event feed from automated ingestion
- Defense, semiconductor, FX/rates, commodity, and volatility watchlist
- Event-to-market impact analysis when price history is available
- Company exposure map backed by public filings metadata
- Weekly memo workflow with visible sources
- Company dossier pages
- Korea defense market memo page
- A&D stock pitch page

## Data
Generated application data lives in `src/generated`. Ingestion scripts write raw provider payloads and normalized app-ready JSON. Strict source mode requires successful provider ingestion; missing provider values are ingestion/build errors, not publishable fallback states.

Supported providers:
- Google News RSS for public event/article metadata
- Alpha Vantage for market data when `ALPHA_VANTAGE_API_KEY` is set
- FRED for macro series when `FRED_API_KEY` is set
- SEC EDGAR for U.S. company filing metadata
- OpenDART for Korean disclosure integration when `OPENDART_API_KEY` is set

## Source Data Handling
Every major page displays source or derived-data status. Records include provider, source URL, source name, retrieval timestamp, published timestamp when available, derived flag, methodology note, and data-quality status.

## Portfolio Outputs
- Public Vercel deployment
- GitHub repo with polished README
- Dashboard screenshots in `/public/screenshots`
- Resume bullets in `docs/resume_bullets.md`
- Korea defense market memo page
- A&D stock pitch page
- Methodology page with public-source / no-MNPI disclaimer

## Disclaimer
Educational research project.
Not investment advice.
No classified, restricted, confidential, or material nonpublic information used.

## Tech Stack
- TypeScript / Next.js Pages Router for the product UI
- React, Tailwind CSS, and Recharts for dashboards
- Node / tsx scripts for provider ingestion and generated JSON artifacts
- Python / pandas analytics scaffold for offline dataset inspection
- Rust validation/performance layer planned for future data checks

## Environment
```bash
ALPHA_VANTAGE_API_KEY=
FRED_API_KEY=
OPENDART_API_KEY=
SEC_USER_AGENT="KoreaDefenseMarketsDashboard your-email@example.com"
MARKET_DATA_PROVIDER=alpha_vantage
ALLOW_STALE_CACHE=false
```

## Setup
```bash
npm install
cp .env.example .env.local
# Fill .env.local with real provider credentials.
npm run setup:check
npm run ingest
npm run audit:data
npm run dev
npm run build
```

`npm run build` runs the source audit before `next build`. It fails if core datasets are empty or provider ingestion did not succeed.

Ingestion scripts automatically load `.env.local`, `.env`, or `.env.development`. Provider secrets should stay local and must not be committed.

## Screenshots
Dashboard screenshots should be saved in `/public/screenshots`.
