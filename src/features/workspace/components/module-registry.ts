import {
  Activity,
  BarChart3,
  Clipboard,
  Database,
  FlaskConical,
  Gauge,
  Layers3,
  LineChart,
  ListFilter,
  PenLine,
  Shield,
  SlidersHorizontal,
  Terminal,
  TrendingUp
} from 'lucide-react'
import type { ModuleMeta, WorkspaceModule } from '@/contracts/workspace'

export const workspaceModules: ModuleMeta[] = [
  { id: 'overview', label: 'Overview', short: 'Overview', href: '/?module=overview', icon: Terminal },
  { id: 'rotation', label: 'Rotation', short: 'Rotation', href: '/?module=rotation', icon: LineChart },
  { id: 'baskets', label: 'Baskets', short: 'Baskets', href: '/?module=baskets', icon: Layers3 },
  { id: 'positioning', label: 'Positioning', short: 'Positioning', href: '/?module=positioning', icon: SlidersHorizontal },
  { id: 'crowding', label: 'Crowding', short: 'Crowding', href: '/?module=crowding', icon: Gauge },
  { id: 'validation', label: 'Signal Validation Lab', short: 'Signal Lab', href: '/?module=validation', icon: FlaskConical },
  { id: 'methodology', label: 'Methodology', short: 'Method', href: '/?module=methodology', icon: ListFilter },
  { id: 'korea-defense', label: 'Korea Defense', short: 'Korea', href: '/?module=korea-defense', icon: Shield },
  { id: 'stock-report', label: 'Stock Report', short: 'Report', href: '/?module=stock-report&ticker=NVDA', icon: BarChart3 },
  { id: 'stock-pitch', label: 'Stock Pitch', short: 'Pitch', href: '/?module=stock-pitch', icon: PenLine },
  { id: 'decision-log', label: 'Decision Journal', short: 'Journal', href: '/?module=decision-log', icon: Clipboard },
  { id: 'event-study', label: 'Event Study Lab', short: 'Event Lab', href: '/?module=event-study', icon: Activity },
  { id: 'paper-book', label: 'PM Engine', short: 'PM Engine', href: '/?module=paper-book', icon: TrendingUp },
  { id: 'risk-lens', label: 'Risk + Vol Regime', short: 'Risk Lens', href: '/?module=risk-lens', icon: Shield },
  { id: 'source-audit', label: 'Data Quality / Source Audit', short: 'Source Audit', href: '/?module=source-audit', icon: Database }
]

export const basketDetailMeta: ModuleMeta = {
  id: 'basket-detail',
  label: 'Basket Detail',
  short: 'Baskets',
  href: '/?module=baskets',
  icon: Layers3
}

const hiddenModuleIds = new Set<WorkspaceModule>(['positioning'])

export const visibleWorkspaceModules = workspaceModules.filter(item => !hiddenModuleIds.has(item.id))

export function moduleMeta(module: WorkspaceModule) {
  return module === 'basket-detail'
    ? basketDetailMeta
    : workspaceModules.find(item => item.id === module) ?? workspaceModules[0]
}
