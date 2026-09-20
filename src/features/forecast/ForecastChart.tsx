import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORICAL, CHART_CHROME } from '@/lib/chartColors'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyForecastPoint } from '@/types/scenario'

export function ForecastChart({ points }: { points: MonthlyForecastPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
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
        <Line type="monotone" dataKey="revenue" name="Выручка" stroke={CATEGORICAL.slot1} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expenses" name="Расходы" stroke={CATEGORICAL.slot2} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="netProfit" name="Прибыль" stroke={CATEGORICAL.slot3} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cashFlow" name="Cash Flow" stroke={CATEGORICAL.slot4} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
