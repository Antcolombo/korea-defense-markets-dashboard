import { timingSafeEqual } from 'node:crypto'
import type { NextApiRequest } from 'next'

type EditorScope = 'decision' | 'pitch'

export function hasEditorWriteAccess(req: NextApiRequest, scope: EditorScope) {
  if (process.env.NODE_ENV !== 'production') return true
  const required = editorToken(scope)
  if (!required) return false
  const supplied = scope === 'decision'
    ? headerValue(req, 'x-decision-editor-token') ?? headerValue(req, 'x-pitch-editor-token')
    : headerValue(req, 'x-pitch-editor-token')
  return tokensMatch(supplied, required)
}

export function editorTokenName(scope: EditorScope) {
  if (scope === 'decision' && process.env.DECISION_EDITOR_TOKEN?.trim()) return 'DECISION_EDITOR_TOKEN'
  return 'PITCH_EDITOR_TOKEN'
}

function editorToken(scope: EditorScope) {
  if (scope === 'decision') {
    return process.env.DECISION_EDITOR_TOKEN?.trim() || process.env.PITCH_EDITOR_TOKEN?.trim()
  }
  return process.env.PITCH_EDITOR_TOKEN?.trim()
}

function headerValue(req: NextApiRequest, name: string) {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function tokensMatch(supplied: string | undefined, required: string) {
  if (!supplied) return false
  const suppliedBytes = Buffer.from(supplied)
  const requiredBytes = Buffer.from(required)
  return suppliedBytes.length === requiredBytes.length && timingSafeEqual(suppliedBytes, requiredBytes)
}
