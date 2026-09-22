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
          <PnLRow
            label="  из них — выручка, атрибутированная рекламе"
            value={inputs.attributedRevenue ?? 0}
            editable
            onChange={(v) => updateFinancialInputs({ attributedRevenue: v })}
            extra={
              <InfoTooltip>
                Опционально: выручка, которую вы можете связать именно с рекламными каналами (например, из данных
                рекламного кабинета или промокодов). Без этого поля показатель ROMI посчитать нельзя — система не
                отличает продажи из рекламы от остальных сама.
              </InfoTooltip>
            }
          />
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
            label="EBIT"
            value={snapshot.ebit}
            sign="="
            kind="subtotal"
            extra={<InfoTooltip>Операционная прибыль после амортизации, но до процентов и налогов.</InfoTooltip>}
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

      <Card className="p-5">
        <div className="text-xs text-ink-400 mb-1">Постоянные расходы (всего)</div>
        <div className="text-lg font-semibold text-ink-50">
          {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(fixedCosts)}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Рентабельность</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MarginTile
              label="Валовая маржа"
              value={snapshot.grossMarginPct}
              tooltip="(Выручка − Себестоимость) / Выручка. Сколько остаётся после прямых затрат на товар/услугу."
            />
            <MarginTile
              label="Маржинальная прибыль"
              value={snapshot.contributionMarginPct}
              tooltip="(Выручка − Переменные затраты) / Выручка. Доля выручки, покрывающая постоянные расходы."
            />
            <MarginTile
              label="EBITDA маржа"
              value={snapshot.ebitdaMarginPct}
              tooltip="EBITDA / Выручка. Операционная эффективность без учёта амортизации, процентов и налогов."
            />
            <MarginTile
              label="EBIT маржа"
              value={snapshot.ebitMarginPct}
              tooltip="EBIT / Выручка. Операционная эффективность с учётом амортизации, но без процентов и налогов."
            />
            <MarginTile
              label="Чистая маржа"
              value={snapshot.netMarginPct}
              tooltip="Чистая прибыль / Выручка. Итоговая доходность бизнеса после всех расходов."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MarginTile({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
        {label}
        <InfoTooltip>{tooltip}</InfoTooltip>
      </div>
      <div className={`text-lg font-semibold ${value >= 0 ? 'text-ink-50' : 'text-negative-500'}`}>{value.toFixed(1)}%</div>
    </div>
  )
}
