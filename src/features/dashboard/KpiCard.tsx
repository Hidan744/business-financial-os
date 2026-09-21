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
  highlighted = false,
}: {
  label: string
  value: string
  tooltip: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  accent?: 'positive' | 'negative' | 'neutral'
  icon?: ReactNode
  /** Ключевой показатель для типа бизнеса пользователя — выделяется рамкой и меткой. */
  highlighted?: boolean
}) {
  return (
    <Card className={cn('p-5', highlighted && 'border-brand-500/50 ring-1 ring-brand-500/20')}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
          {label}
          <InfoTooltip>{tooltip}</InfoTooltip>
          {highlighted && (
            <span className="text-[10px] font-medium text-brand-400 bg-brand-500/15 px-1.5 py-0.5 rounded-full">ключевой</span>
          )}
        </div>
        {icon}
      </div>
      <div
        className={cn(
          'font-display text-2xl font-bold tracking-tight',
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
