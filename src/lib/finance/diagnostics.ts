import type { FinancialInputs, FinancialSnapshot } from '@/types/finance'
import type {
  ActionPlanItem,
  DiagnosticFactor,
  DiagnosticProblem,
  DiagnosticResult,
  HealthStatus,
} from '@/types/diagnostics'
import { formatCurrency, formatPercent } from '@/lib/utils'

/**
 * Пороговые значения для оценки финансового здоровья.
 * Каждый порог — задокументированная константа, на которую можно сослаться
 * при объяснении результата пользователю (требование "не делай необоснованных выводов").
 */
const THRESHOLDS = {
  ebitdaMargin: { stable: 15, attention: 5 },
  netMargin: { stable: 8, attention: 0 },
  safetyMargin: { stable: 20, attention: 5 },
  payrollShare: { stable: 35, attention: 45 }, // % от выручки
  marketingShare: { stable: 15, attention: 25 },
  fixedCostsShare: { stable: 40, attention: 55 },
  debtLoad: { stable: 15, attention: 30 },
  cashFlow: { stable: 0 },
} as const

function statusFor(value: number, stableThreshold: number, attentionThreshold: number, higherIsBetter: boolean): HealthStatus {
  if (higherIsBetter) {
    if (value >= stableThreshold) return 'stable'
    if (value >= attentionThreshold) return 'attention'
    return 'critical'
  }
  if (value <= stableThreshold) return 'stable'
  if (value <= attentionThreshold) return 'attention'
  return 'critical'
}

const STATUS_SCORE: Record<HealthStatus, number> = { stable: 100, attention: 55, critical: 15 }

export function buildDiagnosticFactors(inputs: FinancialInputs, snapshot: FinancialSnapshot): DiagnosticFactor[] {
  // При нулевой выручке доля расходов от выручки не определена (0/0). Мы не можем
  // засчитать это как "здорово" — это сигнал критического состояния (бизнес без выручки).
  const hasRevenue = inputs.revenue > 0
  const payrollSharePct = hasRevenue ? (inputs.payroll / inputs.revenue) * 100 : 100
  const marketingSharePct = hasRevenue ? (inputs.marketing / inputs.revenue) * 100 : 100
  const fixedCostsSharePct = hasRevenue ? (snapshot.fixedCosts / inputs.revenue) * 100 : 100
  const debtLoadPct = hasRevenue ? snapshot.debtLoadPct : inputs.loanPayments > 0 ? 100 : 0

  const factors: DiagnosticFactor[] = [
    {
      id: 'ebitdaMargin',
      label: 'EBITDA маржа',
      value: snapshot.ebitdaMarginPct,
      unit: '%',
      weight: 0.2,
      status: statusFor(snapshot.ebitdaMarginPct, THRESHOLDS.ebitdaMargin.stable, THRESHOLDS.ebitdaMargin.attention, true),
      explanation: `EBITDA маржа ${formatPercent(snapshot.ebitdaMarginPct)}: стабильно при ≥${THRESHOLDS.ebitdaMargin.stable}%, внимание при ≥${THRESHOLDS.ebitdaMargin.attention}%.`,
    },
    {
      id: 'netMargin',
      label: 'Чистая маржа',
      value: snapshot.netMarginPct,
      unit: '%',
      weight: 0.15,
      status: statusFor(snapshot.netMarginPct, THRESHOLDS.netMargin.stable, THRESHOLDS.netMargin.attention, true),
      explanation: `Чистая маржа ${formatPercent(snapshot.netMarginPct)}: стабильно при ≥${THRESHOLDS.netMargin.stable}%, критично при отрицательном значении.`,
    },
    {
      id: 'safetyMargin',
      label: 'Запас финансовой прочности',
      value: snapshot.safetyMarginPct,
      unit: '%',
      weight: 0.2,
      status: statusFor(snapshot.safetyMarginPct, THRESHOLDS.safetyMargin.stable, THRESHOLDS.safetyMargin.attention, true),
      explanation: `Запас прочности ${formatPercent(snapshot.safetyMarginPct)}: стабильно при ≥${THRESHOLDS.safetyMargin.stable}%.`,
    },
    {
      id: 'cashFlow',
      label: 'Cash Flow',
      value: snapshot.cashFlow,
      unit: 'currency',
      weight: 0.15,
      status: snapshot.cashFlow >= 0 ? 'stable' : 'critical',
      explanation: `Денежный поток ${formatCurrency(snapshot.cashFlow)}: отрицательный cash flow — прямой сигнал риска кассового разрыва.`,
    },
    {
      id: 'payrollShare',
      label: 'Доля ФОТ в выручке',
      value: payrollSharePct,
      unit: '%',
      weight: 0.1,
      status: statusFor(payrollSharePct, THRESHOLDS.payrollShare.stable, THRESHOLDS.payrollShare.attention, false),
      explanation: `ФОТ составляет ${formatPercent(payrollSharePct)} от выручки: стабильно при ≤${THRESHOLDS.payrollShare.stable}%.`,
    },
    {
      id: 'marketingShare',
      label: 'Доля рекламы в выручке',
      value: marketingSharePct,
      unit: '%',
      weight: 0.05,
      status: statusFor(marketingSharePct, THRESHOLDS.marketingShare.stable, THRESHOLDS.marketingShare.attention, false),
      explanation: `Реклама составляет ${formatPercent(marketingSharePct)} от выручки: стабильно при ≤${THRESHOLDS.marketingShare.stable}%.`,
    },
    {
      id: 'fixedCostsShare',
      label: 'Доля постоянных расходов',
      value: fixedCostsSharePct,
      unit: '%',
      weight: 0.1,
      status: statusFor(fixedCostsSharePct, THRESHOLDS.fixedCostsShare.stable, THRESHOLDS.fixedCostsShare.attention, false),
      explanation: `Постоянные расходы: ${formatPercent(fixedCostsSharePct)} от выручки: стабильно при ≤${THRESHOLDS.fixedCostsShare.stable}%.`,
    },
    {
      id: 'debtLoad',
      label: 'Долговая нагрузка',
      value: debtLoadPct,
      unit: '%',
      weight: 0.05,
      status: statusFor(debtLoadPct, THRESHOLDS.debtLoad.stable, THRESHOLDS.debtLoad.attention, false),
      explanation: `Платежи по кредитам: ${formatPercent(debtLoadPct)} от выручки: стабильно при ≤${THRESHOLDS.debtLoad.stable}%.`,
    },
  ]

  return factors
}

export function computeHealthStatus(factors: DiagnosticFactor[]): { status: HealthStatus; score: number } {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0) || 1
  const score = factors.reduce((sum, f) => sum + STATUS_SCORE[f.status] * f.weight, 0) / totalWeight
  const status: HealthStatus = score >= 80 ? 'stable' : score >= 45 ? 'attention' : 'critical'
  return { status, score: Math.round(score) }
}

function buildProblems(factors: DiagnosticFactor[]): DiagnosticProblem[] {
  return factors
    .filter((f) => f.status !== 'stable')
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === 'critical' ? -1 : 1))
    .map((f) => ({
      id: f.id,
      title: problemTitle(f.id),
      metricRef: f.label,
      value: f.unit === 'currency' ? formatCurrency(f.value) : formatPercent(f.value),
      description: f.explanation,
      severity: f.status,
    }))
}

function problemTitle(id: string): string {
  const titles: Record<string, string> = {
    ebitdaMargin: 'Низкая операционная маржа',
    netMargin: 'Низкая или отрицательная чистая прибыль',
    safetyMargin: 'Недостаточный запас финансовой прочности',
    cashFlow: 'Отрицательный денежный поток',
    payrollShare: 'Высокая доля ФОТ в выручке',
    marketingShare: 'Высокая доля рекламных расходов',
    fixedCostsShare: 'Высокая доля постоянных расходов',
    debtLoad: 'Высокая долговая нагрузка',
  }
  return titles[id] ?? id
}

function buildActionPlan(problems: DiagnosticProblem[]): ActionPlanItem[] {
  const top = problems.slice(0, 4)
  const periods = ['День 1–3', 'День 4–7', 'Неделя 2', 'Неделя 3']
  const actionsById: Record<string, { action: string; effect: string; metric: string }> = {
    ebitdaMargin: {
      action: 'Проверить топ-5 статей расходов и пересмотреть договоры с поставщиками/подрядчиками',
      effect: 'Рост EBITDA маржи на 2–4 п.п. за счёт снижения затрат',
      metric: 'EBITDA маржа, %',
    },
    netMargin: {
      action: 'Сверить налоговый режим и проценты по кредитам — есть ли возможность рефинансирования',
      effect: 'Снижение непрофильных вычетов из EBITDA',
      metric: 'Чистая маржа, %',
    },
    safetyMargin: {
      action: 'Рассчитать необходимый рост продаж до безопасного запаса прочности (≥20%) и составить план продаж',
      effect: 'Снижение риска ухода в убыток при падении спроса',
      metric: 'Запас финансовой прочности, %',
    },
    cashFlow: {
      action: 'Составить платёжный календарь на 4 недели, отсрочить необязательные платежи',
      effect: 'Устранение риска кассового разрыва',
      metric: 'Cash Flow, ₽',
    },
    payrollShare: {
      action: 'Проверить загрузку сотрудников и пересмотреть систему мотивации (фикс/бонус)',
      effect: 'Снижение доли ФОТ на 3–5 п.п. от выручки',
      metric: 'Доля ФОТ в выручке, %',
    },
    marketingShare: {
      action: 'Проанализировать ROMI по каналам, отключить неэффективные',
      effect: 'Снижение доли рекламы при сохранении объёма продаж',
      metric: 'ROMI, %',
    },
    fixedCostsShare: {
      action: 'Пересмотреть аренду/сервисы/подписки — найти статьи для сокращения или переговоров',
      effect: 'Снижение постоянных расходов на 5–10%',
      metric: 'Доля постоянных расходов, %',
    },
    debtLoad: {
      action: 'Составить график погашения и оценить возможность реструктуризации кредита',
      effect: 'Снижение ежемесячной долговой нагрузки',
      metric: 'Долговая нагрузка, %',
    },
  }

  return top.map((problem, idx) => {
    const meta = actionsById[problem.id] ?? {
      action: 'Проверить показатель и подготовить план коррекции',
      effect: 'Улучшение показателя',
      metric: problem.metricRef,
    }
    return {
      id: `plan-${problem.id}`,
      period: periods[idx] ?? 'Неделя 4',
      problem: problem.title,
      action: meta.action,
      expectedEffect: meta.effect,
      controlMetric: meta.metric,
    }
  })
}

export function runDiagnostics(inputs: FinancialInputs, snapshot: FinancialSnapshot): DiagnosticResult {
  const factors = buildDiagnosticFactors(inputs, snapshot)
  const { status, score } = computeHealthStatus(factors)
  const problems = buildProblems(factors)
  const actionPlan = buildActionPlan(problems)

  return {
    healthStatus: status,
    healthScore: score,
    factors,
    problems,
    actionPlan,
    generatedAt: new Date().toISOString(),
  }
}
