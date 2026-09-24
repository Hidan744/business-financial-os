import type { FinancialInputs } from '@/types/finance'
import { buildFinancialSnapshot } from './snapshot'

export interface ExpenseBreakdownItem {
  label: string
  value: number
}

const MAX_EXPENSE_SLOTS = 7

/**
 * Разбивка расходов периода по статьям — для диаграммы "Структура расходов". Себестоимость и
 * переменные операционные расходы включены (это тоже расходы периода, не только постоянные),
 * налоги и проценты — тоже. Статьи с нулевой суммой не показываются (нет смысла рисовать
 * сегмент нулевой ширины). Если статей больше MAX_EXPENSE_SLOTS — хвост с наименьшими суммами
 * сворачивается в «Прочее», чтобы не упереться в потолок категориальной палитры (см. dataviz).
 */
export function buildExpenseBreakdown(inputs: FinancialInputs): ExpenseBreakdownItem[] {
  const customTotal = inputs.customExpenseLines.reduce((s, l) => s + l.amount, 0)
  const raw: ExpenseBreakdownItem[] = [
    { label: 'Себестоимость', value: inputs.cogs },
    { label: 'Переменные операционные расходы', value: inputs.variableOpex ?? 0 },
    { label: 'ФОТ', value: inputs.payroll },
    { label: 'Аренда', value: inputs.rent },
    { label: 'Реклама', value: inputs.marketing },
    { label: 'Логистика', value: inputs.logistics },
    { label: 'Коммунальные расходы', value: inputs.utilities },
    { label: 'ПО / сервисы', value: inputs.software },
    { label: 'Прочие статьи', value: customTotal },
    { label: 'Амортизация', value: inputs.depreciation },
    { label: 'Проценты по кредитам', value: inputs.loanInterest },
    { label: 'Налоги', value: inputs.taxes },
  ].filter((item) => item.value > 0)

  raw.sort((a, b) => b.value - a.value)
  if (raw.length <= MAX_EXPENSE_SLOTS) return raw

  const head = raw.slice(0, MAX_EXPENSE_SLOTS - 1)
  const tail = raw.slice(MAX_EXPENSE_SLOTS - 1)
  const otherTotal = tail.reduce((s, item) => s + item.value, 0)
  return [...head, { label: 'Прочее', value: otherTotal }]
}

export interface HistoryTrendPoint {
  period: string
  label: string
  revenue: number
  netProfit: number
  cashFlow: number
  grossMarginPct: number
  ebitdaMarginPct: number
  netMarginPct: number
}

/**
 * История + текущий (ещё не закрытый) период — в хронологическом порядке, для трендовых
 * графиков в отчёте. `history` в сторе хранит только ЗАКРЫТЫЕ периоды; текущий добавляется
 * отдельно последней точкой, чтобы тренд не обрывался за месяц до "сейчас".
 */
export function buildHistoryTrend(history: FinancialInputs[], current: FinancialInputs): HistoryTrendPoint[] {
  const records = [...history.filter((h) => h.period !== current.period), current].sort((a, b) =>
    a.period.localeCompare(b.period),
  )
  return records.map((record) => {
    const snapshot = buildFinancialSnapshot(record)
    const [year, month] = record.period.split('-')
    const monthLabel = new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString('ru-RU', {
      month: 'short',
      timeZone: 'UTC',
    })
    return {
      period: record.period,
      label: monthLabel.replace('.', ''),
      revenue: snapshot.revenue,
      netProfit: snapshot.netProfit,
      cashFlow: snapshot.cashFlow,
      grossMarginPct: snapshot.grossMarginPct,
      ebitdaMarginPct: snapshot.ebitdaMarginPct,
      netMarginPct: snapshot.netMarginPct,
    }
  })
}
