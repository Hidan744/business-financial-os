import { describe, expect, it } from 'vitest'
import { generateCsvTemplate, parseFinancialCsv } from './csvFinancialImport'

describe('parseFinancialCsv', () => {
  it('parses a well-formed template file', () => {
    const csv = generateCsvTemplate()
    const result = parseFinancialCsv(csv)
    expect(result.values.revenue).toBe(2400000)
    expect(result.values.cogs).toBe(720000)
    expect(result.values.avgCheck).toBe(850)
    expect(result.values.salesCount).toBe(2824)
    expect(result.rowsFound).toBe(1)
  })

  it('matches Russian column headers case-insensitively with extra whitespace', () => {
    const csv = 'Выручка , СЕБЕСТОИМОСТЬ\n1000,400'
    const result = parseFinancialCsv(csv)
    expect(result.values.revenue).toBe(1000)
    expect(result.values.cogs).toBe(400)
  })

  it('warns and skips missing columns instead of guessing', () => {
    const csv = 'Выручка\n1000'
    const result = parseFinancialCsv(csv)
    expect(result.values.revenue).toBe(1000)
    expect(result.values.cogs).toBeUndefined()
    expect(result.warnings.some((w) => w.includes('Себестоимость'))).toBe(true)
  })

  it('rejects non-numeric cells instead of producing NaN', () => {
    const csv = 'Выручка\nне число'
    const result = parseFinancialCsv(csv)
    expect(result.values.revenue).toBeUndefined()
    expect(result.warnings.some((w) => w.includes('не распознано'))).toBe(true)
  })

  it('clamps negative values to zero with a warning', () => {
    const csv = 'Выручка\n-500'
    const result = parseFinancialCsv(csv)
    expect(result.values.revenue).toBe(0)
    expect(result.warnings.some((w) => w.includes('отрицательное'))).toBe(true)
  })

  it('handles thousand separators (spaces) and comma decimals', () => {
    const csv = 'Выручка\n"2 400 000,50"'
    const result = parseFinancialCsv(csv)
    expect(result.values.revenue).toBeCloseTo(2400000.5)
  })

  it('uses the last row when multiple data rows are present', () => {
    const csv = 'Выручка\n1000\n2000\n3000'
    const result = parseFinancialCsv(csv)
    expect(result.values.revenue).toBe(3000)
    expect(result.rowsFound).toBe(3)
    expect(result.warnings.some((w) => w.includes('последняя'))).toBe(true)
  })

  it('returns a clear warning for a file with no data row', () => {
    const csv = 'Выручка'
    const result = parseFinancialCsv(csv)
    expect(result.rowsFound).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('does not crash on an empty file', () => {
    const result = parseFinancialCsv('')
    expect(result.values).toEqual({})
    expect(result.rowsFound).toBe(0)
  })
})
