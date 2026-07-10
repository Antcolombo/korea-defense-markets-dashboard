export type PitchRow = {
  id: string
  slug: string
  ticker: string
  companyName: string
  recommendation: string
  status: string
  shareToken: string
  shareEnabled: boolean
  payload: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

export type PitchWriteFields = {
  ticker: string
  companyName: string
  recommendation: string
  payload: unknown
}

export interface PitchRepository {
  isAvailable(): boolean
  list(limit?: number): Promise<PitchRow[]>
  findLatest(): Promise<PitchRow | null>
  findBySlug(slug: string): Promise<PitchRow | null>
  slugExists(slug: string): Promise<boolean>
  create(input: PitchWriteFields & {
    slug: string
    status: string
    shareToken: string
    shareEnabled: boolean
  }): Promise<PitchRow>
  update(slug: string, input: PitchWriteFields & {
    status?: string
    shareEnabled?: boolean
  }): Promise<PitchRow>
}
