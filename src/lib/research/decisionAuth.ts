import type { NextApiRequest } from 'next'

export function hasDecisionWriteAccess(req: NextApiRequest) {
  if (process.env.NODE_ENV !== 'production') return true
  const required = decisionEditorToken()
  if (!required) return false
  const supplied = req.headers['x-decision-editor-token'] ?? req.headers['x-pitch-editor-token']
  return supplied === required
}

export function decisionEditorTokenName() {
  return process.env.DECISION_EDITOR_TOKEN?.trim() ? 'DECISION_EDITOR_TOKEN' : 'PITCH_EDITOR_TOKEN'
}

function decisionEditorToken() {
  return process.env.DECISION_EDITOR_TOKEN?.trim() || process.env.PITCH_EDITOR_TOKEN?.trim()
}
