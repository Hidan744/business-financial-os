import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBusinessStore } from '@/store/businessStore'

const ADD_BUSINESS = '__add_business__'

export function BusinessSwitcher() {
  const navigate = useNavigate()
  const activeBusinessId = useBusinessStore((s) => s.activeBusinessId)
  const businessList = useBusinessStore((s) => s.businessList)
  const switchBusiness = useBusinessStore((s) => s.switchBusiness)

  if (businessList.length === 0) return null

  function handleChange(value: string) {
    if (value === ADD_BUSINESS) {
      navigate('/onboarding')
      return
    }
    switchBusiness(value)
  }

  return (
    <Select value={activeBusinessId ?? undefined} onValueChange={handleChange}>
      <SelectTrigger className="h-9 text-xs border-ink-800 bg-ink-900/60">
        <SelectValue placeholder="Выберите бизнес" />
      </SelectTrigger>
      <SelectContent>
        {businessList.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
        <SelectItem value={ADD_BUSINESS} className="text-brand-400">
          <span className="flex items-center gap-1.5">
            <Plus className="size-3.5" /> Добавить бизнес
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
