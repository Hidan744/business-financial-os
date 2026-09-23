import { describe, expect, it } from 'vitest'
import { BUSINESS_TYPE_MODULE_PRESETS, getEffectiveModules, MODULE_IDS } from './modules'

describe('BUSINESS_TYPE_MODULE_PRESETS', () => {
  it('freelancer/services business has no inventory module', () => {
    expect(BUSINESS_TYPE_MODULE_PRESETS.services.inventory).toBe(false)
  })

  it('retail business has the inventory module enabled', () => {
    expect(BUSINESS_TYPE_MODULE_PRESETS.retail.inventory).toBe(true)
  })

  it('every business type defines every module id (no gaps)', () => {
    for (const preset of Object.values(BUSINESS_TYPE_MODULE_PRESETS)) {
      for (const id of MODULE_IDS) {
        expect(typeof preset[id]).toBe('boolean')
      }
    }
  })
})

describe('getEffectiveModules', () => {
  it('falls back to the business-type preset when profile.modules is not set (legacy businesses)', () => {
    const modules = getEffectiveModules({ type: 'retail' })
    expect(modules).toEqual(BUSINESS_TYPE_MODULE_PRESETS.retail)
  })

  it('lets an explicit profile.modules override the preset per-flag', () => {
    // Retail preset has inventory=true — a retail business that explicitly turned it off
    // (e.g. dropshipping without physical stock) must see it disabled.
    const modules = getEffectiveModules({ type: 'retail', modules: { inventory: false } })
    expect(modules.inventory).toBe(false)
    // Untouched flags still come from the preset.
    expect(modules.hr).toBe(true)
  })

  it('a business without employees has the hr module off by default (services preset)', () => {
    const modules = getEffectiveModules({ type: 'services' })
    expect(modules.hr).toBe(false)
  })

  it('a business without paid marketing can turn the marketing module off explicitly', () => {
    const modules = getEffectiveModules({ type: 'ecommerce', modules: { marketing: false } })
    expect(modules.marketing).toBe(false)
  })

  it('a business without debt has the debt module off by default (services preset)', () => {
    const modules = getEffectiveModules({ type: 'services' })
    expect(modules.debt).toBe(false)
  })

  it('a business with receivables enabled has it reflected regardless of type default', () => {
    const modules = getEffectiveModules({ type: 'cafe', modules: { receivables: true } })
    expect(modules.receivables).toBe(true)
  })

  it('a business with payables enabled has it reflected regardless of type default', () => {
    const modules = getEffectiveModules({ type: 'services', modules: { payables: true } })
    expect(modules.payables).toBe(true)
  })

  it('handles a missing profile entirely without throwing', () => {
    expect(() => getEffectiveModules(null)).not.toThrow()
    expect(() => getEffectiveModules(undefined)).not.toThrow()
  })
})
