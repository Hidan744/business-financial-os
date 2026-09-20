import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthIndicator } from '@/features/dashboard/HealthIndicator'
import { useDiagnostics } from '@/hooks/useDiagnostics'
import { HEALTH_STATUS_LABELS } from '@/types/diagnostics'
import { cn } from '@/lib/utils'

const SEVERITY_STYLES = {
  stable: 'border-positive-500/30 bg-positive-500/5',
  attention: 'border-warning-500/30 bg-warning-500/5',
  critical: 'border-negative-500/30 bg-negative-500/5',
} as const

export function CrisisPage() {
  const diagnostics = useDiagnostics()
  const [revealed, setRevealed] = useState(false)

  if (!diagnostics) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Антикризис</h1>
        <p className="text-sm text-ink-500 mt-1">
          Диагностика финансовой модели по конкретным показателям — без домыслов.
        </p>
      </div>

      {!revealed ? (
        <Card className="p-10 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 mb-5">
            <Gauge className="size-6" />
          </div>
          <h2 className="text-lg font-semibold text-ink-50 mb-2">Готовы проверить финансовое состояние бизнеса?</h2>
          <p className="text-sm text-ink-400 max-w-md mb-6">
            Система проверит маржинальность, EBITDA, чистую прибыль, ФОТ, рекламу, постоянные расходы,
            cash flow, точку безубыточности, запас прочности и долговую нагрузку.
          </p>
          <Button size="lg" onClick={() => setRevealed(true)}>Провести диагностику</Button>
        </Card>
      ) : (
        <>
          <HealthIndicator diagnostics={diagnostics} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning-500" />
                Основные проблемы
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {diagnostics.problems.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-positive-500 py-4">
                  <CheckCircle2 className="size-4" />
                  Явных проблем не найдено — все ключевые показатели в пределах нормы.
                </div>
              ) : (
                diagnostics.problems.map((problem, i) => (
                  <div key={problem.id} className={cn('rounded-xl border p-4', SEVERITY_STYLES[problem.severity])}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink-50">
                          {i + 1}. {problem.title}
                        </div>
                        <div className="text-xs text-ink-500 mt-0.5">{problem.metricRef}: {problem.value}</div>
                      </div>
                    </div>
                    <p className="text-sm text-ink-300 mt-2">{problem.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {diagnostics.actionPlan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-brand-400" />
                  План на 30 дней
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                {diagnostics.actionPlan.map((item) => (
                  <div key={item.id} className="rounded-xl border border-ink-800 p-4">
                    <div className="text-xs font-medium text-brand-400 mb-2">{item.period}</div>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <Row label="Проблема" value={item.problem} />
                      <Row label="Действие" value={item.action} />
                      <Row label="Ожидаемый эффект" value={item.expectedEffect} />
                      <Row label="Метрика контроля" value={item.controlMetric} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-ink-600">
            Статус: {HEALTH_STATUS_LABELS[diagnostics.healthStatus]}. Диагностика сформирована{' '}
            {new Date(diagnostics.generatedAt).toLocaleString('ru-RU')}.
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-ink-200">{value}</div>
    </div>
  )
}
