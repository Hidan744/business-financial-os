export interface CustomExpenseLine {
  id: string
  label: string
  amount: number
}

/** Все суммы — за один месяц (базовая единица расчётов в системе). */
export interface FinancialInputs {
  businessId: string
  period: string // '2026-09'
  revenue: number
  cogs: number // себестоимость (переменные затраты)
  payroll: number // ФОТ
  rent: number
  marketing: number
  logistics: number
  utilities: number
  software: number
  customExpenseLines: CustomExpenseLine[]
  depreciation: number
  loanInterest: number
  taxes: number
  loanPayments: number // погашение тела кредита (не влияет на прибыль, но влияет на cash flow)
  avgCheck: number
  salesCount: number
}

export interface CashFlowInputs {
  businessId: string
  period: string
  openingBalance: number
  operating: {
    customerPayments: number
    supplierPayments: number
    payroll: number
    rent: number
    marketing: number
    taxes: number
    otherOperating: number
  }
  investing: {
    equipment: number
    repairs: number
    assetPurchases: number
  }
  financing: {
    loanReceived: number
    loanRepaid: number
    ownerInvestment: number
    ownerWithdrawal: number
  }
}

/** Целевые показатели ("бюджет"), которые пользователь задаёт на период для сравнения план/факт. */
export interface PeriodTarget {
  period: string // '2026-09'
  targetRevenue: number
  targetNetProfit: number
  targetSalesCount: number
}

/**
 * Баланс на конец периода. Капитал (equity) не вводится напрямую — это остаточная величина
 * (Активы − Обязательства), как в бухгалтерском балансе, чтобы баланс не мог "не сойтись".
 */
export interface BalanceSheetInputs {
  businessId: string
  period: string
  currentAssets: {
    cash: number
    receivables: number // дебиторская задолженность
    inventory: number // запасы, товары
    other: number
  }
  nonCurrentAssets: {
    fixedAssets: number // основные средства (оборудование, помещение и т.п.)
    other: number
  }
  currentLiabilities: {
    payables: number // кредиторская задолженность
    shortTermDebt: number
    other: number
  }
  nonCurrentLiabilities: {
    longTermDebt: number
    other: number
  }
}

export interface FinancialSnapshot {
  revenue: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  fixedCosts: number
  variableCosts: number
  ebitda: number
  ebitdaMarginPct: number
  ebit: number
  ebitMarginPct: number
  netProfit: number
  netMarginPct: number
  contributionMarginPct: number
  breakEvenRevenue: number
  breakEvenSales: number
  safetyMarginPct: number
  cashFlow: number
  romiPct: number
  debtLoadPct: number
  /** Долг/EBITDA в годовом выражении (месячные значения × 12). null — если EBITDA ≤ 0. */
  debtToEbitda: number | null
  /** Во сколько раз EBITDA периода покрывает обязательные платежи по долгу (тело + проценты) за тот же период. */
  dscr: number | null
}
