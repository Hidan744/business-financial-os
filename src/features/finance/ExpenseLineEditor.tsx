import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { useBusinessStore } from '@/store/businessStore'

export function ExpenseLineEditor({ lines }: { lines: { id: string; label: string; amount: number }[] }) {
  const addExpenseLine = useBusinessStore((s) => s.addExpenseLine)
  const removeExpenseLine = useBusinessStore((s) => s.removeExpenseLine)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  function handleAdd() {
    const parsed = Number(amount.replace(/\s/g, '').replace(',', '.'))
    if (!label.trim() || !Number.isFinite(parsed) || parsed < 0) return
    addExpenseLine({ label: label.trim(), amount: parsed })
    setLabel('')
    setAmount('')
  }

  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div key={line.id} className="flex items-center justify-between rounded-xl border border-ink-800 px-3 py-2">
          <span className="text-sm text-ink-200">{line.label}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-400">{formatCurrency(line.amount)}</span>
            <button
              onClick={() => removeExpenseLine(line.id)}
              className="text-ink-500 hover:text-negative-500 transition-colors"
              aria-label={`Удалить статью ${line.label}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Input placeholder="Название статьи" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1" />
        <Input
          placeholder="Сумма"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
        <Button size="icon" variant="secondary" onClick={handleAdd} aria-label="Добавить статью расходов">
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
