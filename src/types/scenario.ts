export type ScenarioType = 'pessimistic' | 'base' | 'growth' | 'custom'

/** Множители, применяемые к базовым FinancialInputs (1 = без изменений). */
export interface ScenarioMultipliers {
  revenue: number
  avgCheck: number
  salesCount: number
  cogs: number
  marketing: number
  payroll: number
  rent: number
  taxes: number
}

export interface Scenario {
  id: string
  name: string
  type: ScenarioType
  multipliers: ScenarioMultipliers
}

export const DEFAULT_MULTIPLIERS: ScenarioMultipliers = {
  revenue: 1,
  avgCheck: 1,
  salesCount: 1,
  cogs: 1,
  marketing: 1,
  payroll: 1,
  rent: 1,
  taxes: 1,
}

export const STANDARD_SCENARIOS: Scenario[] = [
  {
    id: 'pessimistic',
    name: 'Пессимистичный',
    type: 'pessimistic',
    multipliers: { ...DEFAULT_MULTIPLIERS, salesCount: 0.8, avgCheck: 0.95, cogs: 1.05 },
  },
  {
    id: 'base',
    name: 'Базовый',
    type: 'base',
    multipliers: { ...DEFAULT_MULTIPLIERS },
  },
  {
    id: 'growth',
    name: 'Рост',
    type: 'growth',
    multipliers: { ...DEFAULT_MULTIPLIERS, salesCount: 1.2, avgCheck: 1.08, cogs: 0.97 },
  },
]

/**
 * Два независимых драйвера выручки: рост количества продаж и рост среднего чека.
 * Revenue = avgCheck × salesCount, поэтому их совместный эффект на выручку — это их
 * произведение (composition), а не сумма — и ни один из них сам по себе не означает
 * «рост выручки на X%». Раньше salesCountGrowthPct назывался monthlyGrowthRatePct и был
 * подписан как «рост выручки», что вводило в заблуждение: при ненулевом avgCheckGrowthPct
 * реальный рост выручки получался выше заданного (двойной рост).
 */
export interface ForecastConfig {
  salesCountGrowthPct: number // рост количества продаж в % в месяц
  seasonality: number[] // 12 коэффициентов, 1 = нейтрально
  marketingBudgetTrendPct: number // изменение рекламного бюджета в % в месяц
  avgCheckGrowthPct: number // рост среднего чека в % в месяц
  employeesGrowth: number // доп. сотрудников за 12 мес (равномерно распределяется на ФОТ)
  /**
   * CAPEX (покупка/ремонт оборудования и т.п.) в месяц — постоянная сумма на весь горизонт.
   * Используется только когда в calculateForecast передан balanceSheet (иначе не от чего катить
   * вперёд основные средства в прогнозном балансе) — см. MonthlyForecastPoint.balanceSheet.
   */
  monthlyCapex: number
}

export const DEFAULT_FORECAST_CONFIG: ForecastConfig = {
  salesCountGrowthPct: 2,
  seasonality: Array(12).fill(1),
  marketingBudgetTrendPct: 0,
  avgCheckGrowthPct: 0,
  employeesGrowth: 0,
  monthlyCapex: 0,
}

/**
 * Прогнозный баланс на конец месяца — driver-based проекция Assets/Liabilities/Equity, а не
 * просто число на графике. Присутствует, только если в ForecastOptions передан balanceSheet
 * (тот же триггер, что включает поправку на оборотный капитал) — без стартового баланса не от
 * чего катить вперёд основные средства/долг/капитал.
 */
export interface MonthlyForecastBalanceSheet {
  capex: number
  fixedAssets: number
  debtBalance: number
  receivables: number
  inventory: number
  payables: number
  /** Капитал = капитал на начало прогноза + накопленная чистая прибыль (нераспределённая прибыль). */
  equity: number
  totalAssets: number
  totalLiabilities: number
  /**
   * totalAssets − totalLiabilities − equity. Математически должно быть ≈0 (с точностью до
   * копейки) при согласованной прокатке P&L → Cash Flow → Balance Sheet — если тест на это
   * когда-нибудь провалится, значит в одной из формул разошлась методика, а не "ну, бывает".
   */
  identityGap: number
}

export interface MonthlyForecastPoint {
  monthIndex: number
  label: string
  revenue: number
  expenses: number
  netProfit: number
  /** Чистый денежный поток ЗА месяц (не накопительно). */
  cashFlow: number
  /** Накопительный остаток денег на конец месяца = openingCash + сумма cashFlow с начала прогноза. */
  cashBalance: number
  balanceSheet?: MonthlyForecastBalanceSheet
}
