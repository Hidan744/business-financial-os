import type { BusinessState } from '@/lib/storage/repository'
import type { BusinessType } from '@/types/business'
import type { FinancialInputs } from '@/types/finance'
import type { Product, StockMovement } from '@/types/inventory'
import { DEFAULT_FORECAST_CONFIG, STANDARD_SCENARIOS } from '@/types/scenario'

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7)

// Фиксированный валидный UUID — id используется как первичный ключ (uuid) в Supabase,
// а фиксированное значение делает loadDemo() идемпотентным (повторный вызов, в том числе с
// другим businessType, обновляет один и тот же демо-слот, а не плодит дубликаты в списке).
const DEMO_BUSINESS_ID = '00000000-0000-4000-8000-000000000001'

function shiftPeriod(period: string, monthsBack: number): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 - monthsBack, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Дата N дней назад от сейчас — в отличие от периодов (месяц), движения склада привязаны
 * к реальным дням, чтобы демо оставалось живым (внутри окна расчёта расхода), когда бы его ни открыли. */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Та же логика, что и daysAgo, но в будущее — для сроков задач сотрудников. */
function daysFromNow(n: number): string {
  return daysAgo(-n)
}

/**
 * businessType выбирает ПОЛНОСТЬЮ отдельный датасет (своё название, цифры, товары, сотрудники,
 * задачи) — не только видимые разделы. Все 7 датасетов держатся на одном и том же
 * DEMO_BUSINESS_ID, поэтому выбор другого типа в пикере заменяет предыдущее демо, а не
 * добавляет ещё один бизнес в список.
 */
export function createDemoBusiness(businessType: BusinessType = 'retail'): BusinessState {
  switch (businessType) {
    case 'cafe':
      return buildCafeDemo()
    case 'ecommerce':
      return buildEcommerceDemo()
    case 'services':
      return buildServicesDemo()
    case 'agency':
      return buildAgencyDemo()
    case 'production':
      return buildProductionDemo()
    case 'other':
      return buildOtherDemo()
    case 'retail':
    default:
      return buildRetailDemo()
  }
}

// ============================================================================
// RETAIL — Nord Wear, магазин собственного бренда одежды
// ============================================================================

/**
 * Магазин собственного бренда одежды: выше себестоимость и реклама, чем у кафе (пошив
 * коллекций, продвижение бренда), ФОТ и аренда почти постоянны месяц к месяцу.
 */
function nordWearMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.45),
    variableOpex: Math.round(revenue * 0.03),
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
function buildRetailDemo(): BusinessState {
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
      variableOpex: 54000,
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
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 11), 2600000, 578),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 10), 2450000, 544),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 9), 2300000, 511),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 8), 2150000, 478),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 7), 2300000, 511),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 2500000, 556),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 2200000, 489),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 2000000, 444),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 1950000, 433),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 1900000, 422),
      nordWearMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 1850000, 411),
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
      {
        id: 'emp2',
        name: 'Максим Орлов',
        role: 'Продавец-консультант',
        salary: 60000,
        hireDate: '2023-06-15',
        pin: '2222',
        allowedRoutes: ['/app/hr'],
      },
      { id: 'emp3', name: 'Дарья Кузьмина', role: 'Продавец-консультант', salary: 60000, hireDate: '2024-01-10' },
      { id: 'emp4', name: 'Полина Егорова', role: 'Швея-технолог', salary: 65000, hireDate: '2023-09-01' },
      { id: 'emp5', name: 'Артём Николаев', role: 'Курьер', salary: 65000, hireDate: '2024-04-20' },
    ],
    plannedHires: [{ id: 'hire1', role: 'Маркетолог', salary: 70000, startPeriod: shiftPeriod(CURRENT_PERIOD, -3) }],
    employeeTasks: [
      {
        id: 'task1',
        employeeId: 'emp1',
        title: 'Сверить остатки склада с учётной системой',
        status: 'done',
        createdAt: `${daysAgo(20)}T09:00:00.000Z`,
        dueDate: daysAgo(14),
        completedAt: `${daysAgo(15)}T18:00:00.000Z`,
        attachments: [],
      },
      {
        id: 'task2',
        employeeId: 'emp1',
        title: 'Подготовить отчёт по итогам месяца для инвестора',
        description: 'P&L, cash flow, план на следующий месяц',
        status: 'open',
        createdAt: `${daysAgo(5)}T09:00:00.000Z`,
        dueDate: daysFromNow(2),
        attachments: [],
      },
      {
        id: 'task3',
        employeeId: 'emp2',
        title: 'Выложить новую коллекцию на витрину',
        status: 'done',
        createdAt: `${daysAgo(10)}T09:00:00.000Z`,
        dueDate: daysAgo(6),
        completedAt: `${daysAgo(7)}T15:00:00.000Z`,
        attachments: [],
      },
      {
        id: 'task4',
        employeeId: 'emp2',
        title: 'Провести переучёт кассы за неделю',
        status: 'open',
        createdAt: `${daysAgo(9)}T09:00:00.000Z`,
        dueDate: daysAgo(2),
        attachments: [],
      },
      {
        id: 'task5',
        employeeId: 'emp2',
        title: 'Обзвонить клиентов по брошенным корзинам',
        status: 'open',
        createdAt: `${daysAgo(2)}T09:00:00.000Z`,
        dueDate: daysFromNow(3),
        attachments: [],
      },
      {
        id: 'task6',
        employeeId: 'emp3',
        title: 'Обучить нового стажёра работе с кассой',
        status: 'open',
        createdAt: `${daysAgo(12)}T09:00:00.000Z`,
        dueDate: daysAgo(4),
        attachments: [],
      },
      {
        id: 'task7',
        employeeId: 'emp4',
        title: 'Пошить пробный образец для весенней коллекции',
        status: 'done',
        createdAt: `${daysAgo(18)}T09:00:00.000Z`,
        dueDate: daysAgo(10),
        completedAt: `${daysAgo(11)}T12:00:00.000Z`,
        attachments: [],
      },
      {
        id: 'task8',
        employeeId: 'emp4',
        title: 'Составить спецификацию тканей на следующую партию',
        status: 'done',
        createdAt: `${daysAgo(8)}T09:00:00.000Z`,
        dueDate: daysAgo(3),
        completedAt: `${daysAgo(1)}T12:00:00.000Z`,
        attachments: [],
      },
      {
        id: 'task9',
        employeeId: 'emp5',
        title: 'Развезти заказы по точкам самовывоза',
        status: 'open',
        createdAt: `${daysAgo(1)}T09:00:00.000Z`,
        dueDate: daysFromNow(1),
        attachments: [],
      },
    ],
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
      isVatPayer: true,
      vatRatePct: 20,
    },
    accessSettings: {
      protectedRoutes: ['/app/finance', '/app/taxes', '/app/balance', '/app/debts', '/app/report', '/app/hr'],
      ownerPin: '1234',
    },
    // Остаток считается по движениям, а не задаётся числом — специально оставлены все три
    // статуса сразу (ok/low/critical), чтобы страница «Склад» сразу показывала себя в деле:
    // футболки уже распроданы (0 на складе), худи серое и шапки — ниже порога, зимняя куртка —
    // залежавшийся товар прошлого сезона (тот самый «замороженный в запасах» капитал с Баланса).
    products: RETAIL_PRODUCTS,
    stockMovements: RETAIL_STOCK_MOVEMENTS,
  }
}

const RETAIL_PRODUCTS: Product[] = [
  { id: 'prod1', name: 'Худи чёрное', sku: 'HD-001', unit: 'шт', minStockLevel: 30, costPerUnit: 1800 },
  { id: 'prod2', name: 'Худи серое', sku: 'HD-002', unit: 'шт', minStockLevel: 30, costPerUnit: 1800 },
  { id: 'prod3', name: 'Футболка базовая', sku: 'TS-010', unit: 'шт', minStockLevel: 50, costPerUnit: 900 },
  { id: 'prod4', name: 'Куртка зимняя (прошлый сезон)', sku: 'JK-005', unit: 'шт', minStockLevel: 10, costPerUnit: 4500 },
  { id: 'prod5', name: 'Шапка вязаная', sku: 'CP-020', unit: 'шт', minStockLevel: 40, costPerUnit: 650 },
]

const RETAIL_STOCK_MOVEMENTS: StockMovement[] = [
  // Худи чёрное — остаток 50 шт, продажи ровные, статус ok
  { id: 'stk1', productId: 'prod1', date: daysAgo(45), type: 'receipt', quantity: 200, costPerUnit: 1800, note: 'Пошив партии' },
  { id: 'stk2', productId: 'prod1', date: daysAgo(20), type: 'sale', quantity: 90 },
  { id: 'stk3', productId: 'prod1', date: daysAgo(5), type: 'sale', quantity: 60 },
  // Худи серое — остаток 15 шт при пороге 30, статус low
  { id: 'stk4', productId: 'prod2', date: daysAgo(45), type: 'receipt', quantity: 100, costPerUnit: 1800, note: 'Пошив партии' },
  { id: 'stk5', productId: 'prod2', date: daysAgo(18), type: 'sale', quantity: 50 },
  { id: 'stk6', productId: 'prod2', date: daysAgo(6), type: 'sale', quantity: 35 },
  // Футболка базовая — распродана, остаток 0, статус critical
  { id: 'stk7', productId: 'prod3', date: daysAgo(60), type: 'receipt', quantity: 120, costPerUnit: 900, note: 'Пошив партии' },
  { id: 'stk8', productId: 'prod3', date: daysAgo(19), type: 'sale', quantity: 70 },
  { id: 'stk9', productId: 'prod3', date: daysAgo(3), type: 'sale', quantity: 50 },
  // Куртка зимняя — 135 шт залежались, продаётся медленно, статус ok (но деньги заморожены)
  { id: 'stk10', productId: 'prod4', date: daysAgo(90), type: 'receipt', quantity: 150, costPerUnit: 4500, note: 'Закупка на сезон' },
  { id: 'stk11', productId: 'prod4', date: daysAgo(15), type: 'sale', quantity: 15 },
  // Шапка вязаная — остаток 25 шт при пороге 40, статус low
  { id: 'stk12', productId: 'prod5', date: daysAgo(40), type: 'receipt', quantity: 80, costPerUnit: 650, note: 'Пошив партии' },
  { id: 'stk13', productId: 'prod5', date: daysAgo(17), type: 'sale', quantity: 30 },
  { id: 'stk14', productId: 'prod5', date: daysAgo(4), type: 'sale', quantity: 25 },
]

// ============================================================================
// CAFE — «Полдень», кофейня. Здоровый, растущий бизнес — контраст кризису Nord Wear.
// ============================================================================

function cafeMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.32),
    variableOpex: Math.round(revenue * 0.02),
    payroll: 280000,
    rent: 150000,
    marketing: 25000,
    logistics: 15000,
    utilities: 35000,
    software: 8000,
    customExpenseLines: [{ id: 'maintenance', label: 'Клининг и обслуживание оборудования', amount: 20000 }],
    depreciation: 15000,
    loanInterest: 0,
    taxes: Math.round(revenue * 0.023),
    loanPayments: 0,
    avgCheck,
    salesCount,
  }
}

function buildCafeDemo(): BusinessState {
  const businessId = DEMO_BUSINESS_ID
  return {
    profile: {
      id: businessId,
      name: 'Кафе «Полдень»',
      type: 'cafe',
      currency: 'RUB',
      period: 'month',
      employeesCount: 4,
      createdAt: new Date().toISOString(),
    },
    financialInputs: cafeMonth(businessId, CURRENT_PERIOD, 950000, 2500),
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      openingBalance: 220000,
      operating: {
        customerPayments: 940000,
        supplierPayments: 300000,
        payroll: 280000,
        rent: 150000,
        marketing: 25000,
        taxes: 22000,
        otherOperating: 97000,
      },
      investing: { equipment: 10000, repairs: 5000, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 0, ownerWithdrawal: 40000 },
    },
    scenarios: STANDARD_SCENARIOS,
    forecastConfig: DEFAULT_FORECAST_CONFIG,
    aiHistory: [],
    onboardingComplete: true,
    history: [
      cafeMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 740000, 1950),
      cafeMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 780000, 2050),
      cafeMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 810000, 2130),
      cafeMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 850000, 2240),
      cafeMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 880000, 2320),
      cafeMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 910000, 2400),
    ],
    targets: [{ period: CURRENT_PERIOD, targetRevenue: 1050000, targetNetProfit: 100000, targetSalesCount: 2760 }],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      currentAssets: { cash: 231000, receivables: 5000, inventory: 60000, other: 0 },
      nonCurrentAssets: { fixedAssets: 380000, other: 0 },
      currentLiabilities: { payables: 45000, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
    },
    balanceSheetHistory: [
      {
        businessId,
        period: shiftPeriod(CURRENT_PERIOD, 1),
        currentAssets: { cash: 220000, receivables: 6000, inventory: 55000, other: 0 },
        nonCurrentAssets: { fixedAssets: 390000, other: 0 },
        currentLiabilities: { payables: 40000, shortTermDebt: 0, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
      },
    ],
    employees: [
      { id: 'cemp1', name: 'Ольга Смирнова', role: 'Управляющая кофейней', salary: 100000, hireDate: '2022-11-01', pin: '1111', allowedRoutes: ['/app/finance', '/app/taxes', '/app/balance', '/app/report'] },
      { id: 'cemp2', name: 'Артём Быков', role: 'Бариста', salary: 55000, hireDate: '2023-05-10' },
      { id: 'cemp3', name: 'Ксения Лаврова', role: 'Бариста', salary: 55000, hireDate: '2023-08-15' },
      { id: 'cemp4', name: 'Николай Реутов', role: 'Кондитер', salary: 70000, hireDate: '2024-02-01' },
    ],
    plannedHires: [],
    employeeTasks: [
      {
        id: 'ctask1',
        employeeId: 'cemp1',
        title: 'Проверить кассовую дисциплину за неделю',
        status: 'done',
        createdAt: `${daysAgo(10)}T09:00:00.000Z`,
        dueDate: daysAgo(6),
        completedAt: `${daysAgo(6)}T18:00:00.000Z`,
        attachments: [],
      },
      {
        id: 'ctask2',
        employeeId: 'cemp1',
        title: 'Заказать зерно и молоко на следующую неделю',
        status: 'open',
        createdAt: `${daysAgo(2)}T09:00:00.000Z`,
        dueDate: daysFromNow(1),
        attachments: [],
      },
      {
        id: 'ctask3',
        employeeId: 'cemp2',
        title: 'Обучить нового бариста работе с кофемашиной',
        status: 'open',
        createdAt: `${daysAgo(4)}T09:00:00.000Z`,
        dueDate: daysFromNow(3),
        attachments: [],
      },
      {
        id: 'ctask4',
        employeeId: 'cemp4',
        title: 'Сдать рецептуру нового сезонного десерта',
        status: 'done',
        createdAt: `${daysAgo(9)}T09:00:00.000Z`,
        dueDate: daysAgo(2),
        completedAt: `${daysAgo(3)}T12:00:00.000Z`,
        attachments: [],
      },
    ],
    goals: [
      {
        id: 'cgoal1',
        title: 'Стабильные 100 000 ₽ чистой прибыли в месяц',
        metric: 'netProfit',
        targetValue: 100000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -3),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: 57000,
      },
    ],
    unitEconomics: { purchaseFrequencyPerMonth: 8, monthlyChurnRatePct: 15, manualCac: null, newCustomersCount: 150 },
    taxSettings: {
      regime: 'patent',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 180000,
      isVatPayer: false,
      vatRatePct: 20,
    },
    accessSettings: { protectedRoutes: ['/app/finance', '/app/taxes', '/app/balance', '/app/report'], ownerPin: '1234' },
    products: CAFE_PRODUCTS,
    stockMovements: CAFE_STOCK_MOVEMENTS,
  }
}

const CAFE_PRODUCTS: Product[] = [
  { id: 'cprod1', name: 'Зёрна арабика', sku: 'CF-001', unit: 'кг', minStockLevel: 10, costPerUnit: 1400 },
  { id: 'cprod2', name: 'Молоко', sku: 'MK-002', unit: 'л', minStockLevel: 40, costPerUnit: 90 },
  { id: 'cprod3', name: 'Стаканы бумажные', sku: 'CUP-003', unit: 'шт', minStockLevel: 500, costPerUnit: 6 },
  { id: 'cprod4', name: 'Сироп ванильный', sku: 'SYR-004', unit: 'бут.', minStockLevel: 5, costPerUnit: 550 },
]

const CAFE_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'cstk1', productId: 'cprod1', date: daysAgo(20), type: 'receipt', quantity: 40, costPerUnit: 1400, note: 'Поставка зерна' },
  { id: 'cstk2', productId: 'cprod1', date: daysAgo(8), type: 'sale', quantity: 22 },
  { id: 'cstk3', productId: 'cprod1', date: daysAgo(2), type: 'sale', quantity: 10 },
  { id: 'cstk4', productId: 'cprod2', date: daysAgo(6), type: 'receipt', quantity: 120, costPerUnit: 90, note: 'Поставка молока' },
  { id: 'cstk5', productId: 'cprod2', date: daysAgo(3), type: 'sale', quantity: 90 },
  { id: 'cstk6', productId: 'cprod3', date: daysAgo(25), type: 'receipt', quantity: 2000, costPerUnit: 6, note: 'Закупка стаканов' },
  { id: 'cstk7', productId: 'cprod3', date: daysAgo(5), type: 'sale', quantity: 1550 },
  { id: 'cstk8', productId: 'cprod4', date: daysAgo(30), type: 'receipt', quantity: 8, costPerUnit: 550, note: 'Закупка сиропа' },
  { id: 'cstk9', productId: 'cprod4', date: daysAgo(4), type: 'sale', quantity: 4 },
]

// ============================================================================
// ECOMMERCE — «БерриБокс», интернет-магазин товаров для дома. Тонкая маржа,
// съедаемая рекламой — типичная боль ecommerce.
// ============================================================================

function ecommerceMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.5),
    variableOpex: Math.round(revenue * 0.05),
    payroll: 180000,
    rent: 60000,
    marketing: Math.round(revenue * 0.13),
    logistics: Math.round(revenue * 0.05),
    utilities: 8000,
    software: 20000,
    customExpenseLines: [{ id: 'packaging', label: 'Упаковка и комиссии маркетплейсов', amount: 40000 }],
    depreciation: 5000,
    loanInterest: 0,
    taxes: Math.round(revenue * 0.06),
    loanPayments: 0,
    avgCheck,
    salesCount,
  }
}

function buildEcommerceDemo(): BusinessState {
  const businessId = DEMO_BUSINESS_ID
  return {
    profile: {
      id: businessId,
      name: 'БерриБокс',
      type: 'ecommerce',
      currency: 'RUB',
      period: 'month',
      employeesCount: 2,
      createdAt: new Date().toISOString(),
    },
    financialInputs: ecommerceMonth(businessId, CURRENT_PERIOD, 1400000, 438),
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      openingBalance: 150000,
      operating: {
        customerPayments: 1380000,
        supplierPayments: 720000,
        payroll: 180000,
        rent: 60000,
        marketing: 180000,
        taxes: 84000,
        otherOperating: 213000,
      },
      investing: { equipment: 15000, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 50000, ownerWithdrawal: 0 },
    },
    scenarios: STANDARD_SCENARIOS,
    forecastConfig: DEFAULT_FORECAST_CONFIG,
    aiHistory: [],
    onboardingComplete: true,
    history: [
      ecommerceMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 1050000, 328),
      ecommerceMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 1150000, 359),
      ecommerceMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 1220000, 381),
      ecommerceMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 1280000, 400),
      ecommerceMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 1330000, 416),
      ecommerceMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 1370000, 428),
    ],
    targets: [{ period: CURRENT_PERIOD, targetRevenue: 1600000, targetNetProfit: 150000, targetSalesCount: 500 }],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      currentAssets: { cash: 128000, receivables: 20000, inventory: 420000, other: 0 },
      nonCurrentAssets: { fixedAssets: 60000, other: 0 },
      currentLiabilities: { payables: 180000, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
    },
    balanceSheetHistory: [
      {
        businessId,
        period: shiftPeriod(CURRENT_PERIOD, 1),
        currentAssets: { cash: 150000, receivables: 18000, inventory: 400000, other: 0 },
        nonCurrentAssets: { fixedAssets: 63000, other: 0 },
        currentLiabilities: { payables: 170000, shortTermDebt: 0, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
      },
    ],
    employees: [
      { id: 'eemp1', name: 'Ольга Петрова', role: 'Менеджер по маркетплейсам', salary: 110000, hireDate: '2023-04-01', pin: '1111', allowedRoutes: ['/app/finance', '/app/report'] },
      { id: 'eemp2', name: 'Денис Швец', role: 'Кладовщик', salary: 70000, hireDate: '2023-09-10' },
    ],
    plannedHires: [],
    employeeTasks: [
      { id: 'etask1', employeeId: 'eemp1', title: 'Обновить карточки товаров на маркетплейсе', status: 'open', createdAt: `${daysAgo(3)}T09:00:00.000Z`, dueDate: daysFromNow(2), attachments: [] },
      { id: 'etask2', employeeId: 'eemp1', title: 'Проверить эффективность рекламных ставок', status: 'done', createdAt: `${daysAgo(8)}T09:00:00.000Z`, dueDate: daysAgo(4), completedAt: `${daysAgo(4)}T17:00:00.000Z`, attachments: [] },
      { id: 'etask3', employeeId: 'eemp2', title: 'Собрать заказы за сегодня', status: 'open', createdAt: `${daysAgo(1)}T09:00:00.000Z`, dueDate: daysFromNow(0), attachments: [] },
      { id: 'etask4', employeeId: 'eemp2', title: 'Провести инвентаризацию склада', status: 'done', createdAt: `${daysAgo(15)}T09:00:00.000Z`, dueDate: daysAgo(10), completedAt: `${daysAgo(10)}T16:00:00.000Z`, attachments: [] },
    ],
    goals: [
      {
        id: 'egoal1',
        title: 'Выйти в стабильный плюс по чистой прибыли',
        metric: 'netProfit',
        targetValue: 150000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -4),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: -17000,
      },
    ],
    unitEconomics: { purchaseFrequencyPerMonth: 0.3, monthlyChurnRatePct: 40, manualCac: null, newCustomersCount: 310 },
    taxSettings: {
      regime: 'usn_income',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 0,
      isVatPayer: false,
      vatRatePct: 20,
    },
    accessSettings: { protectedRoutes: ['/app/finance', '/app/report'], ownerPin: '1234' },
    products: ECOMMERCE_PRODUCTS,
    stockMovements: ECOMMERCE_STOCK_MOVEMENTS,
  }
}

const ECOMMERCE_PRODUCTS: Product[] = [
  { id: 'eprod1', name: 'Плед вязаный', sku: 'PL-001', unit: 'шт', minStockLevel: 20, costPerUnit: 1200 },
  { id: 'eprod2', name: 'Набор кухонных полотенец', sku: 'KT-002', unit: 'компл.', minStockLevel: 40, costPerUnit: 350 },
  { id: 'eprod3', name: 'Аромасвеча', sku: 'CN-003', unit: 'шт', minStockLevel: 60, costPerUnit: 280 },
  { id: 'eprod4', name: 'Органайзер для хранения', sku: 'OR-004', unit: 'шт', minStockLevel: 25, costPerUnit: 650 },
]

const ECOMMERCE_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'estk1', productId: 'eprod1', date: daysAgo(35), type: 'receipt', quantity: 80, costPerUnit: 1200, note: 'Закупка партии' },
  { id: 'estk2', productId: 'eprod1', date: daysAgo(12), type: 'sale', quantity: 45 },
  { id: 'estk3', productId: 'eprod1', date: daysAgo(3), type: 'sale', quantity: 20 },
  { id: 'estk4', productId: 'eprod2', date: daysAgo(28), type: 'receipt', quantity: 150, costPerUnit: 350, note: 'Закупка партии' },
  { id: 'estk5', productId: 'eprod2', date: daysAgo(9), type: 'sale', quantity: 100 },
  { id: 'estk6', productId: 'eprod3', date: daysAgo(50), type: 'receipt', quantity: 200, costPerUnit: 280, note: 'Закупка партии' },
  { id: 'estk7', productId: 'eprod3', date: daysAgo(20), type: 'sale', quantity: 140 },
  { id: 'estk8', productId: 'eprod3', date: daysAgo(5), type: 'sale', quantity: 55 },
  { id: 'estk9', productId: 'eprod4', date: daysAgo(15), type: 'receipt', quantity: 60, costPerUnit: 650, note: 'Закупка партии' },
  { id: 'estk10', productId: 'eprod4', date: daysAgo(2), type: 'sale', quantity: 33 },
]

// ============================================================================
// SERVICES — «Студия Лекс», юридический консалтинг. Стабильный, здоровый бизнес
// без склада и без долгов.
// ============================================================================

function servicesMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.12),
    variableOpex: Math.round(revenue * 0.01),
    payroll: 220000,
    rent: 70000,
    marketing: 45000,
    logistics: 0,
    utilities: 10000,
    software: 18000,
    customExpenseLines: [{ id: 'subs', label: 'Подписки на юридические базы', amount: 15000 }],
    depreciation: 5000,
    loanInterest: 0,
    taxes: Math.round(revenue * 0.06),
    loanPayments: 0,
    avgCheck,
    salesCount,
  }
}

function buildServicesDemo(): BusinessState {
  const businessId = DEMO_BUSINESS_ID
  return {
    profile: {
      id: businessId,
      name: 'Студия Лекс',
      type: 'services',
      currency: 'RUB',
      period: 'month',
      employeesCount: 3,
      createdAt: new Date().toISOString(),
    },
    financialInputs: servicesMonth(businessId, CURRENT_PERIOD, 620000, 18),
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      openingBalance: 300000,
      operating: {
        customerPayments: 610000,
        supplierPayments: 70000,
        payroll: 220000,
        rent: 70000,
        marketing: 45000,
        taxes: 37000,
        otherOperating: 54000,
      },
      investing: { equipment: 5000, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 0, ownerWithdrawal: 90000 },
    },
    scenarios: STANDARD_SCENARIOS,
    forecastConfig: DEFAULT_FORECAST_CONFIG,
    aiHistory: [],
    onboardingComplete: true,
    history: [
      servicesMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 520000, 16),
      servicesMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 540000, 16),
      servicesMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 560000, 17),
      servicesMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 580000, 17),
      servicesMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 595000, 18),
      servicesMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 610000, 18),
    ],
    targets: [{ period: CURRENT_PERIOD, targetRevenue: 800000, targetNetProfit: 160000, targetSalesCount: 24 }],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      currentAssets: { cash: 319000, receivables: 60000, inventory: 0, other: 0 },
      nonCurrentAssets: { fixedAssets: 120000, other: 0 },
      currentLiabilities: { payables: 15000, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
    },
    balanceSheetHistory: [
      {
        businessId,
        period: shiftPeriod(CURRENT_PERIOD, 1),
        currentAssets: { cash: 300000, receivables: 55000, inventory: 0, other: 0 },
        nonCurrentAssets: { fixedAssets: 123000, other: 0 },
        currentLiabilities: { payables: 12000, shortTermDebt: 0, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
      },
    ],
    employees: [
      { id: 'semp1', name: 'Алексей Лебедев', role: 'Ведущий консультант', salary: 120000, hireDate: '2022-09-01', pin: '1111', allowedRoutes: ['/app/finance', '/app/report'] },
      { id: 'semp2', name: 'Мария Гринёва', role: 'Консультант', salary: 80000, hireDate: '2023-06-01' },
      { id: 'semp3', name: 'Дарья Носова', role: 'Ассистент', salary: 20000, hireDate: '2024-03-15' },
    ],
    plannedHires: [],
    employeeTasks: [
      { id: 'stask1', employeeId: 'semp1', title: 'Подготовить договор для нового клиента', status: 'open', createdAt: `${daysAgo(3)}T09:00:00.000Z`, dueDate: daysFromNow(2), attachments: [] },
      { id: 'stask2', employeeId: 'semp1', title: 'Провести консультацию по сделке', status: 'done', createdAt: `${daysAgo(7)}T09:00:00.000Z`, dueDate: daysAgo(3), completedAt: `${daysAgo(3)}T16:00:00.000Z`, attachments: [] },
      { id: 'stask3', employeeId: 'semp2', title: 'Сдать отчёт по проекту клиенту', status: 'done', createdAt: `${daysAgo(9)}T09:00:00.000Z`, dueDate: daysAgo(5), completedAt: `${daysAgo(5)}T14:00:00.000Z`, attachments: [] },
      { id: 'stask4', employeeId: 'semp2', title: 'Обновить шаблоны документов', status: 'open', createdAt: `${daysAgo(2)}T09:00:00.000Z`, dueDate: daysFromNow(4), attachments: [] },
    ],
    goals: [
      {
        id: 'sgoal1',
        title: 'Выйти на выручку 800 000 ₽ в месяц',
        metric: 'revenue',
        targetValue: 800000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -5),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: 620000,
      },
    ],
    unitEconomics: { purchaseFrequencyPerMonth: 0.15, monthlyChurnRatePct: 20, manualCac: null, newCustomersCount: 6 },
    taxSettings: {
      regime: 'usn_income',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 0,
      isVatPayer: false,
      vatRatePct: 20,
    },
    accessSettings: { protectedRoutes: ['/app/finance', '/app/report'], ownerPin: '1234' },
    products: [],
    stockMovements: [],
  }
}

// ============================================================================
// AGENCY — «Pixel & Co», digital-агентство. Прибыльна на бумаге, но зажата по
// деньгам — клиенты платят с отсрочкой. Показывает разрыв между прибылью и кэшем.
// ============================================================================

function agencyMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.3),
    variableOpex: Math.round(revenue * 0.02),
    payroll: 380000,
    rent: 90000,
    marketing: 60000,
    logistics: 0,
    utilities: 12000,
    software: 35000,
    customExpenseLines: [{ id: 'freelance', label: 'Оплата фрилансеров сверх штата', amount: 70000 }],
    depreciation: 10000,
    loanInterest: 0,
    taxes: Math.round(revenue * 0.035),
    loanPayments: 0,
    avgCheck,
    salesCount,
  }
}

function buildAgencyDemo(): BusinessState {
  const businessId = DEMO_BUSINESS_ID
  return {
    profile: {
      id: businessId,
      name: 'Pixel & Co',
      type: 'agency',
      currency: 'RUB',
      period: 'month',
      employeesCount: 5,
      createdAt: new Date().toISOString(),
    },
    financialInputs: agencyMonth(businessId, CURRENT_PERIOD, 1150000, 10),
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      // Клиенты выставленные счета оплачивают позже, чем закрывается период — customerPayments
      // заметно меньше revenue. Это намеренно: прибыль есть на бумаге, а денег на счету мало.
      openingBalance: 180000,
      operating: {
        customerPayments: 950000,
        supplierPayments: 415000,
        payroll: 380000,
        rent: 90000,
        marketing: 60000,
        taxes: 40000,
        otherOperating: 80000,
      },
      investing: { equipment: 10000, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 0, ownerWithdrawal: 0 },
    },
    scenarios: STANDARD_SCENARIOS,
    forecastConfig: DEFAULT_FORECAST_CONFIG,
    aiHistory: [],
    onboardingComplete: true,
    history: [
      agencyMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 950000, 8),
      agencyMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 1000000, 9),
      agencyMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 1050000, 9),
      agencyMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 1080000, 9),
      agencyMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 1100000, 10),
      agencyMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 1130000, 10),
    ],
    targets: [{ period: CURRENT_PERIOD, targetRevenue: 1300000, targetNetProfit: 200000, targetSalesCount: 11 }],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      // Дебиторка (310 000 ₽) — главная причина разрыва между прибылью и кэшем: клиенты ещё
      // не заплатили по выставленным счетам.
      currentAssets: { cash: 55000, receivables: 310000, inventory: 0, other: 0 },
      nonCurrentAssets: { fixedAssets: 150000, other: 0 },
      currentLiabilities: { payables: 95000, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
    },
    balanceSheetHistory: [
      {
        businessId,
        period: shiftPeriod(CURRENT_PERIOD, 1),
        currentAssets: { cash: 180000, receivables: 260000, inventory: 0, other: 0 },
        nonCurrentAssets: { fixedAssets: 158000, other: 0 },
        currentLiabilities: { payables: 85000, shortTermDebt: 0, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
      },
    ],
    employees: [
      { id: 'aemp1', name: 'Виктория Орлова', role: 'Директор по работе с клиентами', salary: 110000, hireDate: '2022-06-01', pin: '1111', allowedRoutes: ['/app/finance', '/app/balance', '/app/report'] },
      { id: 'aemp2', name: 'Тимур Ахметов', role: 'Арт-директор', salary: 100000, hireDate: '2022-08-15' },
      { id: 'aemp3', name: 'Светлана Быкова', role: 'SMM-менеджер', salary: 70000, hireDate: '2023-03-01' },
      { id: 'aemp4', name: 'Павел Григорьев', role: 'Таргетолог', salary: 60000, hireDate: '2023-07-10' },
      { id: 'aemp5', name: 'Анна Кузнецова', role: 'Проджект-менеджер', salary: 40000, hireDate: '2024-01-20' },
    ],
    plannedHires: [],
    employeeTasks: [
      { id: 'atask1', employeeId: 'aemp1', title: 'Дожать оплату по счёту клиента «Норд»', status: 'open', createdAt: `${daysAgo(6)}T09:00:00.000Z`, dueDate: daysFromNow(1), attachments: [] },
      { id: 'atask2', employeeId: 'aemp1', title: 'Провести встречу с новым клиентом', status: 'done', createdAt: `${daysAgo(10)}T09:00:00.000Z`, dueDate: daysAgo(5), completedAt: `${daysAgo(5)}T15:00:00.000Z`, attachments: [] },
      { id: 'atask3', employeeId: 'aemp2', title: 'Утвердить дизайн-концепцию для кампании', status: 'done', createdAt: `${daysAgo(8)}T09:00:00.000Z`, dueDate: daysAgo(4), completedAt: `${daysAgo(4)}T18:00:00.000Z`, attachments: [] },
      { id: 'atask4', employeeId: 'aemp2', title: 'Собрать портфолио последних кейсов', status: 'open', createdAt: `${daysAgo(3)}T09:00:00.000Z`, dueDate: daysFromNow(5), attachments: [] },
      { id: 'atask5', employeeId: 'aemp3', title: 'Опубликовать контент-план на неделю', status: 'open', createdAt: `${daysAgo(1)}T09:00:00.000Z`, dueDate: daysFromNow(0), attachments: [] },
    ],
    goals: [
      {
        id: 'agoal1',
        title: 'Прибыль 200 000 ₽ в месяц стабильно',
        metric: 'netProfit',
        targetValue: 200000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -4),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: 85000,
      },
    ],
    unitEconomics: { purchaseFrequencyPerMonth: 0.08, monthlyChurnRatePct: 12, manualCac: null, newCustomersCount: 2 },
    taxSettings: {
      regime: 'usn_income_minus_expenses',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 0,
      isVatPayer: false,
      vatRatePct: 20,
    },
    accessSettings: { protectedRoutes: ['/app/finance', '/app/balance', '/app/report'], ownerPin: '1234' },
    products: [],
    stockMovements: [],
  }
}

// ============================================================================
// PRODUCTION — «УралДеталь», малое металлообрабатывающее производство.
// Прибыльна, но закредитована под оборудование — долговая нагрузка в деле.
// ============================================================================

function productionMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.52),
    variableOpex: Math.round(revenue * 0.03),
    payroll: 620000,
    rent: 180000,
    marketing: 0,
    logistics: 90000,
    utilities: 140000,
    software: 20000,
    customExpenseLines: [{ id: 'maintenance', label: 'Обслуживание и ремонт станков', amount: 85000 }],
    depreciation: 95000,
    loanInterest: 60000,
    taxes: Math.round(revenue * 0.02),
    loanPayments: 150000,
    avgCheck,
    salesCount,
  }
}

function buildProductionDemo(): BusinessState {
  const businessId = DEMO_BUSINESS_ID
  return {
    profile: {
      id: businessId,
      name: 'УралДеталь',
      type: 'production',
      currency: 'RUB',
      period: 'month',
      employeesCount: 6,
      createdAt: new Date().toISOString(),
    },
    financialInputs: productionMonth(businessId, CURRENT_PERIOD, 3400000, 20),
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      openingBalance: 450000,
      operating: {
        customerPayments: 3200000,
        supplierPayments: 1800000,
        payroll: 620000,
        rent: 180000,
        marketing: 0,
        taxes: 68000,
        otherOperating: 437000,
      },
      investing: { equipment: 150000, repairs: 20000, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 150000, ownerInvestment: 0, ownerWithdrawal: 80000 },
    },
    scenarios: STANDARD_SCENARIOS,
    forecastConfig: DEFAULT_FORECAST_CONFIG,
    aiHistory: [],
    onboardingComplete: true,
    history: [
      productionMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 3000000, 18),
      productionMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 3080000, 18),
      productionMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 3150000, 19),
      productionMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 3220000, 19),
      productionMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 3280000, 19),
      productionMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 3340000, 20),
    ],
    targets: [{ period: CURRENT_PERIOD, targetRevenue: 3700000, targetNetProfit: 220000, targetSalesCount: 22 }],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      currentAssets: { cash: 145000, receivables: 420000, inventory: 980000, other: 0 },
      nonCurrentAssets: { fixedAssets: 2400000, other: 0 },
      currentLiabilities: { payables: 380000, shortTermDebt: 120000, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 1600000, other: 0 },
    },
    balanceSheetHistory: [
      {
        businessId,
        period: shiftPeriod(CURRENT_PERIOD, 1),
        currentAssets: { cash: 450000, receivables: 380000, inventory: 920000, other: 0 },
        nonCurrentAssets: { fixedAssets: 2450000, other: 0 },
        currentLiabilities: { payables: 340000, shortTermDebt: 120000, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 1750000, other: 0 },
      },
    ],
    employees: [
      { id: 'pemp1', name: 'Игорь Соколов', role: 'Директор производства', salary: 150000, hireDate: '2021-02-01', pin: '1111', allowedRoutes: ['/app/finance', '/app/taxes', '/app/balance', '/app/debts', '/app/report'] },
      { id: 'pemp2', name: 'Роман Дегтярёв', role: 'Начальник цеха', salary: 110000, hireDate: '2021-05-10' },
      { id: 'pemp3', name: 'Виктор Кузьмин', role: 'Токарь', salary: 85000, hireDate: '2022-01-15' },
      { id: 'pemp4', name: 'Сергей Панин', role: 'Токарь', salary: 85000, hireDate: '2022-04-01' },
      { id: 'pemp5', name: 'Наталья Ивлева', role: 'Технолог', salary: 95000, hireDate: '2022-09-01' },
      { id: 'pemp6', name: 'Максим Волков', role: 'Слесарь', salary: 95000, hireDate: '2023-02-20' },
    ],
    plannedHires: [],
    employeeTasks: [
      { id: 'ptask1', employeeId: 'pemp1', title: 'Согласовать поставку металла на следующий месяц', status: 'open', createdAt: `${daysAgo(4)}T09:00:00.000Z`, dueDate: daysFromNow(3), attachments: [] },
      { id: 'ptask2', employeeId: 'pemp1', title: 'Провести совещание по срокам крупного заказа', status: 'done', createdAt: `${daysAgo(9)}T09:00:00.000Z`, dueDate: daysAgo(5), completedAt: `${daysAgo(5)}T17:00:00.000Z`, attachments: [] },
      { id: 'ptask3', employeeId: 'pemp2', title: 'Проверить выполнение плана цеха за неделю', status: 'open', createdAt: `${daysAgo(2)}T09:00:00.000Z`, dueDate: daysFromNow(1), attachments: [] },
      { id: 'ptask4', employeeId: 'pemp3', title: 'Сдать партию кронштейнов заказчику', status: 'done', createdAt: `${daysAgo(7)}T09:00:00.000Z`, dueDate: daysAgo(2), completedAt: `${daysAgo(2)}T14:00:00.000Z`, attachments: [] },
    ],
    goals: [
      {
        id: 'pgoal1',
        title: 'EBITDA 400 000 ₽ в месяц',
        metric: 'ebitda',
        targetValue: 400000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -5),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: 350000,
      },
    ],
    unitEconomics: { purchaseFrequencyPerMonth: 0.05, monthlyChurnRatePct: 8, manualCac: null, newCustomersCount: 2 },
    taxSettings: {
      regime: 'osn',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 0,
      isVatPayer: true,
      vatRatePct: 20,
    },
    accessSettings: { protectedRoutes: ['/app/finance', '/app/taxes', '/app/balance', '/app/debts', '/app/report'], ownerPin: '1234' },
    products: PRODUCTION_PRODUCTS,
    stockMovements: PRODUCTION_STOCK_MOVEMENTS,
  }
}

const PRODUCTION_PRODUCTS: Product[] = [
  { id: 'pprod1', name: 'Лист стальной 2мм', sku: 'ST-001', unit: 'кг', minStockLevel: 200, costPerUnit: 85 },
  { id: 'pprod2', name: 'Труба профильная 40x40', sku: 'PR-002', unit: 'м', minStockLevel: 150, costPerUnit: 210 },
  { id: 'pprod3', name: 'Крепёж (комплект)', sku: 'FX-003', unit: 'компл.', minStockLevel: 500, costPerUnit: 25 },
  { id: 'pprod4', name: 'Кронштейны готовые', sku: 'BR-004', unit: 'шт', minStockLevel: 100, costPerUnit: 340 },
]

const PRODUCTION_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'pstk1', productId: 'pprod1', date: daysAgo(25), type: 'receipt', quantity: 800, costPerUnit: 85, note: 'Поставка металла' },
  { id: 'pstk2', productId: 'pprod1', date: daysAgo(10), type: 'sale', quantity: 450 },
  { id: 'pstk3', productId: 'pprod1', date: daysAgo(2), type: 'sale', quantity: 200 },
  { id: 'pstk4', productId: 'pprod2', date: daysAgo(30), type: 'receipt', quantity: 500, costPerUnit: 210, note: 'Поставка трубы' },
  { id: 'pstk5', productId: 'pprod2', date: daysAgo(8), type: 'sale', quantity: 280 },
  { id: 'pstk6', productId: 'pprod3', date: daysAgo(20), type: 'receipt', quantity: 2000, costPerUnit: 25, note: 'Закупка крепежа' },
  { id: 'pstk7', productId: 'pprod3', date: daysAgo(5), type: 'sale', quantity: 1400 },
  { id: 'pstk8', productId: 'pprod4', date: daysAgo(15), type: 'receipt', quantity: 220, costPerUnit: 340, note: 'Готовая партия' },
  { id: 'pstk9', productId: 'pprod4', date: daysAgo(3), type: 'sale', quantity: 130 },
]

// ============================================================================
// OTHER — самозанятый фотограф. Минимальный бизнес без команды и без склада —
// показывает упрощённый режим для самозанятых (isSelfEmployed).
// ============================================================================

function otherMonth(businessId: string, period: string, revenue: number, salesCount: number): FinancialInputs {
  const avgCheck = Math.round(revenue / salesCount)
  return {
    businessId,
    period,
    revenue,
    cogs: Math.round(revenue * 0.08),
    variableOpex: 0,
    payroll: 0,
    rent: 20000,
    marketing: 15000,
    logistics: 0,
    utilities: 0,
    software: 5000,
    customExpenseLines: [{ id: 'gear_rent', label: 'Аренда доп. оборудования на съёмки', amount: 8000 }],
    depreciation: 8000,
    loanInterest: 0,
    taxes: Math.round(revenue * 0.06),
    loanPayments: 0,
    avgCheck,
    salesCount,
  }
}

function buildOtherDemo(): BusinessState {
  const businessId = DEMO_BUSINESS_ID
  return {
    profile: {
      id: businessId,
      name: 'Фотостудия Свет',
      type: 'other',
      currency: 'RUB',
      period: 'month',
      employeesCount: 0,
      createdAt: new Date().toISOString(),
      isSelfEmployed: true,
    },
    financialInputs: otherMonth(businessId, CURRENT_PERIOD, 180000, 12),
    cashFlowInputs: {
      businessId,
      period: CURRENT_PERIOD,
      openingBalance: 90000,
      operating: {
        customerPayments: 175000,
        supplierPayments: 14000,
        payroll: 0,
        rent: 20000,
        marketing: 15000,
        taxes: 11000,
        otherOperating: 21000,
      },
      investing: { equipment: 15000, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 0, ownerWithdrawal: 70000 },
    },
    scenarios: STANDARD_SCENARIOS,
    forecastConfig: DEFAULT_FORECAST_CONFIG,
    aiHistory: [],
    onboardingComplete: true,
    history: [
      otherMonth(businessId, shiftPeriod(CURRENT_PERIOD, 6), 140000, 10),
      otherMonth(businessId, shiftPeriod(CURRENT_PERIOD, 5), 150000, 10),
      otherMonth(businessId, shiftPeriod(CURRENT_PERIOD, 4), 158000, 11),
      otherMonth(businessId, shiftPeriod(CURRENT_PERIOD, 3), 165000, 11),
      otherMonth(businessId, shiftPeriod(CURRENT_PERIOD, 2), 172000, 11),
      otherMonth(businessId, shiftPeriod(CURRENT_PERIOD, 1), 176000, 12),
    ],
    targets: [{ period: CURRENT_PERIOD, targetRevenue: 250000, targetNetProfit: 140000, targetSalesCount: 17 }],
    balanceSheet: {
      businessId,
      period: CURRENT_PERIOD,
      currentAssets: { cash: 99000, receivables: 5000, inventory: 0, other: 0 },
      nonCurrentAssets: { fixedAssets: 220000, other: 0 },
      currentLiabilities: { payables: 3000, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
    },
    balanceSheetHistory: [
      {
        businessId,
        period: shiftPeriod(CURRENT_PERIOD, 1),
        currentAssets: { cash: 90000, receivables: 4000, inventory: 0, other: 0 },
        nonCurrentAssets: { fixedAssets: 228000, other: 0 },
        currentLiabilities: { payables: 2000, shortTermDebt: 0, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
      },
    ],
    employees: [],
    plannedHires: [],
    employeeTasks: [],
    goals: [
      {
        id: 'ogoal1',
        title: 'Выйти на 250 000 ₽ в месяц',
        metric: 'revenue',
        targetValue: 250000,
        targetPeriod: shiftPeriod(CURRENT_PERIOD, -4),
        createdPeriod: CURRENT_PERIOD,
        baselineValue: 180000,
      },
    ],
    unitEconomics: { purchaseFrequencyPerMonth: 0.05, monthlyChurnRatePct: 30, manualCac: null, newCustomersCount: 5 },
    taxSettings: {
      regime: 'npd',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 0,
      isVatPayer: false,
      vatRatePct: 20,
    },
    accessSettings: { protectedRoutes: [], ownerPin: null },
    products: [],
    stockMovements: [],
  }
}
