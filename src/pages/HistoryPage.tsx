import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HistoryChart } from '@/features/history/HistoryChart'
import { HistoryTable } from '@/features/history/HistoryTable'
import { AddHistoricalRecordForm } from '@/features/history/AddHistoricalRecordForm'
import { TargetSection } from '@/features/history/TargetSection'
import { useBusinessStore } from '@/store/businessStore'
import { nextPeriodOf, formatPeriodLabel } from '@/lib/period'

export function HistoryPage() {
  const profile = useBusinessStore((s) => s.profile)
  const financialInputs = useBusinessStore((s) => s.financialInputs)
  const history = useBusinessStore((s) => s.history)
  const targets = useBusinessStore((s) => s.targets)
  const closeCurrentPeriod = useBusinessStore((s) => s.closeCurrentPeriod)
  const upsertHistoricalRecord = useBusinessStore((s) => s.upsertHistoricalRecord)
  const removeHistoricalRecord = useBusinessStore((s) => s.removeHistoricalRecord)
  const setTarget = useBusinessStore((s) => s.setTarget)
  const removeTarget = useBusinessStore((s) => s.removeTarget)

  const [closing, setClosing] = useState(false)

  if (!profile || !financialInputs) return null

  const suggestedNext = nextPeriodOf(financialInputs.period)

  function handleClosePeriod() {
    if (!window.confirm(`Закрыть период ${formatPeriodLabel(financialInputs!.period)} и открыть ${formatPeriodLabel(suggestedNext)}? Текущие данные P&L сохранятся как факт, а выручка и продажи обнулятся для нового периода.`)) return
    setClosing(true)
    closeCurrentPeriod(suggestedNext).finally(() => setClosing(false))
  }

  const allRecords = [financialInputs, ...history]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">История</h1>
          <p className="text-sm text-ink-500 mt-1">Реальная динамика по месяцам и план vs факт.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={handleClosePeriod} disabled={closing}>
          Закрыть период <ArrowRight className="size-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Динамика (факт)</CardTitle>
        </CardHeader>
        <CardContent>
          {allRecords.length < 2 ? (
            <p className="text-sm text-ink-500 py-6 text-center">
              Пока только один период. Закройте текущий период или добавьте прошлые месяцы вручную, чтобы увидеть динамику.
            </p>
          ) : (
            <HistoryChart records={allRecords} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Периоды</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <HistoryTable current={financialInputs} history={history} onRemove={removeHistoricalRecord} />
          <AddHistoricalRecordForm
            businessId={profile.id}
            onSubmit={(record) => upsertHistoricalRecord(record)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>План vs Факт</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <TargetSection
            current={financialInputs}
            targets={targets}
            onSetTarget={(t) => setTarget(t)}
            onRemoveTarget={(p) => removeTarget(p)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
