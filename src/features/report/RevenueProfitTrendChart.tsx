import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORICAL, CHART_CHROME } from '@/lib/chartColors'
import { formatCurrency } from '@/lib/utils'
import type { HistoryTrendPoint } from '@/lib/finance/reportCharts'

export function RevenueProfitTrendChart({ points }: { points: HistoryTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CATEGORICAL.slot1} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CATEGORICAL.slot1} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_CHROME.gridline} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: CHART_CHROME.mutedInk, fontSize: 12 }} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={90}
        />
        <Tooltip
          contentStyle={{ background: '#1b1e27', border: '1px solid #262a36', borderRadius: 12, fontSize: 12 }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_CHROME.mutedInk }} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Выручка"
          stroke={CATEGORICAL.slot1}
          fill="url(#revenueTrendFill)"
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="netProfit"
          name="Чистая прибыль"
          stroke={CATEGORICAL.slot3}
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
