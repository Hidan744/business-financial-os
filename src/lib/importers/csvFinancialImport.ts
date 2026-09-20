import Papa from 'papaparse'
import type { FinancialInputs } from '@/types/finance'

export type ImportableField = keyof Pick<
  FinancialInputs,
  | 'revenue'
  | 'cogs'
  | 'payroll'
  | 'rent'
  | 'marketing'
  | 'logistics'
  | 'utilities'
  | 'software'
  | 'depreciation'
  | 'loanInterest'
  | 'taxes'
  | 'loanPayments'
  | 'avgCheck'
  | 'salesCount'
>

/** Заголовок колонки → поле модели. Несколько синонимов на колонку для терпимости к формату файла. */
const COLUMN_ALIASES: Record<ImportableField, string[]> = {
  revenue: ['выручка', 'revenue'],
  cogs: ['себестоимость', 'cogs'],
  payroll: ['фот', 'зарплата', 'payroll'],
  rent: ['аренда', 'rent'],
  marketing: ['реклама', 'маркетинг', 'marketing'],
  logistics: ['логистика', 'logistics'],
  utilities: ['коммунальные расходы', 'коммуналка', 'utilities'],
  software: ['по и сервисы', 'по/сервисы', 'сервисы', 'software'],
  depreciation: ['амортизация', 'depreciation'],
  loanInterest: ['проценты по кредитам', 'проценты', 'loan interest'],
  taxes: ['налоги', 'taxes'],
  loanPayments: ['погашение кредита', 'кредит', 'loan payments'],
  avgCheck: ['средний чек', 'avg check', 'average check'],
  salesCount: ['количество продаж', 'продажи', 'sales count', 'sales'],
}

const FIELD_LABELS: Record<ImportableField, string> = {
  revenue: 'Выручка',
  cogs: 'Себестоимость',
  payroll: 'ФОТ',
  rent: 'Аренда',
  marketing: 'Реклама',
  logistics: 'Логистика',
  utilities: 'Коммунальные расходы',
  software: 'ПО и сервисы',
  depreciation: 'Амортизация',
  loanInterest: 'Проценты по кредитам',
  taxes: 'Налоги',
  loanPayments: 'Погашение кредита',
  avgCheck: 'Средний чек',
  salesCount: 'Количество продаж',
}

export interface ImportResult {
  values: Partial<Record<ImportableField, number>>
  warnings: string[]
  rowsFound: number
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseNumericCell(raw: string): number | null {
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.').replace(/[₽$€]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Разбирает CSV с финансовыми показателями. Ожидает заголовок + одну или
 * несколько строк значений; если строк несколько, используется последняя
 * (пока приложение хранит только один активный период).
 */
export function parseFinancialCsv(csvText: string): ImportResult {
  const warnings: string[] = []
  const parsed = Papa.parse<string[]>(csvText.trim(), { skipEmptyLines: true })

  if (parsed.errors.length > 0) {
    warnings.push(`Ошибки разбора CSV: ${parsed.errors.map((e) => e.message).join('; ')}`)
  }

  const rows = parsed.data
  if (rows.length < 2) {
    return { values: {}, warnings: ['В файле нет строки с данными (нужны заголовок + хотя бы одна строка значений).'], rowsFound: 0 }
  }

  const headerRow = rows[0].map(normalizeHeader)
  const dataRow = rows[rows.length - 1]
  if (rows.length > 2) {
    warnings.push(`В файле ${rows.length - 1} строк с данными — использована последняя (${dataRow.join(', ')}).`)
  }

  const columnIndex: Partial<Record<ImportableField, number>> = {}
  for (const field of Object.keys(COLUMN_ALIASES) as ImportableField[]) {
    const aliases = COLUMN_ALIASES[field]
    const idx = headerRow.findIndex((h) => aliases.includes(h))
    if (idx !== -1) columnIndex[field] = idx
  }

  const values: Partial<Record<ImportableField, number>> = {}
  for (const field of Object.keys(COLUMN_ALIASES) as ImportableField[]) {
    const idx = columnIndex[field]
    if (idx === undefined) {
      warnings.push(`Колонка «${FIELD_LABELS[field]}» не найдена — значение не будет изменено.`)
      continue
    }
    const raw = dataRow[idx] ?? ''
    const num = parseNumericCell(raw)
    if (num === null) {
      warnings.push(`«${FIELD_LABELS[field]}»: значение «${raw}» не распознано как число — пропущено.`)
      continue
    }
    if (num < 0) {
      warnings.push(`«${FIELD_LABELS[field]}»: отрицательное значение (${raw}) заменено на 0.`)
      values[field] = 0
      continue
    }
    values[field] = num
  }

  return { values, warnings, rowsFound: rows.length - 1 }
}

export function generateCsvTemplate(): string {
  const headers = (Object.keys(COLUMN_ALIASES) as ImportableField[]).map((f) => FIELD_LABELS[f])
  const example = [2400000, 720000, 520000, 220000, 150000, 0, 0, 0, 0, 0, 90000, 50000, 850, 2824]
  return Papa.unparse([headers, example])
}
