import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { BrandMark } from '@/components/icons/BrandMark'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'
import { useBusinessStore } from '@/store/businessStore'
import { generateBusinessId, generateId } from '@/lib/id'
import type { BusinessType, AnalysisPeriod } from '@/types/business'
import { BUSINESS_TYPE_LABELS, PERIOD_LABELS } from '@/types/business'
import type { FinancialInputs } from '@/types/finance'

interface FormData {
  name: string
  type: BusinessType
  period: AnalysisPeriod
  revenue: string
  cogs: string
  fixedCosts: string
  payroll: string
  marketing: string
  taxes: string
  loanPayments: string
  employeesCount: string
  avgCheck: string
  salesCount: string
}

const INITIAL: FormData = {
  name: '',
  type: 'services',
  period: 'month',
  revenue: '',
  cogs: '',
  fixedCosts: '',
  payroll: '',
  marketing: '',
  taxes: '',
  loanPayments: '',
  employeesCount: '',
  avgCheck: '',
  salesCount: '',
}

type StepKind = 'text' | 'select-type' | 'select-period' | 'number'

interface StepDef {
  key: keyof FormData
  title: string
  hint?: string
  kind: StepKind
  placeholder?: string
  suffix?: string
}

const STEPS: StepDef[] = [
  { key: 'name', title: 'Как называется ваш бизнес?', kind: 'text', placeholder: 'Например, Urban Coffee' },
  { key: 'type', title: 'Какой у вас тип бизнеса?', kind: 'select-type' },
  { key: 'period', title: 'В каком периоде удобно анализировать финансы?', kind: 'select-period' },
  { key: 'revenue', title: 'Какая у вас выручка за период?', kind: 'number', suffix: '₽', hint: 'Все деньги, поступившие от продаж' },
  { key: 'cogs', title: 'Какая у вас себестоимость?', kind: 'number', suffix: '₽', hint: 'Прямые затраты на товар/услугу: закупка, материалы, производство' },
  { key: 'fixedCosts', title: 'Какие у вас постоянные расходы?', kind: 'number', suffix: '₽', hint: 'Аренда, коммуналка, сервисы — расходы, которые не зависят от объёма продаж' },
  { key: 'payroll', title: 'Какой у вас фонд оплаты труда (ФОТ)?', kind: 'number', suffix: '₽' },
  { key: 'marketing', title: 'Сколько вы тратите на рекламу?', kind: 'number', suffix: '₽' },
  { key: 'taxes', title: 'Сколько вы платите налогов за период?', kind: 'number', suffix: '₽' },
  { key: 'loanPayments', title: 'Есть ли у вас платежи по кредитам/займам?', kind: 'number', suffix: '₽', hint: 'Укажите 0, если кредитов нет' },
  { key: 'employeesCount', title: 'Сколько у вас сотрудников?', kind: 'number', suffix: 'чел.' },
  { key: 'avgCheck', title: 'Какой у вас средний чек?', kind: 'number', suffix: '₽' },
  { key: 'salesCount', title: 'Сколько продаж вы делаете за период?', kind: 'number', suffix: 'шт.' },
]

function toNumber(v: string): number {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const completeOnboarding = useBusinessStore((s) => s.completeOnboarding)
  const loadDemo = useBusinessStore((s) => s.loadDemo)
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100

  const currentValue = data[step.key]
  const canProceed = step.kind === 'text' ? currentValue.trim().length > 0 : currentValue.trim().length > 0

  function update(key: keyof FormData, value: string) {
    setData((d) => ({ ...d, [key]: value }))
  }

  async function handleNext() {
    if (!canProceed) return
    if (!isLast) {
      setStepIndex((i) => i + 1)
      return
    }
    setSubmitting(true)
    const businessId = generateBusinessId()
    const period = new Date().toISOString().slice(0, 7)

    const financialInputs: FinancialInputs = {
      businessId,
      period,
      revenue: toNumber(data.revenue),
      cogs: toNumber(data.cogs),
      payroll: toNumber(data.payroll),
      rent: 0,
      marketing: toNumber(data.marketing),
      logistics: 0,
      utilities: 0,
      software: 0,
      customExpenseLines: [
        { id: generateId('exp'), label: 'Постоянные расходы', amount: toNumber(data.fixedCosts) },
      ],
      depreciation: 0,
      loanInterest: 0,
      taxes: toNumber(data.taxes),
      loanPayments: toNumber(data.loanPayments),
      avgCheck: toNumber(data.avgCheck),
      salesCount: toNumber(data.salesCount),
    }

    await completeOnboarding(
      {
        id: businessId,
        name: data.name.trim(),
        type: data.type,
        period: data.period,
        currency: 'RUB',
        employeesCount: toNumber(data.employeesCount),
        createdAt: new Date().toISOString(),
      },
      financialInputs,
    )
    navigate('/app/dashboard')
  }

  function handleBack() {
    if (stepIndex === 0) return
    setStepIndex((i) => i - 1)
  }

  async function handleSkipToDemo() {
    await loadDemo()
    navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">
      <header className="flex items-center justify-between px-4 lg:px-8 h-16 border-b border-ink-800">
        <div className="flex items-center gap-2">
          <BrandMark className="size-4 text-brand-400" />
          <span className="text-sm font-semibold text-ink-50">Business Financial OS</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkipToDemo}>
          Пропустить и открыть демо
        </Button>
      </header>

      <div className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-center px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-2">
            <span>Шаг {stepIndex + 1} из {STEPS.length}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} />
        </div>

        <h1 className="text-2xl font-semibold text-ink-50 mb-2">{step.title}</h1>
        {step.hint && <p className="text-sm text-ink-400 mb-6">{step.hint}</p>}
        {!step.hint && <div className="mb-6" />}

        <div className="space-y-2">
          {step.kind === 'text' && (
            <Input
              autoFocus
              value={currentValue}
              placeholder={step.placeholder}
              onChange={(e) => update(step.key, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
          )}

          {step.kind === 'select-type' && (
            <Select value={data.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {step.kind === 'select-period' && (
            <Select value={data.period} onValueChange={(v) => update('period', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {step.kind === 'number' && (
            <div className="relative">
              <Input
                autoFocus
                inputMode="decimal"
                value={currentValue}
                placeholder="0"
                onChange={(e) => update(step.key, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                className="pr-14"
              />
              {step.suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  {step.suffix}
                </span>
              )}
              {toNumber(currentValue) > 0 && step.suffix === '₽' && (
                <p className="mt-2 text-xs text-ink-500">{formatCurrency(toNumber(currentValue))}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <Button variant="secondary" onClick={handleBack} disabled={stepIndex === 0}>
            <ArrowLeft className="size-4" /> Назад
          </Button>
          <Button onClick={handleNext} disabled={!canProceed || submitting} className="flex-1">
            {isLast ? 'Создать финансовую модель' : 'Далее'}
            {!isLast && <ArrowRight className="size-4" />}
          </Button>
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                'h-1 flex-1 max-w-6 rounded-full transition-colors',
                i <= stepIndex ? 'bg-brand-500' : 'bg-ink-800',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
