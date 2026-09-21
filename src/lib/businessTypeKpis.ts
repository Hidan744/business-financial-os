import type { BusinessType } from '@/types/business'

/**
 * Какие KPI на Dashboard важнее всего для конкретного типа бизнеса — выделяются визуально.
 * Ключи соответствуют идентификаторам карточек в DashboardPage, не названиям формул.
 */
export const BUSINESS_TYPE_KPI_PRIORITIES: Record<BusinessType, string[]> = {
  cafe: ['revenue', 'grossMarginPct', 'costPerSale'],
  retail: ['grossMarginPct', 'ebitda', 'safetyMarginPct'],
  ecommerce: ['romiPct', 'costPerSale', 'netMarginPct'],
  production: ['grossMarginPct', 'debtToEbitda', 'ebitdaMarginPct'],
  agency: ['revenuePerEmployee', 'netMarginPct', 'ebitdaMarginPct'],
  services: ['revenuePerEmployee', 'netMarginPct', 'safetyMarginPct'],
  other: ['netProfit', 'cashFlow', 'safetyMarginPct'],
}
