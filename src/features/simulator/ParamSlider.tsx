import { Slider } from '@/components/ui/slider'

export function ParamSlider({
  label,
  value,
  min = -50,
  max = 50,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-300">{label}</span>
        <span className={value === 0 ? 'text-ink-500' : value > 0 ? 'text-positive-500' : 'text-negative-500'}>
          {value > 0 ? '+' : ''}
          {value}%
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}
