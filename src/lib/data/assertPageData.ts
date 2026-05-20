export function assertPageData<T>(records: T[], label: string, minimum = 1) {
  if (!Array.isArray(records) || records.length < minimum) {
    throw new Error(`${label} requires at least ${minimum} records`)
  }
  return records
}

export function hasPageData<T>(records: T[] | null | undefined, minimum = 1) {
  return Array.isArray(records) && records.length >= minimum
}
