export type BusinessType =
  | 'services'
  | 'retail'
  | 'ecommerce'
  | 'production'
  | 'cafe'
  | 'agency'
  | 'other'

export type AnalysisPeriod = 'month' | 'quarter' | 'year'

export interface BusinessProfile {
  id: string
  name: string
  type: BusinessType
  currency: string
  period: AnalysisPeriod
  employeesCount: number
  createdAt: string
  /** Упрощённый режим для самозанятых — акцент на "доход − расходы − налог", без ФОТ/сотрудников. */
  isSelfEmployed?: boolean
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  services: 'Услуги',
  retail: 'Торговля',
  ecommerce: 'Интернет-магазин',
  production: 'Производство',
  cafe: 'Ресторан / кафе',
  agency: 'Агентство',
  other: 'Другое',
}

export const PERIOD_LABELS: Record<AnalysisPeriod, string> = {
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
}
