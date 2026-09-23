import { describe, expect, it } from 'vitest'
import { getModuleVisibleNavItems, NAV_ITEMS } from './navigation'
import { BUSINESS_TYPE_MODULE_PRESETS } from '@/types/modules'

describe('getModuleVisibleNavItems', () => {
  it('hides Склад/Сотрудники/Долги/Unit-экономика for a freelancer with no modules enabled', () => {
    const allOff = { inventory: false, hr: false, marketing: false, debt: false, receivables: false, payables: false }
    const visible = getModuleVisibleNavItems(NAV_ITEMS, allOff)
    const paths = visible.map((i) => i.to)
    expect(paths).not.toContain('/app/inventory')
    expect(paths).not.toContain('/app/hr')
    expect(paths).not.toContain('/app/debts')
    expect(paths).not.toContain('/app/unit-economics')
  })

  it('services preset (default freelancer/service business) has no inventory/hr/debt sections, but keeps marketing-driven unit-economics', () => {
    const visible = getModuleVisibleNavItems(NAV_ITEMS, BUSINESS_TYPE_MODULE_PRESETS.services)
    const paths = visible.map((i) => i.to)
    expect(paths).not.toContain('/app/inventory')
    expect(paths).not.toContain('/app/hr')
    expect(paths).not.toContain('/app/debts')
  })

  it('shows Склад for a retail business with the inventory module on', () => {
    const visible = getModuleVisibleNavItems(NAV_ITEMS, BUSINESS_TYPE_MODULE_PRESETS.retail)
    expect(visible.map((i) => i.to)).toContain('/app/inventory')
  })

  it('core sections (Dashboard, Финансы, Продажи, Прогноз, AI CFO, ...) are never gated by a module', () => {
    const visible = getModuleVisibleNavItems(NAV_ITEMS, BUSINESS_TYPE_MODULE_PRESETS.services)
    const paths = visible.map((i) => i.to)
    for (const core of ['/app/dashboard', '/app/finance', '/app/sales', '/app/forecast', '/app/ai-cfo', '/app/crisis', '/app/settings']) {
      expect(paths).toContain(core)
    }
  })

  it('every item without a module id is always visible, regardless of flags', () => {
    const allOff = { inventory: false, hr: false, marketing: false, debt: false, receivables: false, payables: false }
    const visible = getModuleVisibleNavItems(NAV_ITEMS, allOff)
    const ungated = NAV_ITEMS.filter((i) => !i.module)
    expect(visible).toHaveLength(ungated.length)
  })

  it('turning a module back on makes its section reappear', () => {
    const withDebt = { ...BUSINESS_TYPE_MODULE_PRESETS.services, debt: true }
    const visible = getModuleVisibleNavItems(NAV_ITEMS, withDebt)
    expect(visible.map((i) => i.to)).toContain('/app/debts')
  })
})
