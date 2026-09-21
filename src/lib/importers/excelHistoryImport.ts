import type { FinancialInputs } from '@/types/finance'
import { COLUMN_ALIASES, FIELD_LABELS, normalizeHeader, parseNumericCell, type ImportableField } from './csvFinancialImport'

const PERIOD_ALIASES = ['период', 'месяц', 'period']
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export interface HistoricalImportResult {
  records: FinancialInputs[]
  warnings: string[]
}

type Cell = string | number | null | undefined

/**
 * Разбирает уже табличные данные (строка заголовков + строки по одной на период) в записи
 * истории. Отдельно от чтения самого .xlsx-файла, чтобы логику можно было тестировать без
 * реального файла — parseHistoricalExcelFile ниже просто превращает файл в такие же rows.
 */
export function parseHistoricalRows(rows: Cell[][], businessId: string): HistoricalImportResult {
  const warnings: string[] = []
  if (rows.length < 2) {
    return { records: [], warnings: ['В файле нет строк с данными — нужны заголовок и хотя бы одна строка на период.'] }
  }

  const headerRow = rows[0].map((c) => normalizeHeader(String(c ?? '')))
  const periodIdx = headerRow.findIndex((h) => PERIOD_ALIASES.includes(h))
  if (periodIdx === -1) {
    return {
      records: [],
      warnings: ['Не найдена колонка «Период» (формат ГГГГ-ММ, например 2026-01) — без неё нельзя определить, к какому месяцу относится строка.'],
    }
  }

  const columnIndex: Partial<Record<ImportableField, number>> = {}
  for (const field of Object.keys(COLUMN_ALIASES) as ImportableField[]) {
    const idx = headerRow.findIndex((h) => COLUMN_ALIASES[field].includes(h))
    if (idx !== -1) columnIndex[field] = idx
  }
  const missingFields = (Object.keys(COLUMN_ALIASES) as ImportableField[]).filter((f) => columnIndex[f] === undefined)
  if (missingFields.length > 0) {
    warnings.push(`Колонки не найдены, значения будут 0: ${missingFields.map((f) => FIELD_LABELS[f]).join(', ')}.`)
  }

  const records: FinancialInputs[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue // пустая строка — пропускаем молча

    const period = String(row[periodIdx] ?? '').trim()
    if (!PERIOD_RE.test(period)) {
      warnings.push(`Строка ${r + 1}: «Период» = «${period || '(пусто)'}» не в формате ГГГГ-ММ — строка пропущена.`)
      continue
    }

    const existingIdx = records.findIndex((rec) => rec.period === period)
    if (existingIdx !== -1) {
      warnings.push(`Строка ${r + 1}: период ${period} уже встречался в файле — использована последняя строка для этого периода.`)
      records.splice(existingIdx, 1)
    }

    const values = {} as Record<ImportableField, number>
    for (const field of Object.keys(COLUMN_ALIASES) as ImportableField[]) {
      const idx = columnIndex[field]
      if (idx === undefined) {
        values[field] = 0
        continue
      }
      const raw = row[idx]
      const num = typeof raw === 'number' ? raw : parseNumericCell(String(raw ?? ''))
      if (num === null) {
        warnings.push(`Строка ${r + 1} (${period}), «${FIELD_LABELS[field]}»: значение «${raw}» не распознано как число — использован 0.`)
        values[field] = 0
        continue
      }
      values[field] = num < 0 ? 0 : num
    }

    records.push({ businessId, period, customExpenseLines: [], ...values })
  }

  records.sort((a, b) => a.period.localeCompare(b.period))
  return { records, warnings }
}

/** Читает загруженный .xlsx-файл (первый лист) и превращает его в записи истории. */
export async function parseHistoricalExcelFile(file: File, businessId: string): Promise<HistoricalImportResult> {
  const ExcelJS = (await import('exceljs')).default
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    return { records: [], warnings: ['Не удалось прочитать файл — убедитесь, что это .xlsx, сохранённый из Excel или Google Таблиц.'] }
  }

  const sheet = workbook.worksheets[0]
  if (!sheet) return { records: [], warnings: ['В файле нет ни одного листа.'] }

  const rows: Cell[][] = []
  sheet.eachRow((row) => {
    const cells: Cell[] = []
    row.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value
      if (v === null || v === undefined) {
        cells.push(null)
      } else if (v instanceof Date) {
        cells.push(v.toISOString().slice(0, 7)) // на случай, если период введён как дата — приводим к ГГГГ-ММ
      } else if (typeof v === 'object' && 'result' in v) {
        cells.push((v as { result: unknown }).result as Cell) // формула — берём вычисленное значение
      } else {
        cells.push(v as Cell)
      }
    })
    rows.push(cells)
  })

  return parseHistoricalRows(rows, businessId)
}

/** Шаблон .xlsx с примером трёх прошлых месяцев — под тот же набор колонок, что и разбор выше. */
export async function generateExcelHistoryTemplate(): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('История')

  const fields = Object.keys(COLUMN_ALIASES) as ImportableField[]
  sheet.addRow(['Период', ...fields.map((f) => FIELD_LABELS[f])])

  const example: [string, ...number[]][] = [
    ['2026-06', 2100000, 630000, 500000, 220000, 120000, 0, 0, 0, 0, 0, 45000, 50000, 780, 2692],
    ['2026-07', 2220000, 666000, 500000, 220000, 130000, 0, 0, 0, 0, 0, 48000, 50000, 800, 2775],
    ['2026-08', 2300000, 690000, 510000, 220000, 140000, 0, 0, 0, 0, 0, 50000, 50000, 820, 2805],
  ]
  for (const row of example) sheet.addRow(row)

  sheet.getRow(1).font = { bold: true }
  sheet.columns.forEach((col) => {
    col.width = 16
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
