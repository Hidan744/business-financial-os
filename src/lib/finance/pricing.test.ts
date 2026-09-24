import { describe, expect, it } from 'vitest'
import {
  calculateBreakEvenUnitsAtPrice,
  calculateMarginPct,
  calculateMarkupPct,
  calculateOverheadPerUnit,
  calculatePriceFromMargin,
  calculatePriceFromMarkup,
  calculatePriceWithVat,
} from './pricing'

describe('calculateOverheadPerUnit', () => {
  it('splits fixed costs evenly across the expected volume', () => {
    expect(calculateOverheadPerUnit(120000, 200)).toBe(600)
  })
  it('is 0 when no volume is given (no overhead allocated)', () => {
    expect(calculateOverheadPerUnit(120000, 0)).toBe(0)
  })
})

describe('calculatePriceFromMarkup', () => {
  it('cost 500, 40% markup -> 700', () => {
    expect(calculatePriceFromMarkup(500, 40)).toBe(700)
  })
  it('0% markup returns the cost unchanged', () => {
    expect(calculatePriceFromMarkup(500, 0)).toBe(500)
  })
})

describe('calculatePriceFromMargin', () => {
  it('cost 500, 40% margin -> 833.33', () => {
    expect(calculatePriceFromMargin(500, 40)).toBeCloseTo(833.33, 1)
  })
  it('returns null for a margin of 100% or more (mathematically impossible)', () => {
    expect(calculatePriceFromMargin(500, 100)).toBeNull()
    expect(calculatePriceFromMargin(500, 120)).toBeNull()
  })
})

describe('calculateMarkupPct / calculateMarginPct — markup and margin disagree on the same price', () => {
  it('a 40% markup price has a lower margin percentage (28.6%, not 40%)', () => {
    const price = calculatePriceFromMarkup(500, 40) // 700
    expect(calculateMarkupPct(price, 500)).toBeCloseTo(40, 5)
    expect(calculateMarginPct(price, 500)).toBeCloseTo(28.57, 1)
  })

  it('a 40% margin price has a higher markup percentage (66.7%, not 40%)', () => {
    const price = calculatePriceFromMargin(500, 40)! // 833.33
    expect(calculateMarginPct(price, 500)).toBeCloseTo(40, 5)
    expect(calculateMarkupPct(price, 500)).toBeCloseTo(66.67, 1)
  })

  it('calculateMarkupPct is null when full cost is zero or negative', () => {
    expect(calculateMarkupPct(700, 0)).toBeNull()
    expect(calculateMarkupPct(700, -10)).toBeNull()
  })

  it('calculateMarginPct is null when price is zero or negative', () => {
    expect(calculateMarginPct(0, 500)).toBeNull()
    expect(calculateMarginPct(-10, 500)).toBeNull()
  })
})

describe('calculatePriceWithVat', () => {
  it('grosses VAT up on top of the ex-VAT price (additive, not subtracted from it)', () => {
    expect(calculatePriceWithVat(700, 20)).toBe(840)
  })
  it('0% VAT leaves the price unchanged', () => {
    expect(calculatePriceWithVat(700, 0)).toBe(700)
  })
})

describe('calculateBreakEvenUnitsAtPrice', () => {
  it('fixed costs 120,000, price 700, cost 450 -> contribution 250 -> 480 units', () => {
    expect(calculateBreakEvenUnitsAtPrice(120000, 700, 450)).toBe(480)
  })
  it('returns null when the price does not cover the direct cost', () => {
    expect(calculateBreakEvenUnitsAtPrice(120000, 400, 450)).toBeNull()
    expect(calculateBreakEvenUnitsAtPrice(120000, 450, 450)).toBeNull()
  })
})
