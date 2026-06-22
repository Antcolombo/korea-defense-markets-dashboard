# Korea Data Unlock

This project keeps Korea local market and macro inputs optional but explicit. Missing Korea inputs should appear as backlog, not fabricated data.

## Environment Variables

- `DATA_GO_KR_SERVICE_KEY`: data.go.kr service key for FSC stock price information. Unlocks Korean local equity closes for Samsung, SK Hynix, Hanwha Aerospace, LIG Nex1, KAI, Hyundai Rotem, and Hanwha Ocean.
- `BOK_ECOS_API_KEY`: Bank of Korea ECOS API key.
- `BOK_BASE_RATE_STAT_CODE` / `BOK_BASE_RATE_ITEM_CODE`: ECOS statistic and item codes for Bank of Korea base rate.
- `BOK_BASE_RATE_FREQUENCY`: optional ECOS frequency override, default `M`.
- `BOK_CURRENT_ACCOUNT_STAT_CODE` / `BOK_CURRENT_ACCOUNT_ITEM_CODE`: ECOS statistic and item codes for Korea current account.
- `BOK_CURRENT_ACCOUNT_FREQUENCY`: optional ECOS frequency override, default `M`.
- `BOK_TRADE_BALANCE_STAT_CODE` / `BOK_TRADE_BALANCE_ITEM_CODE`: ECOS statistic and item codes for Korea trade balance.
- `BOK_TRADE_BALANCE_FREQUENCY`: optional ECOS frequency override, default `M`.

## Private Official Exports

Private exports are gitignored under `data/private`.

Create KOSPI/KOSDAQ index rows:

```bash
npm run import:korea:index -- data/manual/korea-index-prices.example.csv data/private/korea-index-prices.json
```

Create Korea flow and BOK macro rows:

```bash
npm run import:korea:macro -- data/manual/korea-macro-flows.example.csv data/private/korea-macro-flows.json
```

Validate both private files:

```bash
npm run validate:korea:private
```

## Expected Schemas

`data/private/korea-index-prices.json`:

```json
[{ "ticker": "KOSPI", "date": "2026-05-21", "close": 2712.44, "volume": null }]
```

`data/private/korea-macro-flows.json`:

```json
[{
  "ticker": "KR_FOREIGN_EQUITY_FLOW",
  "name": "Foreign investor net equity purchases",
  "provider": "KRX investor trading trend export",
  "sourceUrl": "https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd?locale=en",
  "status": "source",
  "unit": "KRW bn",
  "observations": [{ "date": "2026-05-21", "value": 85.2, "unit": "KRW bn" }]
}]
```
