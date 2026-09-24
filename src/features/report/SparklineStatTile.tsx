import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function SparklineStatTile<T extends object>({
  label,
  value,
  tooltip,
  accent = 'neutral',
  deltaLabel,
  sparkline,
  sparklineKey,
  sparklineColor,
}: {
  label: string
  value: string
  tooltip: string
  accent?: 'positive' | 'negative' | 'neutral'
  deltaLabel?: string
  /** Точки для мини-графика тренда — минимум 2, иначе спарклайн не рисуется (нечего показывать одной точкой). */
  sparkline: T[]
  sparklineKey: Extract<keyof T, string>
  sparklineColor: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
            {label}
            <InfoTooltip>{tooltip}</InfoTooltip>
          </div>
          <div
            className={cn(
              'font-display text-2xl font-bold tracking-tight mt-1',
              accent === 'positive' && 'text-positive-500',
              accent === 'negative' && 'text-negative-500',
              accent === 'neutral' && 'text-ink-50',
            )}
          >
            {value}
          </div>
          {deltaLabel && <div className="mt-1 text-xs font-medium text-ink-500">{deltaLabel}</div>}
        </div>
        {sparkline.length >= 2 && (
          <div className="w-20 h-10 shrink-0 print:hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line type="monotone" dataKey={sparklineKey} stroke={sparklineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  )
}
