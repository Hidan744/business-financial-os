import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CATEGORICAL, CHART_CHROME } from '@/lib/chartColors'
import { formatCurrency } from '@/lib/utils'
import { formatPeriodLabel } from '@/lib/period'
import type { FinancialInputs } from '@/types/finance'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'

export function HistoryChart({ records }: { records: FinancialInputs[] }) {
  const data = records
    .slice()
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((r) => {
      const snapshot = buildFinancialSnapshot(r)
      return {
        label: formatPeriodLabel(r.period).slice(0, 3),
        revenue: snapshot.revenue,
        netProfit: snapshot.netProfit,
      }
    })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
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
        <Line type="monotone" dataKey="revenue" name="Выручка (факт)" stroke={CATEGORICAL.slot1} strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="netProfit" name="Чистая прибыль (факт)" stroke={CATEGORICAL.slot3} strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
