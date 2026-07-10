import { create } from 'zustand'

export type PanelLayoutMode = 'balanced' | 'memo-heavy' | 'data-heavy'

type TerminalState = {
  commandOpen: boolean
  sourceSheetOpen: boolean
  layoutMode: PanelLayoutMode
  activeTickerDraft: string
  memoDrafts: Record<string, string>
  metricOrder: string[]
  openCommand: () => void
  setCommandOpen: (open: boolean) => void
  setSourceSheetOpen: (open: boolean) => void
  setLayoutMode: (mode: PanelLayoutMode) => void
  setActiveTickerDraft: (ticker: string) => void
  setMemoDraft: (key: string, value: string) => void
  setMetricOrder: (order: string[]) => void
}

export const useTerminalStore = create<TerminalState>(set => ({
  commandOpen: false,
  sourceSheetOpen: false,
  layoutMode: 'balanced',
  activeTickerDraft: 'NVDA',
  memoDrafts: {},
  metricOrder: [],
  openCommand: () => set({ commandOpen: true }),
  setCommandOpen: commandOpen => set({ commandOpen }),
  setSourceSheetOpen: sourceSheetOpen => set({ sourceSheetOpen }),
  setLayoutMode: layoutMode => set({ layoutMode }),
  setActiveTickerDraft: activeTickerDraft => set({ activeTickerDraft }),
  setMemoDraft: (key, value) => set(state => ({ memoDrafts: { ...state.memoDrafts, [key]: value } })),
  setMetricOrder: metricOrder => set({ metricOrder })
}))
