import { describe, expect, it } from 'vitest'
import type { Goal } from '@/types/goal'
import { calculateGoalProgress, monthsBetweenPeriods } from './goals'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Выручка 3 млн',
    metric: 'revenue',
    targetValue: 3000000,
    targetPeriod: '2027-01',
    createdPeriod: '2026-01',
    baselineValue: 2000000,
    ...overrides,
  }
}

describe('monthsBetweenPeriods', () => {
  it('computes whole-year differences', () => {
    expect(monthsBetweenPeriods('2026-01', '2027-01')).toBe(12)
  })
  it('computes partial differences', () => {
    expect(monthsBetweenPeriods('2026-01', '2026-06')).toBe(5)
  })
  it('is negative when b is before a', () => {
    expect(monthsBetweenPeriods('2026-06', '2026-01')).toBe(-5)
  })
})

describe('calculateGoalProgress — growth goal', () => {
  it('is 0% progress at the baseline value', () => {
    const progress = calculateGoalProgress(makeGoal(), 2000000, '2026-01')
    expect(progress.progressPct).toBe(0)
    expect(progress.status).toBe('on_track')
  })

  it('is 100% progress and achieved once the target is reached', () => {
    const progress = calculateGoalProgress(makeGoal(), 3200000, '2026-06')
    expect(progress.progressPct).toBe(100)
    expect(progress.status).toBe('achieved')
  })

  it('is on_track when value progress keeps pace with time progress', () => {
    // halfway through the year (6/12 months), halfway to the target (2.5M of 2M->3M)
    const progress = calculateGoalProgress(makeGoal(), 2500000, '2026-07')
    expect(progress.timeProgressPct).toBeCloseTo(50, 5)
    expect(progress.progressPct).toBeCloseTo(50, 5)
    expect(progress.status).toBe('on_track')
  })

  it('is behind when value progress lags time progress', () => {
    const progress = calculateGoalProgress(makeGoal(), 2100000, '2026-07')
    expect(progress.status).toBe('behind')
  })

  it('is overdue when the deadline has passed without reaching the target', () => {
    const progress = calculateGoalProgress(makeGoal(), 2500000, '2027-03')
    expect(progress.monthsRemaining).toBe(0)
    expect(progress.status).toBe('overdue')
  })
})

describe('calculateGoalProgress — decline goal (target below baseline)', () => {
  it('treats reaching a lower target as achieved', () => {
    const goal = makeGoal({ metric: 'safetyMarginPct', targetValue: 10, baselineValue: 30 })
    const progress = calculateGoalProgress(goal, 5, '2026-06')
    expect(progress.progressPct).toBe(100)
    expect(progress.status).toBe('achieved')
  })
})
