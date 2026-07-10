import type { NextApiRequest, NextApiResponse } from 'next'
import { getAssets } from '@/lib/data/getAssets'
import { getPrices } from '@/lib/data/getPrices'
import { getSourceAudit } from '@/lib/data/getSourceAudit'
import { buildMonitorPriceResponse, getMonitorTab, normalizeMonitorWindow, parseMonitorTickers } from '@/lib/monitor'
import { methodAllowed } from '@/lib/research/apiRoute'
import type { MonitorPriceResponse } from '@/types/monitor'

export default function handler(req: NextApiRequest, res: NextApiResponse<MonitorPriceResponse>) {
  if (!methodAllowed(req, res, ['GET'])) return
  const tab = getMonitorTab(Array.isArray(req.query.tab) ? req.query.tab[0] : req.query.tab)
  const tickers = parseMonitorTickers(req.query.tickers, tab.tickers)
  const window = normalizeMonitorWindow(req.query.window)

  res.status(200).json(buildMonitorPriceResponse({
    assets: getAssets(),
    prices: getPrices(tickers, 400),
    sourceAudit: getSourceAudit(),
    tickers,
    window
  }))
}
