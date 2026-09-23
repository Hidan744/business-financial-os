import type { FinancialInputs, FinancialSnapshot } from '@/types/finance'
import type { DiagnosticResult } from '@/types/diagnostics'
import type { TaxSettings } from '@/types/tax'
import { calculateRequiredRevenueForNetProfit } from '@/lib/finance/breakeven'
import { calculateScenario } from '@/lib/finance/scenario'
import { buildFinancialSnapshot, getFixedCosts, getVariableCosts } from '@/lib/finance/snapshot'
import { DEFAULT_MULTIPLIERS } from '@/types/scenario'
import { formatCurrency, formatPercent } from '@/lib/utils'

export interface AiAnswer {
  shortAnswer: string
  why: string
  calculation: string
  whatToDo: string
  whatChanges: string
}

export interface AiResult {
  answer?: AiAnswer
  missingData?: string[]
}

function extractNumber(text: string): number | null {
  const match = text.replace(/ /g, ' ').match(/(\d[\d\s]{2,}|\d+)/)
  if (!match) return null
  const n = Number(match[1].replace(/\s/g, ''))
  return Number.isFinite(n) ? n : null
}

function extractPercent(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*%/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

function norm(text: string): string {
  return text.toLowerCase().trim()
}

export function answerQuestion(
  question: string,
  inputs: FinancialInputs,
  snapshot: FinancialSnapshot,
  diagnostics: DiagnosticResult,
  employeesCount: number,
  taxSettings?: TaxSettings,
): AiResult {
  const q = norm(question)
  const fixedCosts = getFixedCosts(inputs)

  // 1. "Какую выручку нужно сделать для прибыли X?" — target здесь означает ЧИСТУЮ прибыль
  // ("для прибыли", "чистыми"), поэтому считается через тот же решатель (с учётом амортизации,
  // процентов и налога — через реальный tax engine), что использует Financial Plan и Продажи —
  // единый Financial Engine, а не отдельная приблизительная формула для AI CFO.
  if ((q.includes('выручк') || q.includes('заработ')) && (q.includes('прибыл') || q.includes('чист')) ) {
    const target = extractNumber(question)
    if (target === null) {
      return { missingData: ['Целевая сумма прибыли (укажите число, например «500000»)'] }
    }
    const variableCosts = getVariableCosts(inputs)
    const variableCostRatio = inputs.revenue > 0 ? variableCosts / inputs.revenue : 0
    const fallbackRatePctOfRevenue = inputs.revenue > 0 ? inputs.taxes / inputs.revenue : 0
    const solved = calculateRequiredRevenueForNetProfit(
      target,
      fixedCosts,
      variableCostRatio,
      inputs.depreciation,
      inputs.loanInterest,
      inputs.avgCheck,
      { taxSettings, fallbackRatePctOfRevenue },
    )
    const requiredRevenue = solved.requiredRevenue
    const requiredSales = solved.requiredSales
    if (requiredRevenue === null) {
      return {
        answer: {
          shortAnswer: 'Недостижимо ни при какой выручке.',
          why: 'Переменные затраты (себестоимость и переменные расходы) съедают всю выручку — маржинальность сейчас ≤ 0, и рост продаж это не исправит.',
          calculation: `Маржинальность = 1 − (переменные затраты / выручка) = ${formatPercent((1 - variableCostRatio) * 100)}`,
          whatToDo: 'Сначала нужно повысить маржинальность: поднять цены или снизить себестоимость, прежде чем считать целевую выручку.',
          whatChanges: 'Без положительной маржи увеличение продаж не приведёт к прибыли.',
        },
      }
    }
    return {
      answer: {
        shortAnswer: `Для чистой прибыли ${formatCurrency(target)} нужна выручка ≈ ${formatCurrency(requiredRevenue)}.`,
        why: 'Выручка должна покрыть переменные затраты, постоянные расходы, амортизацию, проценты по кредиту и налог — и оставить целевую чистую прибыль сверх этого.',
        calculation: `Выручка подобрана так, чтобы по полному П&Л (Выручка → Валовая прибыль → EBITDA → EBIT → EBT → Налог → Чистая прибыль) итоговая чистая прибыль ≈ ${formatCurrency(target)}.`,
        whatToDo: requiredSales !== null
          ? `Это примерно ${Math.round(requiredSales)} продаж при среднем чеке ${formatCurrency(inputs.avgCheck)}.`
          : 'Задайте средний чек, чтобы рассчитать количество продаж.',
        whatChanges: `Выручка вырастет с ${formatCurrency(inputs.revenue)} до ${formatCurrency(requiredRevenue)} (${requiredRevenue > inputs.revenue ? '+' : ''}${formatCurrency(requiredRevenue - inputs.revenue)}).`,
      },
    }
  }

  // 2. "Что будет, если увеличу рекламу на X%?" (или любой другой параметр по ключевым словам)
  if (q.includes('что если') || q.includes('что будет') || (q.includes('увелич') && q.includes('%'))) {
    const pct = extractPercent(question)
    if (pct === null) {
      return { missingData: ['Процент изменения параметра (например, «на 30%»)'] }
    }
    const isMarketing = q.includes('реклам') || q.includes('маркетинг')
    const isPrice = q.includes('цен') || q.includes('чек')
    const isSales = q.includes('продаж')
    if (!isMarketing && !isPrice && !isSales) {
      return { missingData: ['Какой именно параметр изменить: реклама, цена/чек или количество продаж'] }
    }
    const multipliers = { ...DEFAULT_MULTIPLIERS }
    if (isMarketing) multipliers.marketing = 1 + pct / 100
    if (isPrice) multipliers.avgCheck = 1 + pct / 100
    if (isSales) multipliers.salesCount = 1 + pct / 100

    const after = buildFinancialSnapshot(calculateScenario(inputs, multipliers))
    const profitDelta = after.netProfit - snapshot.netProfit
    const paramLabel = isMarketing ? 'расходы на рекламу' : isPrice ? 'средний чек' : 'количество продаж'

    return {
      answer: {
        shortAnswer: `Чистая прибыль изменится с ${formatCurrency(snapshot.netProfit)} до ${formatCurrency(after.netProfit)}.`,
        why: `Изменение параметра «${paramLabel}» на ${pct > 0 ? '+' : ''}${pct}% напрямую влияет на выручку и/или расходы, а через них — на прибыль.`,
        calculation: `Прибыль (сценарий) = EBITDA − амортизация − проценты − налоги = ${formatCurrency(after.netProfit)}. Разница: ${profitDelta >= 0 ? '+' : ''}${formatCurrency(profitDelta)}.`,
        whatToDo: profitDelta >= 0
          ? 'Изменение выглядит выгодным — попробуйте смоделировать точнее в разделе «Симулятор».'
          : 'Изменение снижает прибыль — проверьте, компенсируется ли это ростом других показателей (например, узнаваемости), прежде чем действовать.',
        whatChanges: `Маржа: ${formatPercent(snapshot.netMarginPct)} → ${formatPercent(after.netMarginPct)}. Cash Flow: ${formatCurrency(snapshot.cashFlow)} → ${formatCurrency(after.cashFlow)}.`,
      },
    }
  }

  // 3. "Можно ли нанять сотрудника?"
  if (q.includes('нанять') || q.includes('нового сотрудник') || q.includes('ещё сотрудник') || q.includes('еще сотрудник')) {
    if (employeesCount <= 0) {
      return { missingData: ['Текущее количество сотрудников (укажите в разделе «Настройки»)'] }
    }
    const costPerEmployee = inputs.payroll / employeesCount
    const newPayroll = inputs.payroll + costPerEmployee
    const after = buildFinancialSnapshot({ ...inputs, payroll: newPayroll })
    const canAfford = after.netProfit >= 0 && after.cashFlow >= 0

    return {
      answer: {
        shortAnswer: canAfford
          ? 'При текущих показателях найм ещё одного сотрудника не уводит бизнес в убыток.'
          : 'Сейчас найм ещё одного сотрудника, скорее всего, приведёт к убытку или отрицательному cash flow.',
        why: `Дополнительная позиция увеличит ФОТ примерно на ${formatCurrency(costPerEmployee)} (по средней стоимости текущего сотрудника).`,
        calculation: `Прибыль после найма ≈ ${formatCurrency(after.netProfit)} (сейчас ${formatCurrency(snapshot.netProfit)}). Cash Flow после найма ≈ ${formatCurrency(after.cashFlow)}.`,
        whatToDo: canAfford
          ? 'Можно нанимать, но контролируйте запас прочности и cash flow в следующие 2–3 месяца.'
          : 'Сначала увеличьте выручку или маржу, либо наймите на частичную занятость.',
        whatChanges: `Маржа: ${formatPercent(snapshot.netMarginPct)} → ${formatPercent(after.netMarginPct)}.`,
      },
    }
  }

  // 4. "Где я теряю больше всего денег?"
  if (q.includes('теря') && (q.includes('денег') || q.includes('деньг') || q.includes('прибыл'))) {
    const costs = [
      { label: 'Себестоимость', amount: inputs.cogs },
      { label: 'ФОТ', amount: inputs.payroll },
      { label: 'Реклама', amount: inputs.marketing },
      { label: 'Аренда', amount: inputs.rent },
      { label: 'Налоги', amount: inputs.taxes },
      ...inputs.customExpenseLines.map((l) => ({ label: l.label, amount: l.amount })),
    ].sort((a, b) => b.amount - a.amount)
    const top = costs[0]
    const sharePct = inputs.revenue > 0 ? (top.amount / inputs.revenue) * 100 : 0

    return {
      answer: {
        shortAnswer: `Больше всего денег уходит на «${top.label}» — ${formatCurrency(top.amount)}.`,
        why: `Это самая крупная статья расходов — ${formatPercent(sharePct)} от выручки.`,
        calculation: `Топ-3 статьи: ${costs.slice(0, 3).map((c) => `${c.label} ${formatCurrency(c.amount)}`).join(', ')}.`,
        whatToDo: `Проверьте, можно ли снизить «${top.label}» без потери качества — договоритесь с поставщиками/подрядчиками или пересмотрите условия.`,
        whatChanges: `Снижение «${top.label}» на 10% добавит к прибыли примерно ${formatCurrency(top.amount * 0.1)}.`,
      },
    }
  }

  // 5. "Почему прибыль такая низкая?"
  if (q.includes('почему') && q.includes('прибыл')) {
    const worstFactor = [...diagnostics.factors].sort((a, b) => {
      const order = { critical: 0, attention: 1, stable: 2 }
      return order[a.status] - order[b.status]
    })[0]

    return {
      answer: {
        shortAnswer: worstFactor
          ? `Главная причина — «${worstFactor.label}» (${formatPercent(worstFactor.value)}).`
          : 'Прибыль ограничена совокупностью факторов — явного лидера не выявлено.',
        why: worstFactor?.explanation ?? 'Проверьте вкладку «Антикризис» — там показаны все проблемные показатели.',
        calculation: `Чистая маржа = Чистая прибыль / Выручка = ${formatCurrency(snapshot.netProfit)} / ${formatCurrency(snapshot.revenue)} = ${formatPercent(snapshot.netMarginPct)}.`,
        whatToDo: 'Откройте раздел «Антикризис» — там пошаговый план на 30 дней по этой проблеме.',
        whatChanges: 'Устранение этой причины — самый быстрый путь к росту чистой прибыли.',
      },
    }
  }

  // 6. "Какие расходы проверить в первую очередь?"
  if (q.includes('расход') && (q.includes('провер') || q.includes('перв'))) {
    const topProblems = diagnostics.problems.slice(0, 3)
    if (topProblems.length === 0) {
      return {
        answer: {
          shortAnswer: 'Явных проблем с расходами не найдено.',
          why: 'Все проверенные показатели (доля ФОТ, рекламы, постоянных расходов) в пределах нормы.',
          calculation: `Постоянные расходы: ${formatPercent(inputs.revenue > 0 ? (fixedCosts / inputs.revenue) * 100 : 0)} от выручки.`,
          whatToDo: 'Продолжайте отслеживать динамику раз в месяц.',
          whatChanges: 'Пока изменений не требуется.',
        },
      }
    }
    return {
      answer: {
        shortAnswer: `В первую очередь проверьте: ${topProblems.map((p) => p.title.toLowerCase()).join('; ')}.`,
        why: 'Это статьи, которые сильнее всего отклоняются от здоровых значений.',
        calculation: topProblems.map((p) => `${p.metricRef}: ${p.value}`).join(' · '),
        whatToDo: 'Откройте «Антикризис» — там для каждой проблемы есть конкретное действие и ожидаемый эффект.',
        whatChanges: 'Коррекция этих статей даст наибольший эффект на прибыль при наименьших усилиях.',
      },
    }
  }

  return {
    missingData: [
      'Вопрос не удалось однозначно связать с вашими финансовыми данными.',
      'Попробуйте переформулировать, используя термины: выручка, прибыль, реклама, себестоимость, ФОТ, продажи.',
    ],
  }
}
