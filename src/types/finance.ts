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
  /**
   * Переменные операционные расходы, помимо себестоимости — комиссии маркетплейсов, эквайринг,
   * доставка за единицу и т.п. Растут вместе с объёмом продаж, но это не себестоимость товара/
   * услуги (COGS), а отдельная переменная статья — в P&L идёт после Валовой прибыли, образуя
   * Маржинальную прибыль (Contribution Profit), и снижает Точку безубыточности/маржинальность.
   * Опционально — старые записи без этого поля читаются как 0 (см. getVariableCosts).
   */
  variableOpex?: number
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
  /**
   * Выручка, атрибутированная маркетингу (например, из рекламного кабинета) — опционально.
   * Без неё настоящий ROMI/ROAS посчитать нельзя (не с чем сравнивать расходы на рекламу),
   * и снэпшот вернёт null вместо гадания по всей выручке компании. Опционально — старые
   * сохранённые записи не имеют этого поля, поэтому читать нужно как `?? 0`.
   */
  attributedRevenue?: number
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
  /** Валовая прибыль минус переменные операционные расходы (variableOpex) — то, что остаётся на покрытие постоянных расходов. */
  contributionProfit: number
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
  /** НЕ настоящий ROMI — грубая оценка (вся выручка − реклама) / реклама. См. calculateMarketingEfficiencyPct. */
  marketingEfficiencyPct: number
  /** Настоящий ROMI. null — если не задана выручка, атрибутированная маркетингу (attributedRevenue). */
  romiPct: number | null
  /** ROAS = атрибутированная выручка / расходы на маркетинг. null — как и romiPct, без атрибуции. */
  roas: number | null
  /** Обязательные платежи по долгу (тело + проценты) как доля выручки за период. */
  debtServiceRatioPct: number
  /** Остаток долга / годовая EBITDA. null — если остаток долга неизвестен (нет данных баланса) или EBITDA ≤ 0. */
  debtToEbitda: number | null
  /** Во сколько раз свободный денежный поток периода покрывает платежи по долгу (тело + проценты). */
  dscr: number | null
}
