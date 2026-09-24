import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { calculateGoalProgress } from '@/lib/finance/goals'
import { GOAL_METRIC_LABELS, type GoalMetric } from '@/types/goal'
import { formatCurrency, formatPercent } from '@/lib/utils'

function metricValue(snapshot: { revenue: number; netProfit: number; ebitda: number; safetyMarginPct: number }, metric: GoalMetric): number {
  return snapshot[metric]
}

function formatMetricValue(metric: GoalMetric, value: number): string {
  return metric === 'safetyMarginPct' ? formatPercent(value) : formatCurrency(value)
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  achieved: { label: 'Достигнута', className: 'bg-positive-500/15 text-positive-500' },
  on_track: { label: 'По графику', className: 'bg-positive-500/15 text-positive-500' },
  behind: { label: 'Отстаёт', className: 'bg-warning-500/15 text-warning-500' },
  overdue: { label: 'Срок прошёл', className: 'bg-negative-500/15 text-negative-500' },
}

export function GoalsPage() {
  const { inputs, snapshot } = useFinancials()
  const goals = useBusinessStore((s) => s.goals)
  const addGoal = useBusinessStore((s) => s.addGoal)
  const removeGoal = useBusinessStore((s) => s.removeGoal)

  const [title, setTitle] = useState('')
  const [metric, setMetric] = useState<GoalMetric>('revenue')
  const [targetValueInput, setTargetValueInput] = useState('')
  const [targetPeriod, setTargetPeriod] = useState('')

  if (!inputs || !snapshot) return null

  function submitGoal() {
    const targetValue = Number(targetValueInput.replace(/\s/g, '').replace(',', '.'))
    if (!title.trim() || !Number.isFinite(targetValue) || targetValue <= 0 || !targetPeriod) return
    if (!inputs || !snapshot) return
    addGoal({
      title: title.trim(),
      metric,
      targetValue,
      targetPeriod,
      createdPeriod: inputs.period,
      baselineValue: metricValue(snapshot, metric),
    })
    setTitle('')
    setTargetValueInput('')
    setTargetPeriod('')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Цели</h1>
        <p className="text-sm text-ink-500 mt-1">Финансовые цели с трекингом прогресса к сроку.</p>
      </div>

      {goals.length > 0 && (
        <div className="space-y-3">
          {goals.map((goal) => {
            const currentValue = metricValue(snapshot, goal.metric)
            const progress = calculateGoalProgress(goal, currentValue, inputs.period)
            const status = STATUS_LABELS[progress.status]
            return (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink-100">{goal.title}</div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {GOAL_METRIC_LABELS[goal.metric]}: {formatMetricValue(goal.metric, currentValue)} из {formatMetricValue(goal.metric, goal.targetValue)}
                      {' · срок '}
                      {goal.targetPeriod}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>{status.label}</span>
                    <button
                      onClick={() => removeGoal(goal.id)}
                      className="text-ink-500 hover:text-negative-500 transition-colors"
                      aria-label={`Удалить цель: ${goal.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-ink-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${progress.status === 'behind' || progress.status === 'overdue' ? 'bg-warning-500' : 'bg-positive-500'}`}
                    style={{ width: `${progress.progressPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-ink-500">
                  <span>{progress.progressPct.toFixed(0)}% выполнено</span>
                  <span>{progress.monthsRemaining > 0 ? `осталось ${progress.monthsRemaining} мес.` : 'срок наступил'}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Новая цель
            <InfoTooltip>
              Прогресс считается от значения показателя на момент постановки цели (сейчас) до целевого значения к
              выбранному сроку. «По графику» — если прогресс по значению не отстаёт от прогресса по времени.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div>
            <Label>Название</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Выручка 3 млн в месяц" className="mt-2" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Показатель</Label>
              <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_METRIC_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Целевое значение</Label>
              <Input
                inputMode="decimal"
                value={targetValueInput}
                onChange={(e) => setTargetValueInput(e.target.value)}
                placeholder="3000000"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Срок</Label>
              <Input type="month" value={targetPeriod} onChange={(e) => setTargetPeriod(e.target.value)} className="mt-2 w-auto" />
            </div>
          </div>

          <div className="text-xs text-ink-500">
            Текущее значение «{GOAL_METRIC_LABELS[metric]}»: {formatMetricValue(metric, metricValue(snapshot, metric))} — станет точкой отсчёта.
          </div>

          <Button onClick={submitGoal}>Добавить цель</Button>
        </CardContent>
      </Card>
    </div>
  )
}
