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

export interface FinancialSnapshot {
  revenue: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  fixedCosts: number
  variableCosts: number
  ebitda: number
  ebitdaMarginPct: number
  netProfit: number
  netMarginPct: number
  contributionMarginPct: number
  breakEvenRevenue: number
  breakEvenSales: number
  safetyMarginPct: number
  cashFlow: number
  romiPct: number
  debtLoadPct: number
}
