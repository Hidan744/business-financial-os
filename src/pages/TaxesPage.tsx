import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { getFixedCosts } from '@/lib/finance/snapshot'
import { calculateTaxForRegime } from '@/lib/finance/tax'
import { TAX_REGIME_LABELS, type TaxRegime } from '@/types/tax'
import { formatCurrency } from '@/lib/utils'

export function TaxesPage() {
  const { inputs, snapshot } = useFinancials()
  const taxSettings = useBusinessStore((s) => s.taxSettings)
  const updateTaxSettings = useBusinessStore((s) => s.updateTaxSettings)
  const updateFinancialInputs = useBusinessStore((s) => s.updateFinancialInputs)

  if (!inputs || !snapshot) return null

  const expenses = inputs.cogs + getFixedCosts(inputs)
  const result = calculateTaxForRegime(taxSettings.regime, taxSettings, {
    revenue: inputs.revenue,
    expenses,
    ebit: snapshot.ebit,
  })

  const mismatch = Math.round(result.amount) !== inputs.taxes

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Налоги</h1>
        <p className="text-sm text-ink-500 mt-1">Калькулятор налога по режиму — вместо ручного ввода суммы в Финансах.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Налоговый режим</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-5">
          <div className="max-w-sm">
            <Label>Режим</Label>
            <Select value={taxSettings.regime} onValueChange={(v) => updateTaxSettings({ regime: v as TaxRegime })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TAX_REGIME_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {taxSettings.regime === 'usn_income' && (
            <div className="max-w-xs">
              <Label htmlFor="usn-income-rate">Ставка, % от выручки</Label>
              <Input
                id="usn-income-rate"
                inputMode="decimal"
                value={taxSettings.usnIncomeRatePct}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(',', '.'))
                  updateTaxSettings({ usnIncomeRatePct: Number.isFinite(v) ? v : 0 })
                }}
                className="mt-2"
              />
              <p className="text-xs text-ink-500 mt-1.5">Стандартно 6%, регион может снижать до 1%.</p>
            </div>
          )}

          {taxSettings.regime === 'usn_income_minus_expenses' && (
            <div className="max-w-xs">
              <Label htmlFor="usn-ime-rate">Ставка, % от (выручка − расходы)</Label>
              <Input
                id="usn-ime-rate"
                inputMode="decimal"
                value={taxSettings.usnIncomeMinusExpensesRatePct}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(',', '.'))
                  updateTaxSettings({ usnIncomeMinusExpensesRatePct: Number.isFinite(v) ? v : 0 })
                }}
                className="mt-2"
              />
              <p className="text-xs text-ink-500 mt-1.5">Стандартно 15%, регион может снижать до 5%. Расходы: {formatCurrency(expenses)}.</p>
            </div>
          )}

          {taxSettings.regime === 'osn' && (
            <div className="max-w-xs">
              <Label htmlFor="osn-rate">Ставка налога на прибыль, %</Label>
              <Input
                id="osn-rate"
                inputMode="decimal"
                value={taxSettings.osnProfitTaxRatePct}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(',', '.'))
                  updateTaxSettings({ osnProfitTaxRatePct: Number.isFinite(v) ? v : 0 })
                }}
                className="mt-2"
              />
            </div>
          )}

          {taxSettings.regime === 'patent' && (
            <div className="max-w-xs">
              <Label htmlFor="patent-cost">Стоимость патента в год, ₽</Label>
              <Input
                id="patent-cost"
                inputMode="decimal"
                value={taxSettings.patentAnnualCost}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/\s/g, '').replace(',', '.'))
                  updateTaxSettings({ patentAnnualCost: Number.isFinite(v) && v >= 0 ? v : 0 })
                }}
                className="mt-2"
              />
            </div>
          )}

          {taxSettings.regime === 'npd' && (
            <div className="max-w-xs">
              <Label>Ставка</Label>
              <Select
                value={String(taxSettings.npdRatePct)}
                onValueChange={(v) => updateTaxSettings({ npdRatePct: Number(v) })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4% — доход от физлиц</SelectItem>
                  <SelectItem value="6">6% — доход от ИП/юрлиц</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Расчёт
            <InfoTooltip>{result.note}</InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-ink-800 px-4 py-3">
              <div className="text-xs text-ink-400 mb-1">Налог по расчёту ({TAX_REGIME_LABELS[taxSettings.regime]})</div>
              <div className="text-lg font-semibold text-ink-50">{formatCurrency(result.amount)}</div>
            </div>
            <div className="rounded-xl border border-ink-800 px-4 py-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-ink-400 mb-1">Сейчас в Финансах</div>
                <div className={`text-lg font-semibold ${mismatch ? 'text-warning-500' : 'text-ink-50'}`}>{formatCurrency(inputs.taxes)}</div>
              </div>
              {mismatch && (
                <Button size="sm" variant="secondary" onClick={() => updateFinancialInputs({ taxes: Math.round(result.amount) })}>
                  Применить
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-ink-500">{result.note}</p>
        </CardContent>
      </Card>
    </div>
  )
}
