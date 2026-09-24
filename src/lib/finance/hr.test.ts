import { describe, expect, it } from 'vitest'
import type { Employee, EmployeeTask, PlannedHire } from '@/types/hr'
import { calculateEmployeeWorkload, calculateProjectedPayroll, calculateTotalPayroll } from './hr'

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return { id: 'e1', name: 'Анна', role: 'Бариста', salary: 70000, hireDate: '2025-01-15', ...overrides }
}

function makePlannedHire(overrides: Partial<PlannedHire> = {}): PlannedHire {
  return { id: 'p1', role: 'Бариста', salary: 70000, startPeriod: '2026-10', ...overrides }
}

function makeTask(overrides: Partial<EmployeeTask> = {}): EmployeeTask {
  return {
    id: 't1',
    employeeId: 'e1',
    title: 'Задача',
    status: 'open',
    createdAt: '2026-09-01T00:00:00.000Z',
    attachments: [],
    ...overrides,
  }
}

describe('calculateTotalPayroll', () => {
  it('sums salaries across employees', () => {
    const employees = [makeEmployee({ salary: 90000 }), makeEmployee({ id: 'e2', salary: 70000 }), makeEmployee({ id: 'e3', salary: 40000 })]
    expect(calculateTotalPayroll(employees)).toBe(200000)
  })
  it('returns 0 for an empty roster', () => {
    expect(calculateTotalPayroll([])).toBe(0)
  })
})

describe('calculateProjectedPayroll', () => {
  it('adds planned hires on top of the current roster', () => {
    const employees = [makeEmployee({ salary: 90000 })]
    const plannedHires = [makePlannedHire({ salary: 70000 }), makePlannedHire({ id: 'p2', salary: 60000 })]
    expect(calculateProjectedPayroll(employees, plannedHires)).toBe(90000 + 70000 + 60000)
  })
  it('equals the current payroll when there are no planned hires', () => {
    const employees = [makeEmployee({ salary: 90000 })]
    expect(calculateProjectedPayroll(employees, [])).toBe(90000)
  })
})

describe('calculateEmployeeWorkload', () => {
  const asOf = new Date('2026-09-24T12:00:00.000Z')

  it('counts open tasks and ignores other employees', () => {
    const tasks = [makeTask({ id: 't1', status: 'open' }), makeTask({ id: 't2', employeeId: 'e2', status: 'open' })]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.openCount).toBe(1)
  })

  it('counts an open task past its due date as overdue', () => {
    const tasks = [makeTask({ status: 'open', dueDate: '2026-09-01' })]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.overdueCount).toBe(1)
  })

  it('does not count an open task with a future due date as overdue', () => {
    const tasks = [makeTask({ status: 'open', dueDate: '2026-10-01' })]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.overdueCount).toBe(0)
  })

  it('does not count a done task as overdue even if its due date has passed', () => {
    const tasks = [makeTask({ status: 'done', dueDate: '2026-09-01', completedAt: '2026-09-01T10:00:00.000Z' })]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.overdueCount).toBe(0)
    expect(result.doneCount).toBe(1)
  })

  it('returns null efficiency when no done task has a due date', () => {
    const tasks = [makeTask({ status: 'done', completedAt: '2026-09-10T10:00:00.000Z' })]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.efficiencyPct).toBeNull()
  })

  it('is 100% when every done task with a due date was completed on time', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'done', dueDate: '2026-09-10', completedAt: '2026-09-09T10:00:00.000Z' }),
      makeTask({ id: 't2', status: 'done', dueDate: '2026-09-15', completedAt: '2026-09-15T23:00:00.000Z' }),
    ]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.efficiencyPct).toBe(100)
  })

  it('averages on-time vs late completions', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'done', dueDate: '2026-09-10', completedAt: '2026-09-09T10:00:00.000Z' }),
      makeTask({ id: 't2', status: 'done', dueDate: '2026-09-10', completedAt: '2026-09-12T10:00:00.000Z' }),
    ]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.efficiencyPct).toBe(50)
  })

  it('excludes done-without-due-date tasks from the efficiency denominator', () => {
    const tasks = [
      makeTask({ id: 't1', status: 'done', completedAt: '2026-09-09T10:00:00.000Z' }),
      makeTask({ id: 't2', status: 'done', dueDate: '2026-09-10', completedAt: '2026-09-09T10:00:00.000Z' }),
    ]
    const result = calculateEmployeeWorkload('e1', tasks, asOf)
    expect(result.doneCount).toBe(2)
    expect(result.efficiencyPct).toBe(100)
  })
})
