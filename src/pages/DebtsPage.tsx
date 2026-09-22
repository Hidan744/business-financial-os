import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials, buildSnapshotContext } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { buildAmortizationSchedule, splitFirstMonthPayment } from '@/lib/finance/loan'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { formatCurrency, formatPercent } from '@/lib/utils'

const DEFAULT_LOAN_AMOUNT = 1000000
const DEFAULT_LOAN_RATE_PCT = 18
const DEFAULT_LOAN_TERM_MONTHS = 12

export function DebtsPage() {
  const { inputs, snapshot } = useFinancials()
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const [loanAmount, setLoanAmount] = useState(DEFAULT_LOAN_AMOUNT)
  const [loanRatePct, setLoanRatePct] = useState(DEFAULT_LOAN_RATE_PCT)
  const [loanTermMonths, setLoanTermMonths] = useState(DEFAULT_LOAN_TERM_MONTHS)

  const outstandingDebt = balanceSheet
    ? balanceSheet.currentLiabilities.shortTermDebt + balanceSheet.nonCurrentLiabilities.longTermDebt
    : 0

  const schedule = useMemo(
    () => buildAmortizationSchedule(loanAmount, loanRatePct, loanTermMonths),
    [loanAmount, loanRatePct, loanTermMonths],
  )
  const firstMonth = useMemo(
    () => splitFirstMonthPayment(loanAmount, loanRatePct, loanTermMonths),
    [loanAmount, loanRatePct, loanTermMonths],
  )

  const totals = useMemo(() => {
    const totalPaid = schedule.reduce((sum, r) => sum + r.payment, 0)
    const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0)
    return { totalPaid, totalInterest }
  }, [schedule])

  const afterSnapshot = useMemo(() => {
    if (!inputs || !firstMonth) return null
    const context = buildSnapshotContext(balanceSheet, cashFlowInputs)
    return buildFinancialSnapshot(
      {
        ...inputs,
        loanInterest: inputs.loanInterest + firstMonth.interest,
        loanPayments: inputs.loanPayments + firstMonth.principalRepayment,
      },
      { ...context, outstandingDebt: (context.outstandingDebt ?? 0) + loanAmount },
    )
  }, [inputs, firstMonth, balanceSheet, cashFlowInputs, loanAmount])

  if (!inputs || !snapshot) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Долги</h1>
        <p className="text-sm text-ink-500 mt-1">Текущая долговая нагрузка и калькулятор нового кредита.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Текущая долговая нагрузка</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid sm:grid-cols-4 gap-4">
            <DebtTile
              label="Остаток долга"
              value={formatCurrency(outstandingDebt)}
              tooltip="Кратко- + долгосрочный долг на конец периода, из раздела «Баланс» → «Обязательства». Заполните его там, если видите 0, но кредит есть."
            />
            <DebtTile
              label="Долг / EBITDA"
              value={snapshot.debtToEbitda !== null ? `${snapshot.debtToEbitda.toFixed(2)}×` : '—'}
              tooltip="Остаток долга (из «Баланса») к годовой EBITDA. Меньше 3× обычно считается безопасным уровнем. «—» — если остаток долга не указан в балансе или EBITDA ≤ 0."
              accent={
                snapshot.debtToEbitda === null ? undefined : snapshot.debtToEbitda <= 3 ? 'positive' : snapshot.debtToEbitda <= 4 ? 'neutral' : 'negative'
              }
            />
            <DebtTile
              label="Debt Service / Выручка"
              value={formatPercent(snapshot.debtServiceRatioPct)}
              tooltip="Платежи по кредитам за период — тело + проценты — как доля выручки за тот же период."
              accent={snapshot.debtServiceRatioPct <= 15 ? 'positive' : snapshot.debtServiceRatioPct <= 25 ? 'neutral' : 'negative'}
            />
            <DebtTile
              label="DSCR"
              value={snapshot.dscr !== null ? `${snapshot.dscr.toFixed(2)}×` : '—'}
              tooltip="Во сколько раз свободный денежный поток периода (EBITDA − налоги − CAPEX) покрывает обязательные платежи по долгу (тело + проценты). Выше 1.2× — комфортный запас, ниже 1× — денег не хватает даже на обслуживание долга. «—» — если платежей по долгу нет."
              accent={snapshot.dscr === null ? undefined : snapshot.dscr >= 1.5 ? 'positive' : snapshot.dscr >= 1.2 ? 'neutral' : 'negative'}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Калькулятор нового кредита</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <LoanField label="Сумма кредита, ₽" value={loanAmount} onChange={setLoanAmount} />
            <LoanField label="Ставка, % годовых" value={loanRatePct} onChange={setLoanRatePct} />
            <LoanField label="Срок, мес" value={loanTermMonths} onChange={setLoanTermMonths} />
          </div>

          {firstMonth && (
            <div className="grid sm:grid-cols-3 gap-3">
              <DebtTile label="Ежемесячный платёж" value={formatCurrency(firstMonth.payment)} />
              <DebtTile label="Всего процентов за срок" value={formatCurrency(totals.totalInterest)} />
              <DebtTile label="Всего выплат за срок" value={formatCurrency(totals.totalPaid)} />
            </div>
          )}

          {afterSnapshot && (
            <div>
              <div className="text-sm text-ink-300 mb-2">Было → Стало (первый месяц с новым кредитом)</div>
              <div className="grid sm:grid-cols-4 gap-3">
                <ImpactTile label="Чистая прибыль" before={snapshot.netProfit} after={afterSnapshot.netProfit} />
                <ImpactTile label="Cash Flow" before={snapshot.cashFlow} after={afterSnapshot.cashFlow} />
                <ImpactTile
                  label="Долг / EBITDA"
                  before={snapshot.debtToEbitda}
                  after={afterSnapshot.debtToEbitda}
                  format={(v) => (v !== null ? `${v.toFixed(2)}×` : '—')}
                />
                <ImpactTile
                  label="DSCR"
                  before={snapshot.dscr}
                  after={afterSnapshot.dscr}
                  format={(v) => (v !== null ? `${v.toFixed(2)}×` : '—')}
                />
              </div>
            </div>
          )}

          {schedule.length > 0 && (
            <div>
              <div className="text-sm text-ink-300 mb-2">График погашения</div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-ink-800">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-ink-950">
                    <tr className="text-left text-ink-500 border-b border-ink-800">
                      <th className="py-2 pl-4 pr-4 font-medium">Месяц</th>
                      <th className="py-2 pr-4 font-medium text-right">Платёж</th>
                      <th className="py-2 pr-4 font-medium text-right">Проценты</th>
                      <th className="py-2 pr-4 font-medium text-right">Тело</th>
                      <th className="py-2 pr-4 font-medium text-right">Остаток долга</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.month} className="border-b border-ink-800/60">
                        <td className="py-2 pl-4 pr-4 text-ink-200">{row.month}</td>
                        <td className="py-2 pr-4 text-right text-ink-100 tabular-nums">{formatCurrency(row.payment)}</td>
                        <td className="py-2 pr-4 text-right text-ink-400 tabular-nums">{formatCurrency(row.interest)}</td>
                        <td className="py-2 pr-4 text-right text-ink-400 tabular-nums">{formatCurrency(row.principal)}</td>
                        <td className="py-2 pr-4 text-right text-ink-300 tabular-nums">{formatCurrency(row.remainingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoanField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-ink-400">{label}</span>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  )
}

function DebtTile({
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

function formatCurrencyOrDash(value: number | null): string {
  return value !== null ? formatCurrency(value) : '—'
}

function ImpactTile({
  label,
  before,
  after,
  format = formatCurrencyOrDash,
}: {
  label: string
  before: number | null
  after: number | null
  format?: (v: number | null) => string
}) {
  const delta = before !== null && after !== null ? after - before : null
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm text-ink-500 line-through">{format(before)}</span>
        <span className="text-lg font-semibold text-ink-50">{format(after)}</span>
        {delta !== null && (
          <span className={`text-xs ${delta >= 0 ? 'text-positive-500' : 'text-negative-500'}`}>
            ({delta >= 0 ? '+' : ''}
            {format(delta)})
          </span>
        )}
      </div>
    </div>
  )
}
