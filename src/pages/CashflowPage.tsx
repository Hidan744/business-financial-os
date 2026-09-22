import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CashFlowRow } from '@/features/cashflow/CashFlowRow'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useBusinessStore } from '@/store/businessStore'
import { useFinancials } from '@/hooks/useFinancials'
import { buildCashFlowSummary } from '@/lib/finance/cashflow'
import { reconcileCashWithBalanceSheet } from '@/lib/finance/balanceSheet'
import { formatCurrency, cn } from '@/lib/utils'
import { useMemo } from 'react'
import type { CashFlowInputs } from '@/types/finance'

export function CashflowPage() {
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const updateCashFlowInputs = useBusinessStore((s) => s.updateCashFlowInputs)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const { snapshot } = useFinancials()

  const summary = useMemo(() => (cashFlowInputs ? buildCashFlowSummary(cashFlowInputs) : null), [cashFlowInputs])

  if (!cashFlowInputs || !summary) return null

  const plImpliedCashFlow = snapshot?.cashFlow ?? null
  const reconciliationGap = plImpliedCashFlow !== null ? summary.netCashFlow - plImpliedCashFlow : null
  const significantGap = reconciliationGap !== null && Math.abs(reconciliationGap) > Math.abs(summary.netCashFlow) * 0.1 + 1000

  const balanceCheck = balanceSheet ? reconcileCashWithBalanceSheet(summary.closingBalance, balanceSheet.currentAssets.cash) : null

  function patchOperating(patch: Partial<CashFlowInputs['operating']>) {
    updateCashFlowInputs({ operating: { ...cashFlowInputs!.operating, ...patch } })
  }
  function patchInvesting(patch: Partial<CashFlowInputs['investing']>) {
    updateCashFlowInputs({ investing: { ...cashFlowInputs!.investing, ...patch } })
  }
  function patchFinancing(patch: Partial<CashFlowInputs['financing']>) {
    updateCashFlowInputs({ financing: { ...cashFlowInputs!.financing, ...patch } })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Cash Flow</h1>
        <p className="text-sm text-ink-500 mt-1">Движение денежных средств за период.</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <SummaryTile label="Начало периода" value={summary.openingBalance} />
        <SummaryTile label="Чистый Cash Flow" value={summary.netCashFlow} accent />
        <SummaryTile label="Конец периода" value={summary.closingBalance} />
        <SummaryTile label="Операционный поток" value={summary.operatingNet} />
      </div>

      {plImpliedCashFlow !== null && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-xs flex items-start gap-1.5',
            significantGap ? 'border-warning-500/30 bg-warning-500/10 text-warning-500' : 'border-ink-800 text-ink-500',
          )}
        >
          <InfoTooltip>
            Эта страница — детальный Cash Flow (поступления/выплаты по операционной, инвестиционной и финансовой
            деятельности). На Dashboard/в Прогнозе используется более простой расчёт из П&Л (выручка минус все
            расходы и налоги). Они не обязаны совпадать точно — реальные деньги приходят не в момент начисления
            выручки, а разница чаще всего в дебиторке/кредиторке, CAPEX и финансировании — но большое расхождение
            стоит перепроверить.
          </InfoTooltip>
          <span>
            Сверка с упрощённым расчётом (Dashboard/Прогноз): {formatCurrency(plImpliedCashFlow)}, разница{' '}
            {reconciliationGap !== null && reconciliationGap >= 0 ? '+' : ''}
            {reconciliationGap !== null ? formatCurrency(reconciliationGap) : '—'}
            {significantGap ? ' — существенная, стоит перепроверить ввод.' : '.'}
          </span>
        </div>
      )}

      {balanceCheck && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-xs flex items-start gap-1.5',
            balanceCheck.isSignificant ? 'border-negative-500/30 bg-negative-500/10 text-negative-500' : 'border-ink-800 text-ink-500',
          )}
        >
          <InfoTooltip>
            Это не оценка, а проверка на тождество: остаток денег на конец периода по Cash Flow
            (начало + чистый поток) и «Деньги (касса, счета)» в Балансе — это буквально одна и та
            же величина на одну и ту же дату, введённая в двух разных местах. Если она не совпадает —
            где-то ошибка ввода, а не разница методик (в отличие от сверки с П&Л выше).
          </InfoTooltip>
          <span>
            Остаток денег по Балансу: {formatCurrency(balanceCheck.balanceSheetCash)}, по Cash Flow:{' '}
            {formatCurrency(balanceCheck.cashFlowClosingBalance)}
            {balanceCheck.isSignificant
              ? ` — расхождение ${balanceCheck.gap >= 0 ? '+' : ''}${formatCurrency(balanceCheck.gap)}, должно быть 0. Проверьте ввод на этой странице или в Балансе.`
              : ' — сходится.'}
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Операционная деятельность</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 divide-y divide-ink-800/60">
          <CashFlowRow label="Поступления от клиентов" value={cashFlowInputs.operating.customerPayments} onChange={(v) => patchOperating({ customerPayments: v })} />
          <CashFlowRow label="Выплаты поставщикам" value={cashFlowInputs.operating.supplierPayments} onChange={(v) => patchOperating({ supplierPayments: v })} />
          <CashFlowRow label="Зарплаты" value={cashFlowInputs.operating.payroll} onChange={(v) => patchOperating({ payroll: v })} />
          <CashFlowRow label="Аренда" value={cashFlowInputs.operating.rent} onChange={(v) => patchOperating({ rent: v })} />
          <CashFlowRow label="Реклама" value={cashFlowInputs.operating.marketing} onChange={(v) => patchOperating({ marketing: v })} />
          <CashFlowRow label="Налоги" value={cashFlowInputs.operating.taxes} onChange={(v) => patchOperating({ taxes: v })} />
          <CashFlowRow label="Прочие операционные расходы" value={cashFlowInputs.operating.otherOperating} onChange={(v) => patchOperating({ otherOperating: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Инвестиционная деятельность</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 divide-y divide-ink-800/60">
          <CashFlowRow label="Оборудование" value={cashFlowInputs.investing.equipment} onChange={(v) => patchInvesting({ equipment: v })} />
          <CashFlowRow label="Ремонт" value={cashFlowInputs.investing.repairs} onChange={(v) => patchInvesting({ repairs: v })} />
          <CashFlowRow label="Покупка активов" value={cashFlowInputs.investing.assetPurchases} onChange={(v) => patchInvesting({ assetPurchases: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Финансовая деятельность</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 divide-y divide-ink-800/60">
          <CashFlowRow label="Получение кредита" value={cashFlowInputs.financing.loanReceived} onChange={(v) => patchFinancing({ loanReceived: v })} />
          <CashFlowRow label="Погашение кредита" value={cashFlowInputs.financing.loanRepaid} onChange={(v) => patchFinancing({ loanRepaid: v })} />
          <CashFlowRow label="Инвестиции владельца" value={cashFlowInputs.financing.ownerInvestment} onChange={(v) => patchFinancing({ ownerInvestment: v })} />
          <CashFlowRow label="Вывод денег владельцем" value={cashFlowInputs.financing.ownerWithdrawal} onChange={(v) => patchFinancing({ ownerWithdrawal: v })} />
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className={cn('text-lg font-semibold', accent ? (value >= 0 ? 'text-positive-500' : 'text-negative-500') : 'text-ink-50')}>
        {formatCurrency(value)}
      </div>
    </Card>
  )
}
