import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { FileSpreadsheet, TrendingUp, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/tooltip'
import { HistoryChart } from '@/features/history/HistoryChart'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { parseHistoricalExcelFile, generateExcelHistoryTemplate } from '@/lib/importers/excelHistoryImport'
import { calculateAverageMonthlyGrowthRatePct, calculateForecast } from '@/lib/finance/forecast'
import { formatCurrency } from '@/lib/utils'
import { formatPeriodLabel } from '@/lib/period'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function HistoryImportPage() {
  const navigate = useNavigate()
  const { inputs } = useFinancials()
  const profile = useBusinessStore((s) => s.profile)
  const history = useBusinessStore((s) => s.history)
  const importHistoricalRecords = useBusinessStore((s) => s.importHistoricalRecords)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)
  const setForecastConfig = useBusinessStore((s) => s.setForecastConfig)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [importedCount, setImportedCount] = useState<number | null>(null)

  if (!inputs || !profile) return null

  async function handleFile(file: File) {
    setLoading(true)
    setImportedCount(null)
    try {
      const { records, warnings: w } = await parseHistoricalExcelFile(file, profile!.id)
      setWarnings(w)
      if (records.length > 0) {
        await importHistoricalRecords(records)
        setImportedCount(records.length)
      }
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownloadTemplate() {
    const blob = await generateExcelHistoryTemplate()
    downloadBlob(blob, 'история-бизнеса-шаблон.xlsx')
  }

  const allRecords = [inputs, ...history]
  const sortedHistory = [...history].sort((a, b) => a.period.localeCompare(b.period))
  const growthRatePct = calculateAverageMonthlyGrowthRatePct(sortedHistory)
  const clampedRate = growthRatePct === null ? null : Math.max(-10, Math.min(15, growthRatePct))
  const forecastPoints =
    clampedRate === null ? [] : calculateForecast(inputs, { ...forecastConfig, salesCountGrowthPct: clampedRate }, { currentEmployeesCount: profile.employeesCount || 1 })
  const forecastRevenue = forecastPoints.reduce((s, p) => s + p.revenue, 0)
  const forecastProfit = forecastPoints.reduce((s, p) => s + p.netProfit, 0)

  function applyGrowthRateToForecast() {
    if (clampedRate === null) return
    setForecastConfig({ ...forecastConfig, salesCountGrowthPct: Math.round(clampedRate * 10) / 10 })
    navigate('/app/forecast')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Импорт истории</h1>
        <p className="text-sm text-ink-500 mt-1">
          Загрузите Excel с историей по месяцам — приложение разложит экономику бизнеса по периодам и посчитает прогноз на основе реального тренда.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <FileSpreadsheet className="size-4" />
            Файл истории (.xlsx)
            <InfoTooltip>
              Первая строка — заголовки, дальше одна строка на месяц. Обязательна колонка «Период» в формате
              ГГГГ-ММ (например 2026-06). Остальные колонки — как в шаблоне: выручка, себестоимость, ФОТ, аренда
              и т. д. Колонки, которых нет в файле, будут считаться нулевыми — предупреждение покажет, каких не хватает.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
              Скачать шаблон
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              <Upload className="size-4" />
              {loading ? 'Разбираем файл…' : 'Загрузить файл'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>

          {importedCount !== null && (
            <p className="text-xs text-positive-500">Импортировано периодов: {importedCount}.</p>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-warning-500">
                  {w}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Расклад по истории</CardTitle>
        </CardHeader>
        <CardContent>
          {allRecords.length < 2 ? (
            <p className="text-sm text-ink-500 py-6 text-center">
              Пока данных за один период. Загрузите файл выше — здесь появится динамика выручки и прибыли по месяцам.
            </p>
          ) : (
            <>
              <HistoryChart records={allRecords} />
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500 border-b border-ink-800">
                      <th className="py-2 pr-4 font-medium whitespace-nowrap">Период</th>
                      <th className="py-2 pr-4 font-medium text-right">Выручка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...allRecords]
                      .sort((a, b) => a.period.localeCompare(b.period))
                      .map((r) => (
                        <tr key={r.period} className="border-b border-ink-800/60">
                          <td className="py-2 pr-4 text-ink-300 whitespace-nowrap">{formatPeriodLabel(r.period)}</td>
                          <td className="py-2 pr-4 text-right text-ink-100 tabular-nums">{formatCurrency(r.revenue)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink-500 mt-3">
                Полная таблица с планом/фактом и возможностью правки — на странице «История».
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <TrendingUp className="size-4" />
            Прогноз на основе истории
            <InfoTooltip>
              Темп роста считается по факту — как CAGR между первым и последним загруженным периодом, а не
              вручную на слайдере. Нужно минимум два периода истории.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {clampedRate === null ? (
            <p className="text-sm text-ink-500 py-4 text-center">
              Загрузите минимум два периода истории с ненулевой выручкой, чтобы посчитать темп роста.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-ink-800 px-4 py-3">
                  <div className="text-xs text-ink-400 mb-1">Темп роста выручки, %/мес</div>
                  <div className={`text-lg font-semibold ${clampedRate >= 0 ? 'text-positive-500' : 'text-negative-500'}`}>
                    {clampedRate >= 0 ? '+' : ''}
                    {clampedRate.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl border border-ink-800 px-4 py-3">
                  <div className="text-xs text-ink-400 mb-1">Прогноз выручки, 12 мес.</div>
                  <div className="text-lg font-semibold text-ink-50">{formatCurrency(forecastRevenue)}</div>
                </div>
                <div className="rounded-xl border border-ink-800 px-4 py-3">
                  <div className="text-xs text-ink-400 mb-1">Прогноз прибыли, 12 мес.</div>
                  <div className={`text-lg font-semibold ${forecastProfit >= 0 ? 'text-positive-500' : 'text-negative-500'}`}>
                    {formatCurrency(forecastProfit)}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={applyGrowthRateToForecast}>
                Открыть в разделе «Прогноз» с этим темпом
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
