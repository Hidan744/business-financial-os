/**
 * Командный доступ: сотрудники входят под своим Supabase-аккаунтом, а не общим PIN
 * на устройстве владельца. Доступ проверяется на сервере (см. supabase/002_team_access.sql) —
 * это ДОЛЖНО зеркалить домены/маппинг там 1-в-1, иначе клиент и сервер разойдутся
 * в том, что можно, а что нет.
 */
export type TeamDomain =
  | 'finance'
  | 'balance'
  | 'cashflow'
  | 'taxes'
  | 'forecast'
  | 'hr'
  | 'goals'
  | 'unitEconomics'
  | 'aiCfo'

export const TEAM_DOMAIN_LABELS: Record<TeamDomain, string> = {
  finance: 'Финансы (P&L, история, план/факт)',
  balance: 'Баланс',
  cashflow: 'Cash Flow',
  taxes: 'Налоги',
  forecast: 'Прогноз',
  hr: 'Сотрудники (штат и зарплаты)',
  goals: 'Цели',
  unitEconomics: 'Unit-экономика',
  aiCfo: 'AI CFO (история переписки)',
}

export const ALL_TEAM_DOMAINS = Object.keys(TEAM_DOMAIN_LABELS) as TeamDomain[]

/**
 * Верхнеуровневые ключи BusinessState, которые открывает каждый домен — должно зеркалить
 * CASE в update_business_section() и ветки в get_business_view() в 002_team_access.sql.
 */
export const DOMAIN_KEYS: Record<TeamDomain, string[]> = {
  finance: ['financialInputs', 'history', 'targets'],
  balance: ['balanceSheet', 'balanceSheetHistory'],
  cashflow: ['cashFlowInputs'],
  taxes: ['taxSettings'],
  forecast: ['forecastConfig'],
  hr: ['employees', 'plannedHires'],
  goals: ['goals'],
  unitEconomics: ['unitEconomics'],
  aiCfo: ['aiHistory'],
}

/**
 * Какие домены нужны участнику, чтобы раздел был доступен. Без НИ ОДНОГО из них раздел
 * скрыт для участника (не просто рендерит null — сама навигация его не покажет). Требуется
 * ВСЕ перечисленные домены сразу, а не любой один — большинство страниц читают financialInputs
 * (через useFinancials) как обязательное условие рендера, поэтому без домена 'finance' они
 * всё равно останутся пустыми даже если открыт узкоспециальный домен вроде unitEconomics.
 */
export const ROUTE_REQUIRED_DOMAINS: Record<string, TeamDomain[]> = {
  '/app/finance': ['finance'],
  '/app/taxes': ['taxes'],
  '/app/balance': ['balance'],
  '/app/cashflow': ['cashflow'],
  '/app/history': ['finance'],
  '/app/history-import': ['finance'],
  '/app/simulator': ['finance'],
  '/app/sales': ['finance'],
  '/app/forecast': ['finance'],
  '/app/plan': ['finance'],
  '/app/ai-cfo': ['finance', 'aiCfo'],
  '/app/crisis': ['finance'],
  '/app/stress-test': ['finance'],
  '/app/debts': ['finance'],
  '/app/hr': ['hr'],
  '/app/goals': ['goals'],
  '/app/unit-economics': ['finance', 'unitEconomics'],
  '/app/report': ['finance'],
}

/**
 * Разделы, которые участнику не откроет НИ ОДИН домен — управление бизнесом целиком:
 * профиль, приглашения, удаление бизнеса. Не в ROUTE_REQUIRED_DOMAINS специально: их
 * "нет требований" означало бы "открыто всем", а тут наоборот — закрыто всем, кроме владельца.
 */
export const OWNER_ONLY_ROUTES = ['/app/settings']

/** Раздел доступен участнику, если у него есть ВСЕ домены, от которых раздел реально зависит. */
export function isRouteUnlockedForMember(route: string, grantedDomains: TeamDomain[]): boolean {
  if (OWNER_ONLY_ROUTES.includes(route)) return false
  const required = ROUTE_REQUIRED_DOMAINS[route]
  if (!required) return true // раздел не завязан на командные домены (например Dashboard)
  return required.every((d) => grantedDomains.includes(d))
}

export interface BusinessMember {
  businessId: string
  userId: string
  allowedDomains: TeamDomain[]
  label: string | null
  createdAt: string
}

export interface PendingInvite {
  id: string
  businessId: string
  email: string
  allowedDomains: TeamDomain[]
  label: string | null
  createdAt: string
}

/** 'owner' — видит и пишет всё как раньше. 'member' — только выданные домены, через RPC. */
export type BusinessRole = 'owner' | 'member'
