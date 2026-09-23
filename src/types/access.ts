/** Настройки ограничения доступа к разделам по PIN-коду. */
export interface AccessSettings {
  /** Пути разделов (например '/app/finance'), закрытые PIN-кодом. */
  protectedRoutes: string[]
  /** PIN владельца — открывает сразу все защищённые разделы. */
  ownerPin: string | null
}

export const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  protectedRoutes: [],
  ownerPin: null,
}

/**
 * Разделы, которые можно закрыть PIN-кодом. Dashboard и Настройки исключены —
 * иначе владелец рискует случайно заблокировать себе доступ к управлению доступом.
 */
export const PROTECTABLE_ROUTES: { path: string; label: string }[] = [
  { path: '/app/finance', label: 'Финансы' },
  { path: '/app/taxes', label: 'Налоги' },
  { path: '/app/balance', label: 'Баланс' },
  { path: '/app/cashflow', label: 'Cash Flow' },
  { path: '/app/history', label: 'История' },
  { path: '/app/history-import', label: 'Импорт истории' },
  { path: '/app/simulator', label: 'Симулятор' },
  { path: '/app/sales', label: 'Продажи' },
  { path: '/app/forecast', label: 'Прогноз' },
  { path: '/app/plan', label: 'Финансовый план' },
  { path: '/app/ai-cfo', label: 'AI CFO' },
  { path: '/app/crisis', label: 'Антикризис' },
  { path: '/app/stress-test', label: 'Стресс-тест' },
  { path: '/app/debts', label: 'Долги' },
  { path: '/app/hr', label: 'Сотрудники' },
  { path: '/app/inventory', label: 'Склад' },
  { path: '/app/goals', label: 'Цели' },
  { path: '/app/unit-economics', label: 'Unit-экономика' },
  { path: '/app/report', label: 'Отчёт' },
]
