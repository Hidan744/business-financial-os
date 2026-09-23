import type { BusinessType } from './business'

/**
 * Бизнес-модули — независимые от отрасли переключатели процессов, которые реально есть у
 * бизнеса. Отрасль (BusinessType) даёт только СТАРТОВЫЙ набор модулей (пресет); дальше
 * пользователь может включить/выключить любой модуль вручную — на онбординге или в Настройках.
 *
 * Правило архитектуры (см. отчёт): UI и расчёты завязаны на modules[moduleId], а не на
 * businessType напрямую — так что "дизайнеру без склада" склад не покажется, даже если он
 * выберет тип бизнеса, где склад обычно есть, а другой retail-бизнес без сотрудников не увидит
 * HR-показатели, даже оставаясь "торговлей".
 */
export type ModuleId = 'inventory' | 'hr' | 'marketing' | 'debt' | 'receivables' | 'payables'

export const MODULE_IDS: ModuleId[] = ['inventory', 'hr', 'marketing', 'debt', 'receivables', 'payables']

export type ModuleFlags = Record<ModuleId, boolean>

export const MODULE_LABELS: Record<ModuleId, string> = {
  inventory: 'Склад / товарные запасы',
  hr: 'Сотрудники',
  marketing: 'Платная реклама',
  debt: 'Кредиты / займы',
  receivables: 'Отсрочки платежей клиентам',
  payables: 'Отсрочки платежей поставщикам',
}

export const MODULE_HINTS: Record<ModuleId, string> = {
  inventory: 'Есть товарные остатки, которые нужно закупать, хранить и списывать',
  hr: 'Есть наёмные сотрудники и фонд оплаты труда',
  marketing: 'Есть расходы на платную рекламу — таргет, контекст, маркетплейсы',
  debt: 'Есть кредиты, займы или лизинг с регулярными платежами',
  receivables: 'Клиенты платят не сразу, а с отсрочкой (дебиторская задолженность)',
  payables: 'Поставщикам платите не сразу, а с отсрочкой (кредиторская задолженность)',
}

/** Какие разделы/показатели включает каждый модуль — используется в отчёте и подсказках UI. */
export const MODULE_UNLOCKS: Record<ModuleId, string[]> = {
  inventory: ['Раздел «Склад»', 'Остатки и стоимость запасов', 'DIO, оборачиваемость'],
  hr: ['Раздел «Сотрудники»', 'Выручка/прибыль на сотрудника', 'ФОТ по штату'],
  marketing: ['Unit-экономика (CAC/LTV)', 'ROMI', 'Marketing Efficiency'],
  debt: ['Раздел «Долги»', 'Долг / EBITDA, DSCR', 'Калькулятор кредита'],
  receivables: ['DSO в разделе «Баланс»'],
  payables: ['DPO в разделе «Баланс»'],
}

/**
 * Стартовый набор модулей по типу бизнеса — ТОЛЬКО дефолт для онбординга, не жёсткая
 * привязка. Дальше пользователь может включить/выключить любой модуль независимо от типа.
 */
export const BUSINESS_TYPE_MODULE_PRESETS: Record<BusinessType, ModuleFlags> = {
  services: { inventory: false, hr: false, marketing: true, debt: false, receivables: false, payables: false },
  agency: { inventory: false, hr: true, marketing: true, debt: false, receivables: true, payables: false },
  retail: { inventory: true, hr: true, marketing: true, debt: true, receivables: false, payables: true },
  ecommerce: { inventory: true, hr: false, marketing: true, debt: false, receivables: false, payables: true },
  production: { inventory: true, hr: true, marketing: false, debt: true, receivables: true, payables: true },
  cafe: { inventory: true, hr: true, marketing: false, debt: false, receivables: false, payables: true },
  other: { inventory: false, hr: false, marketing: false, debt: false, receivables: false, payables: false },
}

interface ProfileLike {
  type: BusinessType
  modules?: Partial<ModuleFlags>
}

/**
 * Единая точка входа для чтения модулей бизнеса. Старые сохранённые бизнесы (до появления
 * модулей) не имеют profile.modules вообще — для них считаем модули равными пресету по типу,
 * чтобы ничего не сломать и не потребовать миграции данных.
 */
export function getEffectiveModules(profile: ProfileLike | null | undefined): ModuleFlags {
  const preset = BUSINESS_TYPE_MODULE_PRESETS[profile?.type ?? 'other']
  if (!profile?.modules) return preset
  return { ...preset, ...profile.modules }
}
