export type HealthStatus = 'stable' | 'attention' | 'critical'

export interface DiagnosticFactor {
  id: string
  label: string
  value: number
  unit: '%' | 'currency' | 'ratio'
  status: HealthStatus
  weight: number
  explanation: string
}

export interface DiagnosticProblem {
  id: string
  title: string
  metricRef: string
  value: string
  description: string
  severity: HealthStatus
}

export interface ActionPlanItem {
  id: string
  period: string // 'День 1–3', 'Неделя 2', ...
  problem: string
  action: string
  expectedEffect: string
  controlMetric: string
}

export interface DiagnosticResult {
  healthStatus: HealthStatus
  healthScore: number // 0-100
  factors: DiagnosticFactor[]
  problems: DiagnosticProblem[]
  actionPlan: ActionPlanItem[]
  generatedAt: string
}

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  stable: 'Стабильное',
  attention: 'Требует внимания',
  critical: 'Критическое',
}
