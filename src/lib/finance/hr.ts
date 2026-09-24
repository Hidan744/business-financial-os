import type { Employee, EmployeeTask, PlannedHire } from '@/types/hr'

/** ФОТ, посчитанный снизу вверх по фактическому штату. */
export function calculateTotalPayroll(employees: Employee[]): number {
  return employees.reduce((sum, e) => sum + e.salary, 0)
}

/** Прогнозный ФОТ с учётом уже запланированных, но ещё не нанятых сотрудников. */
export function calculateProjectedPayroll(employees: Employee[], plannedHires: PlannedHire[]): number {
  return calculateTotalPayroll(employees) + plannedHires.reduce((sum, h) => sum + h.salary, 0)
}

export interface EmployeeWorkload {
  employeeId: string
  /** Задачи в статусе "open". */
  openCount: number
  /** Открытые задачи с dueDate в прошлом. */
  overdueCount: number
  /** Выполненные задачи (для знаменателя эффективности). */
  doneCount: number
  /** Доля выполненных задач, закрытых не позже dueDate — null, если нет ни одной выполненной задачи со сроком. */
  efficiencyPct: number | null
}

/**
 * Загрузка и своевременность выполнения одного сотрудника по его задачам.
 * asOf — точка отсчёта "сейчас" (по умолчанию реальная дата), передаётся явно для тестируемости.
 */
export function calculateEmployeeWorkload(employeeId: string, tasks: EmployeeTask[], asOf: Date = new Date()): EmployeeWorkload {
  const own = tasks.filter((t) => t.employeeId === employeeId)
  const open = own.filter((t) => t.status === 'open')
  const done = own.filter((t) => t.status === 'done')
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < asOf)

  const doneWithDueDate = done.filter((t) => t.dueDate)
  const doneOnTime = doneWithDueDate.filter((t) => t.completedAt && new Date(t.completedAt) <= new Date(`${t.dueDate}T23:59:59`))

  return {
    employeeId,
    openCount: open.length,
    overdueCount: overdue.length,
    doneCount: done.length,
    efficiencyPct: doneWithDueDate.length > 0 ? Math.round((doneOnTime.length / doneWithDueDate.length) * 100) : null,
  }
}
