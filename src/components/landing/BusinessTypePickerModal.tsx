import { useState, type ComponentType } from 'react'
import {
  Briefcase,
  Coffee,
  Factory,
  LayoutGrid,
  Megaphone,
  ShoppingBag,
  ShoppingCart,
  X,
} from 'lucide-react'
import { BUSINESS_TYPE_LABELS, type BusinessType } from '@/types/business'
import { BUSINESS_TYPE_MODULE_PRESETS, MODULE_LABELS, type ModuleId } from '@/types/modules'
import { cn } from '@/lib/utils'

const ICONS: Record<BusinessType, ComponentType<{ className?: string }>> = {
  services: Briefcase,
  agency: Megaphone,
  retail: ShoppingBag,
  ecommerce: ShoppingCart,
  production: Factory,
  cafe: Coffee,
  other: LayoutGrid,
}

const DESCRIPTIONS: Record<BusinessType, string> = {
  services: 'Консультации, ремонт, обучение — продаёте время и экспертизу, а не товар.',
  agency: 'Маркетинг, digital, дизайн — команда исполнителей и клиенты на подряде.',
  retail: 'Магазин с товарным запасом, продавцами и постоянными закупками.',
  ecommerce: 'Продажи через сайт или маркетплейс, склад есть, а сотрудников — минимум.',
  production: 'Своё производство: сырьё, цех, персонал, часто — оборудование в кредит.',
  cafe: 'Кафе, ресторан, пекарня — товарные остатки и смена сотрудников каждый день.',
  other: 'Не нашли своё — покажем базовый набор, остальное включите вручную за минуту.',
}

// Разделы меню, которые управляются модулями (см. lib/navigation.ts) — только они реально
// появляются/пропадают в зависимости от типа. Порядок — как в сайдбаре.
const GATED_MODULES: ModuleId[] = ['inventory', 'hr', 'marketing', 'debt']

const BUSINESS_TYPES: BusinessType[] = ['retail', 'cafe', 'ecommerce', 'services', 'agency', 'production', 'other']

export function BusinessTypePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (type: BusinessType) => void
  onClose: () => void
}) {
  const [hovered, setHovered] = useState<BusinessType | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80" onClick={onClose} />
      <div className="relative w-full max-w-[760px] max-h-[85vh] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-7 py-6 border-b border-ink-800 shrink-0">
          <div>
            <div className="font-display text-xl font-bold text-ink-50">Какой у вас бизнес?</div>
            <div className="text-[13px] text-ink-500 mt-0.5">
              Покажем демо с разделами, которые реально нужны именно такому бизнесу.
            </div>
          </div>
          <button aria-label="Закрыть" onClick={onClose} className="text-ink-500 hover:text-ink-200 transition-colors shrink-0">
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="px-7 py-6 overflow-y-auto scrollbar-thin">
          <div className="grid sm:grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((type) => {
              const Icon = ICONS[type]
              const preset = BUSINESS_TYPE_MODULE_PRESETS[type]
              const extras = GATED_MODULES.filter((m) => preset[m])
              return (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  onMouseEnter={() => setHovered(type)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    'text-left rounded-xl border px-5 py-4 transition-colors',
                    hovered === type ? 'border-brand-500/60 bg-brand-500/5' : 'border-ink-800 bg-ink-950/60 hover:border-ink-700',
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 shrink-0">
                      <Icon className="size-[18px]" />
                    </div>
                    <div className="font-semibold text-ink-50 text-[15px]">{BUSINESS_TYPE_LABELS[type]}</div>
                  </div>
                  <p className="text-[13px] text-ink-400 leading-relaxed mb-3">{DESCRIPTIONS[type]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extras.length === 0 ? (
                      <span className="text-[11px] text-ink-600">только базовые разделы</span>
                    ) : (
                      extras.map((m) => (
                        <span
                          key={m}
                          className="text-[11px] font-medium text-ink-300 bg-ink-800 border border-ink-700 rounded-full px-2 py-0.5"
                        >
                          {MODULE_LABELS[m]}
                        </span>
                      ))
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
