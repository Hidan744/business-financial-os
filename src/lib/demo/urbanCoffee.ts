import type { BusinessState } from '@/lib/storage/repository'
import { DEFAULT_FORECAST_CONFIG, STANDARD_SCENARIOS } from '@/types/scenario'

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7)

export function createUrbanCoffeeDemo(): BusinessState {
  const businessId = 'demo_urban_coffee'

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
  }
}
