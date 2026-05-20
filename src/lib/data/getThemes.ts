import themesJson from '@/generated/themes.json'
import type { Theme } from '@/types/theme'

export function getThemes(): Theme[] {
  return themesJson as Theme[]
}
