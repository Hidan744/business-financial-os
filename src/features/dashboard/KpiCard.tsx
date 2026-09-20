import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  tooltip,
  trend,
  trendLabel,
  accent = 'neutral',
  icon,
}: {
  label: string
  value: string
  tooltip: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  accent?: 'positive' | 'negative' | 'neutral'
  icon?: ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
          {label}
          <InfoTooltip>{tooltip}</InfoTooltip>
        </div>
        {icon}
      </div>
      <div
        className={cn(
          'text-2xl font-semibold tracking-tight',
          accent === 'positive' && 'text-positive-500',
          accent === 'negative' && 'text-negative-500',
          accent === 'neutral' && 'text-ink-50',
        )}
      >
        {value}
      </div>
      {trendLabel && (
        <div
          className={cn(
            'mt-1.5 text-xs font-medium',
            trend === 'up' && 'text-positive-500',
            trend === 'down' && 'text-negative-500',
            (!trend || trend === 'neutral') && 'text-ink-500',
          )}
        >
          {trendLabel}
        </div>
      )}
    </Card>
  )
}
