import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CashFlowRow } from '@/features/cashflow/CashFlowRow'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { buildBalanceSheetSnapshot, calculateWorkingCapitalMetrics } from '@/lib/finance/balanceSheet'
import { formatCurrency } from '@/lib/utils'
import type { BalanceSheetInputs } from '@/types/finance'

export function BalancePage() {
  const { inputs } = useFinancials()
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const updateBalanceSheet = useBusinessStore((s) => s.updateBalanceSheet)

  if (!inputs || !balanceSheet) return null

  const snapshot = buildBalanceSheetSnapshot(balanceSheet)
  const workingCapitalMetrics = calculateWorkingCapitalMetrics(
    balanceSheet.currentAssets.receivables,
    balanceSheet.currentLiabilities.payables,
    balanceSheet.currentAssets.inventory,
    inputs.revenue,
    inputs.cogs,
  )

  function patchCurrentAssets(patch: Partial<BalanceSheetInputs['currentAssets']>) {
    updateBalanceSheet({ currentAssets: { ...balanceSheet!.currentAssets, ...patch } })
  }
  function patchNonCurrentAssets(patch: Partial<BalanceSheetInputs['nonCurrentAssets']>) {
    updateBalanceSheet({ nonCurrentAssets: { ...balanceSheet!.nonCurrentAssets, ...patch } })
  }
  function patchCurrentLiabilities(patch: Partial<BalanceSheetInputs['currentLiabilities']>) {
    updateBalanceSheet({ currentLiabilities: { ...balanceSheet!.currentLiabilities, ...patch } })
  }
  function patchNonCurrentLiabilities(patch: Partial<BalanceSheetInputs['nonCurrentLiabilities']>) {
    updateBalanceSheet({ nonCurrentLiabilities: { ...balanceSheet!.nonCurrentLiabilities, ...patch } })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Баланс</h1>
        <p className="text-sm text-ink-500 mt-1">Активы, обязательства и капитал на конец периода {inputs.period}.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile label="Активы" value={snapshot.totalAssets} />
        <SummaryTile label="Обязательства" value={snapshot.totalLiabilities} />
        <SummaryTile
          label="Капитал"
          value={snapshot.equity}
          accent
          tooltip="Собственный капитал = Активы − Обязательства. Считается автоматически, чтобы баланс всегда сходился."
        />
        <SummaryTile label="Оборотный капитал" value={snapshot.workingCapital} tooltip="Оборотные активы − Краткосрочные обязательства." />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Активы</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-1 divide-y divide-ink-800/60">
            <div className="pb-1 pt-1 text-xs font-medium text-ink-500">Оборотные</div>
            <CashFlowRow label="Деньги (касса, счета)" value={balanceSheet.currentAssets.cash} onChange={(v) => patchCurrentAssets({ cash: v })} />
            <CashFlowRow label="Дебиторская задолженность" value={balanceSheet.currentAssets.receivables} onChange={(v) => patchCurrentAssets({ receivables: v })} />
            <CashFlowRow label="Запасы, товары" value={balanceSheet.currentAssets.inventory} onChange={(v) => patchCurrentAssets({ inventory: v })} />
            <CashFlowRow label="Прочие оборотные активы" value={balanceSheet.currentAssets.other} onChange={(v) => patchCurrentAssets({ other: v })} />
            <div className="pb-1 pt-3 text-xs font-medium text-ink-500">Внеоборотные</div>
            <CashFlowRow label="Основные средства" value={balanceSheet.nonCurrentAssets.fixedAssets} onChange={(v) => patchNonCurrentAssets({ fixedAssets: v })} />
            <CashFlowRow label="Прочие внеоборотные активы" value={balanceSheet.nonCurrentAssets.other} onChange={(v) => patchNonCurrentAssets({ other: v })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Обязательства</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-1 divide-y divide-ink-800/60">
            <div className="pb-1 pt-1 text-xs font-medium text-ink-500">Краткосрочные</div>
            <CashFlowRow label="Кредиторская задолженность" value={balanceSheet.currentLiabilities.payables} onChange={(v) => patchCurrentLiabilities({ payables: v })} />
            <CashFlowRow label="Краткосрочные кредиты" value={balanceSheet.currentLiabilities.shortTermDebt} onChange={(v) => patchCurrentLiabilities({ shortTermDebt: v })} />
            <CashFlowRow label="Прочие краткосрочные обязательства" value={balanceSheet.currentLiabilities.other} onChange={(v) => patchCurrentLiabilities({ other: v })} />
            <div className="pb-1 pt-3 text-xs font-medium text-ink-500">Долгосрочные</div>
            <CashFlowRow label="Долгосрочные кредиты" value={balanceSheet.nonCurrentLiabilities.longTermDebt} onChange={(v) => patchNonCurrentLiabilities({ longTermDebt: v })} />
            <CashFlowRow label="Прочие долгосрочные обязательства" value={balanceSheet.nonCurrentLiabilities.other} onChange={(v) => patchNonCurrentLiabilities({ other: v })} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ликвидность и устойчивость</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid sm:grid-cols-3 gap-4">
            <MetricTile
              label="Текущая ликвидность"
              value={snapshot.currentRatio !== null ? `${snapshot.currentRatio.toFixed(2)}×` : '—'}
              tooltip="Оборотные активы / Краткосрочные обязательства. Выше 1.5–2× обычно считается безопасным. «—» — если краткосрочных обязательств нет."
              accent={snapshot.currentRatio === null ? undefined : snapshot.currentRatio >= 1.5 ? 'positive' : snapshot.currentRatio >= 1 ? 'neutral' : 'negative'}
            />
            <MetricTile
              label="Долг / Капитал"
              value={snapshot.debtToEquity !== null ? `${snapshot.debtToEquity.toFixed(2)}×` : '—'}
              tooltip="Обязательства / Капитал. Меньше 1× — обязательства меньше капитала. «—» — если капитал отрицательный или нулевой."
              accent={snapshot.debtToEquity === null ? undefined : snapshot.debtToEquity <= 1 ? 'positive' : snapshot.debtToEquity <= 2 ? 'neutral' : 'negative'}
            />
            <MetricTile
              label="Автономия"
              value={snapshot.equityRatioPct !== null ? `${snapshot.equityRatioPct.toFixed(1)}%` : '—'}
              tooltip="Капитал / Активы. Доля бизнеса, профинансированная собственными деньгами, а не долгом."
              accent={snapshot.equityRatioPct === null ? undefined : snapshot.equityRatioPct >= 50 ? 'positive' : snapshot.equityRatioPct >= 20 ? 'neutral' : 'negative'}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Оборотный капитал
            <InfoTooltip>
              Цикл конвертации денег (CCC) — сколько дней деньги проходят путь от закупки до поступления от клиента.
              Меньше — лучше: деньги быстрее возвращаются в оборот.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid sm:grid-cols-4 gap-4">
            <MetricTile
              label="DSO — оборачиваемость дебиторки"
              value={workingCapitalMetrics.dso !== null ? `${workingCapitalMetrics.dso.toFixed(1)} дн.` : '—'}
              tooltip="За сколько дней в среднем поступают деньги от клиентов."
            />
            <MetricTile
              label="DIO — оборачиваемость запасов"
              value={workingCapitalMetrics.dio !== null ? `${workingCapitalMetrics.dio.toFixed(1)} дн.` : '—'}
              tooltip="Сколько дней в среднем товар лежит на складе."
            />
            <MetricTile
              label="DPO — оборачиваемость кредиторки"
              value={workingCapitalMetrics.dpo !== null ? `${workingCapitalMetrics.dpo.toFixed(1)} дн.` : '—'}
              tooltip="За сколько дней в среднем компания платит поставщикам."
            />
            <MetricTile
              label="Цикл конвертации денег (CCC)"
              value={workingCapitalMetrics.cashConversionCycleDays !== null ? `${workingCapitalMetrics.cashConversionCycleDays.toFixed(1)} дн.` : '—'}
              accent={
                workingCapitalMetrics.cashConversionCycleDays === null
                  ? undefined
                  : workingCapitalMetrics.cashConversionCycleDays <= 0
                    ? 'positive'
                    : 'neutral'
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryTile({ label, value, accent, tooltip }: { label: string; value: number; accent?: boolean; tooltip?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
        {label}
        {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
      </div>
      <div className={`text-lg font-semibold ${accent ? (value >= 0 ? 'text-positive-500' : 'text-negative-500') : 'text-ink-50'}`}>
        {formatCurrency(value)}
      </div>
    </Card>
  )
}

function MetricTile({
  label,
  value,
  tooltip,
  accent,
}: {
  label: string
  value: string
  tooltip?: string
  accent?: 'positive' | 'neutral' | 'negative'
}) {
  const color = accent === 'positive' ? 'text-positive-500' : accent === 'negative' ? 'text-negative-500' : 'text-ink-50'
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
        {label}
        {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
      </div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  )
}
