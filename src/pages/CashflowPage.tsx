import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CashFlowRow } from '@/features/cashflow/CashFlowRow'
import { useBusinessStore } from '@/store/businessStore'
import { buildCashFlowSummary } from '@/lib/finance/cashflow'
import { formatCurrency, cn } from '@/lib/utils'
import { useMemo } from 'react'
import type { CashFlowInputs } from '@/types/finance'

export function CashflowPage() {
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const updateCashFlowInputs = useBusinessStore((s) => s.updateCashFlowInputs)

  const summary = useMemo(() => (cashFlowInputs ? buildCashFlowSummary(cashFlowInputs) : null), [cashFlowInputs])

  if (!cashFlowInputs || !summary) return null

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
