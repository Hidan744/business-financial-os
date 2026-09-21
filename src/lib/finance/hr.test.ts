import { describe, expect, it } from 'vitest'
import type { Employee, PlannedHire } from '@/types/hr'
import { calculateProjectedPayroll, calculateTotalPayroll } from './hr'

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return { id: 'e1', name: 'Анна', role: 'Бариста', salary: 70000, hireDate: '2025-01-15', ...overrides }
}

function makePlannedHire(overrides: Partial<PlannedHire> = {}): PlannedHire {
  return { id: 'p1', role: 'Бариста', salary: 70000, startPeriod: '2026-10', ...overrides }
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
