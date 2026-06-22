import type { NextApiHandler, NextApiResponse } from 'next'
import { createApiResponse, type ApiResponse } from './api'

export function sendResearchResponse<T>(res: NextApiResponse, data: T, status = 200) {
  return res.status(status).json(createApiResponse(data))
}

export function createResearchApiHandler<T>(load: () => Promise<T> | T): NextApiHandler<ApiResponse<T>> {
  return async function handler(_req, res) {
    sendResearchResponse(res, await load())
  }
}
