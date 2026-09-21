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

function historicalMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.3),
    payroll: 500000,
    rent: 220000,
    marketing: Math.round(revenue * 0.062),
    logistics: 0,
    utilities: 0,
    software: 0,
    customExpenseLines: [{ id: 'other', label: 'Прочие расходы', amount: 170000 }],
    depreciation: 0,
    loanInterest: 0,
    taxes: Math.round(revenue * 0.0375),
    loanPayments: 50000,
    avgCheck,
    salesCount,
  }
}

export function createUrbanCoffeeDemo(): BusinessState {
  const businessId = DEMO_BUSINESS_ID

  return {
    profile: {
      id: businessId,
      name: 'Urban Coffee',
      type: 'cafe',
      currency: 'RUB',
      period: 'month',
      employeesCount: 8,
      createdAt: new Date().toISOString(),
    },
    financialInputs: {
      businessId,
      period: CURRENT_PERIOD,
      revenue: 2400000,
      cogs: 720000,
      payroll: 520000,
      rent: 220000,
      marketing: 150000,
      logistics: 0,
      utilities: 0,
      software: 0,
      customExpenseLines: [{ id: 'other', label: 'Прочие расходы', amount: 180000 }],
      depreciation: 0,
      loanInterest: 0,
      taxes: 90000,
      loanPayments: 50000,
      avgCheck: 850,
      salesCount: 2824,
    },
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      openingBalance: 350000,
      operating: {
        customerPayments: 2400000,
        supplierPayments: 720000,
        payroll: 520000,
        rent: 220000,
        marketing: 150000,
        taxes: 90000,
        otherOperating: 180000,
      },
      investing: {
        equipment: 60000,
        repairs: 15000,
        assetPurchases: 0,
      },
      financing: {
        loanReceived: 0,
        loanRepaid: 50000,
        ownerInvestment: 0,
        ownerWithdrawal: 100000,
      },
    },
    scenarios: STANDARD_SCENARIOS,
    forecastConfig: {
      ...DEFAULT_FORECAST_CONFIG,
      monthlyGrowthRatePct: 1.5,
      seasonality: [0.9, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.1, 1, 0.95, 0.95, 1.2],
    },
    aiHistory: [],
    onboardingComplete: true,
    history: [
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 2100000, 2530),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 2220000, 2660),
      historicalMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 2300000, 2760),
    ],
    targets: [
      { period: CURRENT_PERIOD, targetRevenue: 2500000, targetNetProfit: 550000, targetSalesCount: 2900 },
    ],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      currentAssets: { cash: 645000, receivables: 120000, inventory: 180000, other: 0 },
      nonCurrentAssets: { fixedAssets: 1400000, other: 0 },
      currentLiabilities: { payables: 210000, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 500000, other: 0 },
    },
    employees: [
      { id: 'emp1', name: 'Анна Смирнова', role: 'Управляющий', salary: 90000, hireDate: '2024-01-15' },
      { id: 'emp2', name: 'Мария Иванова', role: 'Бариста', salary: 70000, hireDate: '2024-02-01' },
      { id: 'emp3', name: 'Дмитрий Кузнецов', role: 'Бариста', salary: 70000, hireDate: '2024-03-10' },
      { id: 'emp4', name: 'Елена Попова', role: 'Бариста', salary: 70000, hireDate: '2024-05-20' },
      { id: 'emp5', name: 'Сергей Волков', role: 'Бариста', salary: 70000, hireDate: '2024-08-01' },
      { id: 'emp6', name: 'Ольга Соколова', role: 'Бариста', salary: 70000, hireDate: '2025-01-15' },
      { id: 'emp7', name: 'Игорь Морозов', role: 'Клинер', salary: 40000, hireDate: '2024-02-01' },
      { id: 'emp8', name: 'Наталья Лебедева', role: 'Клинер', salary: 40000, hireDate: '2024-06-01' },
    ],
    plannedHires: [],
    goals: [
      {
        id: 'goal1',
        title: 'Выручка 3 000 000 ₽ в месяц',
        metric: 'revenue',
        targetValue: 3000000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -6),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: 2400000,
      },
    ],
    unitEconomics: {
      purchaseFrequencyPerMonth: 3,
      monthlyChurnRatePct: 15,
      manualCac: null,
    },
  }
}
