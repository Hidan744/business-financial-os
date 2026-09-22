import type { BusinessState } from '@/lib/storage/repository'
import type { FinancialInputs } from '@/types/finance'
import { DEFAULT_FORECAST_CONFIG, STANDARD_SCENARIOS } from '@/types/scenario'

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7)

// Фиксированный валидный UUID — id используется как первичный ключ (uuid) в Supabase,
// а фиксированное значение делает loadDemo() идемпотентным (повторный вызов не дублирует бизнес).
const DEMO_BUSINESS_ID = '00000000-0000-4000-8000-000000000001'

function shiftPeriod(period: string, monthsBack: number): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 - monthsBack, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Магазин собственного бренда одежды: выше себестоимость и реклама, чем у кафе (пошив
 * коллекций, продвижение бренда), ФОТ и аренда почти постоянны месяц к месяцу.
 */
function historicalMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.45),
    payroll: 320000,
    rent: 260000,
    marketing: Math.round(revenue * 0.15),
    logistics: 50000,
    utilities: 18000,
    software: 12000,
    customExpenseLines: [{ id: 'collections', label: 'Разработка и производство коллекций', amount: 160000 }],
    depreciation: 18000,
    loanInterest: 22000,
    taxes: Math.round(revenue * 0.015),
    loanPayments: 80000,
    avgCheck,
    salesCount,
  }
}

/**
 * Демо-бизнес: Nord Wear — магазин собственного бренда одежды. Год назад выручка была на
 * пике (2,6 млн ₽/мес), затем — перепроизводство коллекций, рост рекламных расходов и
 * падение продаж привели к текущему убытку. Намеренно "в минусе" — чтобы сразу показывать
 * диагностику, план действий и предупреждение о кассовом разрыве в деле, а не на пустых
 * данных.
 */
export function createDemoBusiness(): BusinessState {
  const businessId = DEMO_BUSINESS_ID

  return {
    profile: {
      id: businessId,
      name: 'Nord Wear',
      type: 'retail',
      currency: 'RUB',
      period: 'month',
      employeesCount: 5,
      createdAt: new Date().toISOString(),
    },
    financialInputs: {
      businessId,
      period: CURRENT_PERIOD,
      revenue: 1800000,
      cogs: 810000,
      payroll: 350000,
      rent: 280000,
      marketing: 300000,
      logistics: 60000,
      utilities: 20000,
      software: 15000,
      customExpenseLines: [{ id: 'collections', label: 'Разработка и производство коллекций', amount: 195000 }],
      depreciation: 20000,
      loanInterest: 25000,
      taxes: 18000,
      loanPayments: 80000,
      avgCheck: 4500,
      salesCount: 400,
    },
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      openingBalance: 480000,
      operating: {
        customerPayments: 1750000,
        supplierPayments: 800000,
        payroll: 350000,
        rent: 280000,
        marketing: 300000,
        taxes: 18000,
        otherOperating: 60000,
      },
      investing: {
        equipment: 40000,
        repairs: 10000,
        assetPurchases: 0,
      },
      financing: {
        loanReceived: 0,
        loanRepaid: 80000,
        ownerInvestment: 0,
        ownerWithdrawal: 112000,
      },
    },
    scenarios: STANDARD_SCENARIOS,
    // Рост намеренно 0% — прогноз честно продолжает текущий убыточный тренд, а не
    // предполагает восстановление само по себе. Сезонность апарель-ритейла: провал после
    // Нового года, летнее затишье, пик на Чёрную пятницу и предновогодние покупки.
    forecastConfig: {
      ...DEFAULT_FORECAST_CONFIG,
      salesCountGrowthPct: 0,
      seasonality: [0.85, 0.85, 0.95, 1, 1, 0.9, 0.85, 0.9, 1, 1.05, 1.15, 1.3],
    },
    aiHistory: [],
    onboardingComplete: true,
    // Полный год истории: пик выручки 11 месяцев назад (2,6 млн ₽), затем устойчивое
    // снижение из-за перепроизводства коллекций и роста расходов на рекламу — к текущему
    // периоду бизнес уже в убытке. YoY (12 месяцев назад = 11 мес. назад отсюда) показывает
    // реальное падение, а не выдуманное.
    history: [
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 11), 2600000, 578),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 10), 2450000, 544),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 9), 2300000, 511),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 8), 2150000, 478),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 7), 2300000, 511),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 2500000, 556),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 2200000, 489),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 2000000, 444),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 1950000, 433),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 1900000, 422),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 1850000, 411),
    ],
    targets: [
      { period: CURRENT_PERIOD, targetRevenue: 2200000, targetNetProfit: 50000, targetSalesCount: 490 },
    ],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      currentAssets: { cash: 180000, receivables: 40000, inventory: 950000, other: 0 },
      nonCurrentAssets: { fixedAssets: 650000, other: 0 },
      currentLiabilities: { payables: 320000, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 600000, other: 0 },
    },
    // Cash (180000) сходится с closingBalance из cashFlowInputs выше (480000 opening − 300000
    // netCashFlow) — намеренно, чтобы демо сразу показывало сходящуюся сверку Cash Flow ↔ Баланс.
    // Склад (inventory) вырос за период — нераспроданные коллекции замораживают деньги, это
    // одна из причин кассового разрыва.
    balanceSheetHistory: [
      {
        businessId,
        period: shiftPeriod(CURRENT_PERIOD, 1),
        currentAssets: { cash: 480000, receivables: 60000, inventory: 850000, other: 0 },
        nonCurrentAssets: { fixedAssets: 660000, other: 0 },
        currentLiabilities: { payables: 280000, shortTermDebt: 0, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 680000, other: 0 },
      },
    ],
    employees: [
      {
        id: 'emp1',
        name: 'Ирина Волкова',
        role: 'Управляющая',
        salary: 100000,
        hireDate: '2023-03-01',
        pin: '1111',
        allowedRoutes: ['/app/finance', '/app/taxes', '/app/balance', '/app/debts', '/app/report'],
      },
      { id: 'emp2', name: 'Максим Орлов', role: 'Продавец-консультант', salary: 60000, hireDate: '2023-06-15' },
      { id: 'emp3', name: 'Дарья Кузьмина', role: 'Продавец-консультант', salary: 60000, hireDate: '2024-01-10' },
      { id: 'emp4', name: 'Полина Егорова', role: 'Швея-технолог', salary: 65000, hireDate: '2023-09-01' },
      { id: 'emp5', name: 'Артём Николаев', role: 'Курьер', salary: 65000, hireDate: '2024-04-20' },
    ],
    plannedHires: [{ id: 'hire1', role: 'Маркетолог', salary: 70000, startPeriod: shiftPeriod(CURRENT_PERIOD, -3) }],
    goals: [
      {
        id: 'goal1',
        title: 'Вернуться к выручке 2 500 000 ₽ в месяц',
        metric: 'revenue',
        targetValue: 2500000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -6),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: 1800000,
      },
    ],
    unitEconomics: {
      // Одежду покупают не каждый месяц (в отличие от кофе) — частота ниже, отток выше:
      // конкуренция и скидки у похожих брендов легко переключают клиента.
      purchaseFrequencyPerMonth: 0.4,
      monthlyChurnRatePct: 25,
      manualCac: null,
      newCustomersCount: 260,
    },
    taxSettings: {
      regime: 'usn_income_minus_expenses',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 0,
    },
    accessSettings: {
      protectedRoutes: ['/app/finance', '/app/taxes', '/app/balance', '/app/debts', '/app/report'],
      ownerPin: '1234',
    },
  }
}
