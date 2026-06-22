import { createApiResponse, createShellMeta, type ShellMeta, type UnavailableField } from './api'

export type RightRailContent = {
  title?: string
  interpretation?: string
  pmQuestions?: string[]
  unavailableFields?: UnavailableField[]
}

export type ResearchPageMeta = {
  shell: ShellMeta
  rightRail: RightRailContent
}

export type HiddenResearchPageMeta = {
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  hideRightRail: true
}

type ResearchRightRailInput = Omit<RightRailContent, 'unavailableFields'> & {
  unavailableFields?: RightRailContent['unavailableFields']
}

export function buildResearchPageProps<T extends object>(
  data: T,
  rightRail: ResearchRightRailInput,
  responseData: unknown = data
): T & ResearchPageMeta {
  const response = createApiResponse(responseData)
  return {
    ...data,
    shell: createShellMeta(response),
    rightRail: {
      ...rightRail,
      unavailableFields: rightRail.unavailableFields ?? response.unavailableFields
    }
  }
}

export function buildHiddenResearchPageProps<T extends object>(
  data: T,
  responseData: unknown = data
): T & HiddenResearchPageMeta {
  const response = createApiResponse(responseData)
  return {
    ...data,
    shell: createShellMeta(response),
    unavailableFields: response.unavailableFields,
    hideRightRail: true
  }
}
