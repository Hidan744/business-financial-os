import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORICAL, CHART_CHROME } from '@/lib/chartColors'
import type { HistoryTrendPoint } from '@/lib/finance/reportCharts'

export function MarginTrendChart({ points }: { points: HistoryTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_CHROME.gridline} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: CHART_CHROME.mutedInk, fontSize: 12 }} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={50}
        />
        <Tooltip
          contentStyle={{ background: '#1b1e27', border: '1px solid #262a36', borderRadius: 12, fontSize: 12 }}
          formatter={(value) => `${Number(value).toFixed(1)}%`}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_CHROME.mutedInk }} />
        <Line type="monotone" dataKey="grossMarginPct" name="Валовая маржа" stroke={CATEGORICAL.slot1} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="ebitdaMarginPct" name="EBITDA маржа" stroke={CATEGORICAL.slot4} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="netMarginPct" name="Чистая маржа" stroke={CATEGORICAL.slot3} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
