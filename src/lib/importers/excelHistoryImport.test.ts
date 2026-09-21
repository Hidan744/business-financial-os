import { describe, expect, it } from 'vitest'
import { parseHistoricalRows } from './excelHistoryImport'

describe('parseHistoricalRows', () => {
  const headers = ['Период', 'Выручка', 'Себестоимость']

  it('parses multiple periods, one row each', () => {
    const rows = [headers, ['2026-06', 1000, 300], ['2026-07', 1200, 350]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toMatchObject({ period: '2026-06', revenue: 1000, cogs: 300 })
    expect(result.records[1]).toMatchObject({ period: '2026-07', revenue: 1200, cogs: 350 })
  })

  it('sorts records by period regardless of file order', () => {
    const rows = [headers, ['2026-08', 1, 0], ['2026-06', 1, 0], ['2026-07', 1, 0]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records.map((r) => r.period)).toEqual(['2026-06', '2026-07', '2026-08'])
  })

  it('requires a Период column', () => {
    const result = parseHistoricalRows([['Выручка'], [1000]], 'biz1')
    expect(result.records).toHaveLength(0)
    expect(result.warnings.some((w) => w.includes('Период'))).toBe(true)
  })

  it('skips rows with an invalid period format instead of guessing', () => {
    const rows = [headers, ['июнь 2026', 1000, 300], ['2026-06', 1000, 300]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records).toHaveLength(1)
    expect(result.warnings.some((w) => w.includes('не в формате'))).toBe(true)
  })

  it('keeps the last row when the same period repeats', () => {
    const rows = [headers, ['2026-06', 1000, 300], ['2026-06', 2000, 600]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records).toHaveLength(1)
    expect(result.records[0].revenue).toBe(2000)
    expect(result.warnings.some((w) => w.includes('уже встречался'))).toBe(true)
  })

  it('defaults missing columns to 0 with a warning, never NaN', () => {
    const rows = [['Период', 'Выручка'], ['2026-06', 1000]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records[0].cogs).toBe(0)
    expect(Number.isNaN(result.records[0].cogs)).toBe(false)
    expect(result.warnings.some((w) => w.includes('Себестоимость'))).toBe(true)
  })

  it('clamps negative values to zero', () => {
    const rows = [headers, ['2026-06', -500, 100]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records[0].revenue).toBe(0)
  })

  it('silently skips fully empty rows', () => {
    const rows = [headers, ['2026-06', 1000, 300], ['', '', ''], ['2026-07', 1200, 350]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records).toHaveLength(2)
  })

  it('accepts numeric cell values directly (as exceljs would provide)', () => {
    const rows = [headers, ['2026-06', 1000, 300]]
    const result = parseHistoricalRows(rows, 'biz1')
    expect(result.records[0].revenue).toBe(1000)
  })

  it('returns no records for a file with only a header row', () => {
    const result = parseHistoricalRows([headers], 'biz1')
    expect(result.records).toHaveLength(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
