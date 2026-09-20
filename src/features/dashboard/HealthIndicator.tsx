import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DiagnosticResult } from '@/types/diagnostics'
import { HEALTH_STATUS_LABELS } from '@/types/diagnostics'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'

const STATUS_STYLES = {
  stable: { color: 'text-positive-500', bg: 'bg-positive-500/10', border: 'border-positive-500/30', Icon: CheckCircle2 },
  attention: { color: 'text-warning-500', bg: 'bg-warning-500/10', border: 'border-warning-500/30', Icon: AlertCircle },
  critical: { color: 'text-negative-500', bg: 'bg-negative-500/10', border: 'border-negative-500/30', Icon: XCircle },
} as const

export function HealthIndicator({ diagnostics }: { diagnostics: DiagnosticResult }) {
  const style = STATUS_STYLES[diagnostics.healthStatus]
  const { Icon } = style

  return (
    <Card className={cn('border', style.border)}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Финансовое здоровье</CardTitle>
        <span className="text-xs text-ink-500">Обновлено только что</span>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-5">
          <div className={cn('flex size-10 items-center justify-center rounded-xl', style.bg)}>
            <Icon className={cn('size-5', style.color)} />
          </div>
          <div>
            <div className={cn('text-lg font-semibold', style.color)}>
              {HEALTH_STATUS_LABELS[diagnostics.healthStatus]}
            </div>
            <div className="text-xs text-ink-500">Индекс здоровья: {diagnostics.healthScore}/100</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {diagnostics.factors.map((f) => {
            const fStyle = STATUS_STYLES[f.status]
            return (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-400">{f.label}</span>
                <span className={cn('font-medium', fStyle.color)}>
                  {f.unit === 'currency' ? formatCurrency(f.value) : formatPercent(f.value)}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
