import { useRef, useState } from 'react'
import { AlertTriangle, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateCsvTemplate, parseFinancialCsv, type ImportResult } from '@/lib/importers/csvFinancialImport'
import { useBusinessStore } from '@/store/businessStore'
import { formatCurrency, formatNumber } from '@/lib/utils'

const FIELD_LABELS: Record<string, string> = {
  revenue: 'Выручка',
  cogs: 'Себестоимость',
  payroll: 'ФОТ',
  rent: 'Аренда',
  marketing: 'Реклама',
  logistics: 'Логистика',
  utilities: 'Коммунальные расходы',
  software: 'ПО и сервисы',
  depreciation: 'Амортизация',
  loanInterest: 'Проценты по кредитам',
  taxes: 'Налоги',
  loanPayments: 'Погашение кредита',
  avgCheck: 'Средний чек',
  salesCount: 'Количество продаж',
}

function downloadTemplate() {
  const blob = new Blob([generateCsvTemplate()], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'business-financial-os-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateFinancialInputs = useBusinessStore((s) => s.updateFinancialInputs)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  async function handleFile(file: File) {
    setApplied(false)
    setFileName(file.name)
    const text = await file.text()
    setResult(parseFinancialCsv(text))
  }

  function handleApply() {
    if (!result || Object.keys(result.values).length === 0) return
    updateFinancialInputs(result.values)
    setApplied(true)
  }

  const fieldsFound = result ? (Object.keys(result.values) as (keyof typeof FIELD_LABELS)[]) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Импорт данных из CSV</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        <p className="text-sm text-ink-400">
          Загрузите CSV-файл с выручкой и расходами вместо ручного ввода. Экспорт из Excel/Google Таблиц
          в CSV делается через «Файл → Сохранить как → CSV».
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            <Download className="size-4" /> Скачать шаблон CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" /> Загрузить файл
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </div>

        {result && (
          <div className="rounded-xl border border-ink-800 p-4 space-y-3">
            <div className="text-xs text-ink-500">Файл: {fileName}</div>

            {fieldsFound.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {fieldsFound.map((field) => (
                  <div key={field} className="flex items-center justify-between">
                    <span className="text-ink-400">{FIELD_LABELS[field]}</span>
                    <span className="text-ink-100 font-medium">
                      {field === 'avgCheck' || field === 'salesCount'
                        ? formatNumber(result.values[field as never] as number)
                        : formatCurrency(result.values[field as never] as number)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="rounded-lg bg-warning-500/10 border border-warning-500/30 p-3 space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-warning-500">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {fieldsFound.length > 0 && (
              <Button size="sm" onClick={handleApply} disabled={applied}>
                {applied ? 'Применено' : 'Применить к текущим данным'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
