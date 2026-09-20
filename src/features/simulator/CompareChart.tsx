import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORICAL, CHART_CHROME } from '@/lib/chartColors'
import { formatCurrency } from '@/lib/utils'

interface CompareDatum {
  metric: string
  before: number
  after: number
}

export function CompareChart({ data }: { data: CompareDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_CHROME.gridline} vertical={false} />
        <XAxis dataKey="metric" tick={{ fill: CHART_CHROME.mutedInk, fontSize: 12 }} axisLine={{ stroke: CHART_CHROME.axis }} tickLine={false} />
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
        <Bar dataKey="before" name="Было" fill={CATEGORICAL.slot1} radius={[4, 4, 0, 0]} />
        <Bar dataKey="after" name="Стало" fill={CATEGORICAL.slot2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
