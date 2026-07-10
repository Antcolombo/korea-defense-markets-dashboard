import assert from 'node:assert/strict'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createResearchApiHandler, domainValidationApiError, parseJsonObject } from '../src/lib/research/apiRoute'
import { hasEditorWriteAccess } from '../src/lib/research/editorAuth'
import { createPitchBodySchema, updatePitchBodySchema } from '../src/features/pitches/application/schemas'
import { createDecisionBodySchema } from '../src/features/decisions/application/schemas'

type MockResponse = {
  statusCode: number
  headers: Record<string, string>
  body: unknown
}

function mockResponse() {
  const state: MockResponse = { statusCode: 200, headers: {}, body: null }
  const response = {
    setHeader(name: string, value: string) {
      state.headers[name] = value
      return response
    },
    status(statusCode: number) {
      state.statusCode = statusCode
      return response
    },
    json(body: unknown) {
      state.body = body
      return response
    }
  } as unknown as NextApiResponse
  return { response, state }
}

async function main() {
  assert.deepEqual(parseJsonObject<{ ticker: string }>('{"ticker":"NVDA"}'), { ticker: 'NVDA' })
  assert.deepEqual(parseJsonObject<Record<string, never>>(undefined), {})
  assert.throws(() => parseJsonObject('[]'), /JSON object/)
  assert.throws(() => parseJsonObject('null'), /JSON object/)
  assert.equal(domainValidationApiError(new Error('Decision cannot be accepted yet.'), ['Decision cannot']), 'Decision cannot be accepted yet.')
  assert.equal(domainValidationApiError(new Error('password=secret database failure'), ['Decision cannot']), null)

  let loads = 0
  const handler = createResearchApiHandler(() => {
    loads += 1
    return { ok: true }
  })
  const { response, state } = mockResponse()
  await handler({ method: 'POST' } as NextApiRequest, response)
  assert.equal(state.statusCode, 405)
  assert.equal(state.headers.Allow, 'GET')
  assert.equal(loads, 0)
  assert.deepEqual(state.body, { error: 'Method not allowed.', category: 'method_not_allowed' })

  assert.equal(createPitchBodySchema.parse({ ticker: 'nvda' }).ticker, 'NVDA')
  assert.throws(() => createPitchBodySchema.parse({ ticker: '' }))
  assert.throws(() => updatePitchBodySchema.parse({}))
  assert.equal(createDecisionBodySchema.parse({ ticker: 'pltr' }).ticker, 'PLTR')
  assert.throws(() => createDecisionBodySchema.parse({ decision: { status: 'draft' } }))

  const previousNodeEnv = process.env.NODE_ENV
  const previousPitchToken = process.env.PITCH_EDITOR_TOKEN
  const previousDecisionToken = process.env.DECISION_EDITOR_TOKEN
  const mutableEnv = process.env as Record<string, string | undefined>
  try {
    mutableEnv.NODE_ENV = 'production'
    process.env.PITCH_EDITOR_TOKEN = 'test-editor-token'
    assert.equal(hasEditorWriteAccess({ headers: {} } as NextApiRequest, 'pitch'), false)
    assert.equal(hasEditorWriteAccess({ headers: { 'x-pitch-editor-token': 'wrong-token' } } as unknown as NextApiRequest, 'pitch'), false)
    assert.equal(hasEditorWriteAccess({ headers: { 'x-pitch-editor-token': 'test-editor-token' } } as unknown as NextApiRequest, 'pitch'), true)
    assert.equal(hasEditorWriteAccess({ headers: { 'x-pitch-editor-token': 'test-editor-token' } } as unknown as NextApiRequest, 'decision'), true)
    process.env.DECISION_EDITOR_TOKEN = 'decision-token'
    assert.equal(hasEditorWriteAccess({ headers: { 'x-decision-editor-token': 'decision-token' } } as unknown as NextApiRequest, 'decision'), true)
    assert.equal(hasEditorWriteAccess({ headers: { 'x-pitch-editor-token': 'test-editor-token' } } as unknown as NextApiRequest, 'decision'), false)
  } finally {
    mutableEnv.NODE_ENV = previousNodeEnv
    process.env.PITCH_EDITOR_TOKEN = previousPitchToken
    if (previousDecisionToken === undefined) delete process.env.DECISION_EDITOR_TOKEN
    else process.env.DECISION_EDITOR_TOKEN = previousDecisionToken
  }

  console.log('API route regression tests passed')
}

void main()
