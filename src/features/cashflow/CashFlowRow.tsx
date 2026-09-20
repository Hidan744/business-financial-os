import { Input } from '@/components/ui/input'

export function CashFlowRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-ink-400">{label}</span>
      <Input
        inputMode="decimal"
        defaultValue={value === 0 ? '' : String(value)}
        onBlur={(e) => {
          const parsed = Number(e.target.value.replace(/\s/g, '').replace(',', '.'))
          onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
        }}
        className="w-36 text-right"
      />
    </div>
  )
}
