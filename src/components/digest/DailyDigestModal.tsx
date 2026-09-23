import { AlertTriangle, Calendar, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useBusinessStore } from '@/store/businessStore'
import { useUiPreferencesStore } from '@/store/uiPreferencesStore'
import { useFinancials } from '@/hooks/useFinancials'
import { useDiagnostics } from '@/hooks/useDiagnostics'
import { buildCashFlowSummary } from '@/lib/finance/cashflow'
import { calculateForecast, findCashFlowGap } from '@/lib/finance/forecast'
import { buildInventoryDigest } from '@/lib/finance/dailyDigest'
import { formatCurrency, cn } from '@/lib/utils'
import { HEALTH_STATUS_LABELS } from '@/types/diagnostics'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
}

/**
 * Всплывает не чаще раза в календарный день на бизнес — сравнивает сегодняшнюю дату
 * с bfos-ui-preferences (localStorage), а не с состоянием сессии, так что переживает
 * перезагрузку страницы в тот же день.
 */
export function DailyDigestModal() {
  const status = useBusinessStore((s) => s.status)
  const businessId = useBusinessStore((s) => s.activeBusinessId)
  const profile = useBusinessStore((s) => s.profile)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)
  const products = useBusinessStore((s) => s.products)
  const stockMovements = useBusinessStore((s) => s.stockMovements)

  const { inputs, snapshot } = useFinancials()
  const diagnostics = useDiagnostics()

  const lastSeen = useUiPreferencesStore((s) => (businessId ? s.digestLastSeenByBusiness[businessId] : undefined))
  const markDigestSeen = useUiPreferencesStore((s) => s.markDigestSeen)

  const today = todayStr()
  const shouldShow = status === 'ready' && !!businessId && !!profile && !!inputs && !!snapshot && !!diagnostics && lastSeen !== today

  if (!shouldShow || !businessId || !profile || !inputs || !snapshot || !diagnostics) return null

  const sinceDate = lastSeen && lastSeen < today ? lastSeen : addDays(today, -1)
  const sinceLabel = sinceDate === addDays(today, -1) && !lastSeen ? 'вчера' : formatDateLong(sinceDate)

  const cashBalance = cashFlowInputs ? buildCashFlowSummary(cashFlowInputs).closingBalance : 0
  const forecastPoints = calculateForecast(inputs, forecastConfig, {
    currentEmployeesCount: profile.employeesCount,
    openingCash: balanceSheet?.currentAssets.cash ?? 0,
  })
  const cashFlowGap = findCashFlowGap(forecastPoints)

  const inventoryDigest = products.length > 0 ? buildInventoryDigest(products, stockMovements, sinceDate, today) : null

  function close() {
    markDigestSeen(businessId!, today)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80" onClick={close} />
      <div className="relative w-full max-w-[600px] max-h-[85vh] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-7 py-6 border-b border-ink-800 shrink-0">
          <div className="flex gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-[11px] bg-brand-500/15 shrink-0">
              <Calendar className="size-5 text-brand-400" />
            </div>
            <div>
              <div className="font-display text-xl font-bold text-ink-50">Сводка за сегодня</div>
              <div className="text-[13px] text-ink-500 mt-0.5">
                {profile.name} · {formatDateLong(today)} · с прошлого входа: {sinceLabel}
              </div>
            </div>
          </div>
          <button aria-label="Закрыть" onClick={close} className="text-ink-500 hover:text-ink-200 transition-colors shrink-0">
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="px-7 py-6 overflow-y-auto scrollbar-thin space-y-5">
          {cashFlowGap && (
            <div className="flex gap-2.5 items-start rounded-xl border border-negative-500/30 bg-negative-500/10 px-4 py-3.5">
              <AlertTriangle className="size-[17px] text-negative-500 shrink-0 mt-px" />
              <div className="text-[13.5px] leading-relaxed text-ink-100">
                Риск кассового разрыва через {cashFlowGap.monthIndex + 1} мес. — не хватит ≈{formatCurrency(cashFlowGap.shortfall)}.{' '}
                <Link to="/app/forecast" onClick={close} className="text-ink-400 hover:text-ink-200 underline underline-offset-2">
                  Проверить «Прогноз»
                </Link>
              </div>
            </div>
          )}

          <div>
            <div className="text-[11.5px] font-semibold tracking-wide uppercase text-ink-500 mb-2.5">Главное сейчас</div>
            <div className="grid grid-cols-2 gap-2.5">
              <DigestTile label="Остаток денег" value={formatCurrency(cashBalance)} />
              <DigestTile label={`Выручка в периоде ${inputs.period}`} value={formatCurrency(snapshot.revenue)} />
              <DigestTile
                label="Прибыль в периоде"
                value={formatCurrency(snapshot.netProfit)}
                accent={snapshot.netProfit >= 0 ? 'positive' : 'negative'}
              />
              <DigestTile
                label="Health Score"
                value={`${diagnostics.healthScore} / 100`}
                sub={HEALTH_STATUS_LABELS[diagnostics.healthStatus]}
                accent={diagnostics.healthStatus === 'stable' ? 'positive' : diagnostics.healthStatus === 'critical' ? 'negative' : 'warning'}
              />
            </div>
          </div>

          {inventoryDigest && (
            <>
              <div className="h-px bg-ink-800" />
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="text-[11.5px] font-semibold tracking-wide uppercase text-ink-500">Склад · с {sinceLabel}</div>
                  <InfoTooltip>
                    Стоимость и движения — фактические, по журналу склада с даты прошлого визита. Если
                    заходите впервые за день — считается от вчерашнего дня.
                  </InfoTooltip>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                  <DigestTile
                    small
                    label="Стоимость склада"
                    value={formatCurrency(inventoryDigest.valueNow)}
                    sub={
                      inventoryDigest.valueDelta !== 0
                        ? `${inventoryDigest.valueDelta > 0 ? '+' : ''}${formatCurrency(inventoryDigest.valueDelta)}`
                        : 'без изменений'
                    }
                    accent={inventoryDigest.valueDelta > 0 ? 'positive' : inventoryDigest.valueDelta < 0 ? 'negative' : undefined}
                  />
                  <DigestTile
                    small
                    label="Движений"
                    value={`${inventoryDigest.movements.movementsCount}`}
                    sub={`${inventoryDigest.movements.receiptsCount} прих. · ${inventoryDigest.movements.salesCount} прод.`}
                  />
                  <DigestTile
                    small
                    label="Требуют внимания"
                    value={`${inventoryDigest.alerts.length}`}
                    sub={
                      inventoryDigest.alerts.length > 0
                        ? `${inventoryDigest.alerts.filter((a) => a.level === 'low').length} мало · ${inventoryDigest.alerts.filter((a) => a.level === 'critical').length} критично`
                        : 'всё в норме'
                    }
                    accent={inventoryDigest.alerts.some((a) => a.level === 'critical') ? 'negative' : inventoryDigest.alerts.length > 0 ? 'warning' : undefined}
                  />
                </div>

                {inventoryDigest.alerts.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {inventoryDigest.alerts.slice(0, 5).map((a) => (
                      <div
                        key={a.productId}
                        className={cn(
                          'flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5',
                          a.level === 'critical' ? 'border-negative-500/25 bg-negative-500/8' : 'border-warning-500/25 bg-warning-500/8',
                        )}
                      >
                        <span className={cn('size-1.5 rounded-full shrink-0', a.level === 'critical' ? 'bg-negative-500' : 'bg-warning-500')} />
                        <div className="flex-1 text-[13px] text-ink-100">
                          {a.productName} —{' '}
                          {a.onHand <= 0
                            ? 'закончился'
                            : a.runwayDays !== null
                              ? `хватит на ${Math.round(a.runwayDays)} дн.`
                              : 'ниже минимального остатка'}
                        </div>
                        <div className="text-xs text-ink-500 tabular-nums">
                          {a.onHand} {a.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-7 py-4.5 border-t border-ink-800 shrink-0">
          <Button variant="outline" onClick={close}>
            Закрыть
          </Button>
          <Button asChild onClick={close}>
            <Link to="/app/dashboard">Открыть Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function DigestTile({
  label,
  value,
  sub,
  accent,
  small,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'positive' | 'negative' | 'warning'
  small?: boolean
}) {
  const accentClass = accent === 'positive' ? 'text-positive-500' : accent === 'negative' ? 'text-negative-500' : accent === 'warning' ? 'text-warning-500' : 'text-ink-500'
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 px-3.5 py-3">
      <div className={cn('text-ink-500', small ? 'text-[11.5px]' : 'text-xs')}>{label}</div>
      <div className={cn('font-display font-bold text-ink-50 mt-1 tabular-nums', small ? 'text-[17px]' : 'text-xl')}>{value}</div>
      {sub && <div className={cn('mt-0.5 tabular-nums', small ? 'text-[11.5px]' : 'text-xs', accentClass)}>{sub}</div>}
    </div>
  )
}
