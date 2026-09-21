import type { Goal } from '@/types/goal'

/** Разница в месяцах между двумя периодами 'YYYY-MM' (b − a). */
export function monthsBetweenPeriods(a: string, b: string): number {
  const [aYear, aMonth] = a.split('-').map(Number)
  const [bYear, bMonth] = b.split('-').map(Number)
  return (bYear - aYear) * 12 + (bMonth - aMonth)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export type GoalStatus = 'achieved' | 'on_track' | 'behind' | 'overdue'

export interface GoalProgress {
  /** % выполнения по значению метрики, 0..100. */
  progressPct: number
  /** % пройденного времени от постановки цели до срока, 0..100. */
  timeProgressPct: number
  monthsRemaining: number
  status: GoalStatus
}

export function calculateGoalProgress(goal: Goal, currentValue: number, currentPeriod: string): GoalProgress {
  const isGrowthGoal = goal.targetValue >= goal.baselineValue
  const span = goal.targetValue - goal.baselineValue

  const progressPct =
    span === 0
      ? isGrowthGoal
        ? currentValue >= goal.targetValue
          ? 100
          : 0
        : currentValue <= goal.targetValue
          ? 100
          : 0
      : clamp(((currentValue - goal.baselineValue) / span) * 100, 0, 100)

  const monthsTotal = monthsBetweenPeriods(goal.createdPeriod, goal.targetPeriod)
  const monthsElapsed = monthsBetweenPeriods(goal.createdPeriod, currentPeriod)
  const timeProgressPct = monthsTotal > 0 ? clamp((monthsElapsed / monthsTotal) * 100, 0, 100) : 100
  const monthsRemaining = Math.max(0, monthsTotal - monthsElapsed)

  const achieved = isGrowthGoal ? currentValue >= goal.targetValue : currentValue <= goal.targetValue

  let status: GoalStatus
  if (achieved) status = 'achieved'
  else if (monthsRemaining <= 0) status = 'overdue'
  else if (progressPct >= timeProgressPct) status = 'on_track'
  else status = 'behind'

  return { progressPct, timeProgressPct, monthsRemaining, status }
}
