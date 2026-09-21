import type { Employee, PlannedHire } from '@/types/hr'

/** ФОТ, посчитанный снизу вверх по фактическому штату. */
export function calculateTotalPayroll(employees: Employee[]): number {
  return employees.reduce((sum, e) => sum + e.salary, 0)
}

/** Прогнозный ФОТ с учётом уже запланированных, но ещё не нанятых сотрудников. */
export function calculateProjectedPayroll(employees: Employee[], plannedHires: PlannedHire[]): number {
  return calculateTotalPayroll(employees) + plannedHires.reduce((sum, h) => sum + h.salary, 0)
}
