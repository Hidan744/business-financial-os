export interface Employee {
  id: string
  name: string
  role: string
  /** Полная стоимость для компании в месяц (с налогами и взносами), как в ФОТ. */
  salary: number
  hireDate: string // 'YYYY-MM-DD'
}

/** Запланированный, ещё не нанятый сотрудник — для планирования будущего ФОТ. */
export interface PlannedHire {
  id: string
  role: string
  salary: number
  startPeriod: string // 'YYYY-MM'
}
