export type GoalMetric = 'revenue' | 'netProfit' | 'ebitda' | 'safetyMarginPct'

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  revenue: 'Выручка',
  netProfit: 'Чистая прибыль',
  ebitda: 'EBITDA',
  safetyMarginPct: 'Запас финансовой прочности',
}

export interface Goal {
  id: string
  title: string
  metric: GoalMetric
  targetValue: number
  targetPeriod: string // 'YYYY-MM'
  createdPeriod: string // 'YYYY-MM' — период, когда цель была поставлена
  /** Значение метрики на момент постановки цели — точка отсчёта прогресса. */
  baselineValue: number
}
