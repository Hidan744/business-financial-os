import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PnLRow } from '@/features/finance/PnLRow'
import { ExpenseLineEditor } from '@/features/finance/ExpenseLineEditor'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { getFixedCosts } from '@/lib/finance/snapshot'
import { InfoTooltip } from '@/components/ui/tooltip'

export function FinancePage() {
  const { inputs, snapshot } = useFinancials()
  const updateFinancialInputs = useBusinessStore((s) => s.updateFinancialInputs)

  if (!inputs || !snapshot) return null

  const customTotal = inputs.customExpenseLines.reduce((s, l) => s + l.amount, 0)
  const fixedCosts = getFixedCosts(inputs)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Финансы · P&amp;L</h1>
        <p className="text-sm text-ink-500 mt-1">
          Отчёт о прибылях и убытках. Нажмите на сумму, чтобы изменить значение.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Отчёт о прибылях и убытках</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <PnLRow label="Выручка" value={inputs.revenue} editable onChange={(v) => updateFinancialInputs({ revenue: v })} />
          <PnLRow
            label="Себестоимость"
            value={inputs.cogs}
            sign="-"
            editable
            onChange={(v) => updateFinancialInputs({ cogs: v })}
          />
          <PnLRow label="Валовая прибыль" value={snapshot.grossProfit} sign="=" kind="subtotal" />

          <PnLRow label="ФОТ" value={inputs.payroll} sign="-" editable onChange={(v) => updateFinancialInputs({ payroll: v })} />
          <PnLRow label="Аренда" value={inputs.rent} sign="-" editable onChange={(v) => updateFinancialInputs({ rent: v })} />
          <PnLRow label="Реклама" value={inputs.marketing} sign="-" editable onChange={(v) => updateFinancialInputs({ marketing: v })} />
          <PnLRow label="Логистика" value={inputs.logistics} sign="-" editable onChange={(v) => updateFinancialInputs({ logistics: v })} />
          <PnLRow
            label="Коммунальные расходы"
            value={inputs.utilities}
            sign="-"
            editable
            onChange={(v) => updateFinancialInputs({ utilities: v })}
          />
          <PnLRow label="ПО / сервисы" value={inputs.software} sign="-" editable onChange={(v) => updateFinancialInputs({ software: v })} />
          <PnLRow label="Прочие статьи расходов" value={customTotal} sign="-" />

          <div className="pl-5 pb-1">
            <ExpenseLineEditor lines={inputs.customExpenseLines} />
          </div>

          <PnLRow
            label="EBITDA"
            value={snapshot.ebitda}
            sign="="
            kind="subtotal"
            extra={
              <InfoTooltip>Прибыль до вычета процентов, налогов и амортизации.</InfoTooltip>
            }
          />

          <PnLRow
            label="Амортизация"
            value={inputs.depreciation}
            sign="-"
            editable
            onChange={(v) => updateFinancialInputs({ depreciation: v })}
          />
          <PnLRow
            label="Проценты по кредитам"
            value={inputs.loanInterest}
            sign="-"
            editable
            onChange={(v) => updateFinancialInputs({ loanInterest: v })}
          />
          <PnLRow label="Налоги" value={inputs.taxes} sign="-" editable onChange={(v) => updateFinancialInputs({ taxes: v })} />

          <PnLRow label="Чистая прибыль" value={snapshot.netProfit} sign="=" kind="total" />
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-xs text-ink-400 mb-1">Постоянные расходы (всего)</div>
          <div className="text-lg font-semibold text-ink-50">
            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(fixedCosts)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-ink-400 mb-1">Валовая маржа</div>
          <div className="text-lg font-semibold text-ink-50">{snapshot.grossMarginPct.toFixed(1)}%</div>
        </Card>
      </div>
    </div>
  )
}
