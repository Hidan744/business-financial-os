export interface Employee {
  id: string
  name: string
  role: string
  /** Полная стоимость для компании в месяц (с налогами и взносами), как в ФОТ. */
  salary: number
  hireDate: string // 'YYYY-MM-DD'
  /** PIN-код (4-6 цифр) для доступа к разрешённым этому сотруднику разделам. */
  pin?: string | null
  /** Пути разделов, которые открывает PIN этого сотрудника (из PROTECTABLE_ROUTES). */
  allowedRoutes?: string[]
}

/** Запланированный, ещё не нанятый сотрудник — для планирования будущего ФОТ. */
export interface PlannedHire {
  id: string
  role: string
  salary: number
  startPeriod: string // 'YYYY-MM'
}

export type TaskStatus = 'open' | 'done'

/** Прикреплённый к задаче файл (отчёт) — сам файл лежит в IndexedDB браузера, здесь только метаданные. */
export interface TaskAttachment {
  id: string
  /** Ключ файла в IndexedDB (см. lib/storage/attachmentStore.ts). */
  blobKey: string
  name: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string // ISO
}

/** Задача, поставленная сотруднику — для контроля загрузки и своевременности выполнения. */
export interface EmployeeTask {
  id: string
  employeeId: string
  title: string
  description?: string
  /** Когда приступить к задаче — 'YYYY-MM-DD', без времени. */
  startDate?: string
  /**
   * Срок сдачи. 'YYYY-MM-DD' (весь день, старые задачи и когда время не важно) или
   * 'YYYY-MM-DDTHH:mm' (datetime-local, точный дедлайн) — формат различает наличие 'T'.
   */
  dueDate?: string
  status: TaskStatus
  createdAt: string // ISO
  completedAt?: string // ISO
  attachments: TaskAttachment[]
}
