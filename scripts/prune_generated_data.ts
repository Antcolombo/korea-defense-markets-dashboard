import { stat } from 'node:fs/promises'
import { compactSecSubmissions } from './lib/generated_retention'
import { readJson, writeJson } from './lib/io'

const filingsPath = 'src/generated/raw/filings.json'

type FilingsPayload = {
  sec?: { records?: Array<Record<string, unknown>> }
  [key: string]: unknown
}

async function main() {
  const beforeBytes = (await stat(filingsPath)).size
  const payload = await readJson<FilingsPayload>(filingsPath, {})
  const records = payload.sec?.records
  if (!records) throw new Error(`${filingsPath} has no SEC records to compact.`)

  const compacted = records.map(item => ({
    ...item,
    data: item.data ? compactSecSubmissions(item.data) : item.data
  }))
  await writeJson(filingsPath, {
    ...payload,
    sec: { ...payload.sec, records: compacted }
  })
  const afterBytes = (await stat(filingsPath)).size
  console.log(JSON.stringify({
    file: filingsPath,
    records: compacted.length,
    beforeBytes,
    afterBytes,
    deletedBytes: beforeBytes - afterBytes
  }))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
