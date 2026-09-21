import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FinancialInputs } from '@/types/finance'

const FIELDS: { key: keyof Pick<FinancialInputs, 'revenue' | 'cogs' | 'payroll' | 'rent' | 'marketing' | 'taxes' | 'avgCheck' | 'salesCount'>; label: string }[] = [
  { key: 'revenue', label: 'Выручка' },
  { key: 'cogs', label: 'Себестоимость' },
  { key: 'payroll', label: 'ФОТ' },
  { key: 'rent', label: 'Аренда' },
  { key: 'marketing', label: 'Реклама' },
  { key: 'taxes', label: 'Налоги' },
  { key: 'avgCheck', label: 'Средний чек' },
  { key: 'salesCount', label: 'Продажи' },
]

function toNumber(v: string): number {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function AddHistoricalRecordForm({
  businessId,
  onSubmit,
}: {
  businessId: string
  onSubmit: (record: FinancialInputs) => void
}) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Добавить прошлый период
      </Button>
    )
  }

  function handleSubmit() {
    if (!/^\d{4}-\d{2}$/.test(period)) return
    const record: FinancialInputs = {
      businessId,
      period,
      revenue: toNumber(values.revenue ?? ''),
      cogs: toNumber(values.cogs ?? ''),
      payroll: toNumber(values.payroll ?? ''),
      rent: toNumber(values.rent ?? ''),
      marketing: toNumber(values.marketing ?? ''),
      logistics: 0,
      utilities: 0,
      software: 0,
      customExpenseLines: [],
      depreciation: 0,
      loanInterest: 0,
      taxes: toNumber(values.taxes ?? ''),
      loanPayments: 0,
      avgCheck: toNumber(values.avgCheck ?? ''),
      salesCount: toNumber(values.salesCount ?? ''),
    }
    onSubmit(record)
    setOpen(false)
    setPeriod('')
    setValues({})
  }

  return (
    <div className="rounded-xl border border-ink-800 p-4 space-y-4">
      <div>
        <Label htmlFor={`period-${businessId}`}>Период (ГГГГ-ММ)</Label>
        <Input
          id={`period-${businessId}`}
          placeholder="2026-06"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="mt-2 w-36"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={`hist-${f.key}`}>{f.label}</Label>
            <Input
              id={`hist-${f.key}`}
              inputMode="decimal"
              placeholder="0"
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="mt-2"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit}>Сохранить</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
      </div>
    </div>
  )
}
