export function nextPeriodOf(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month, 1)) // month уже 1-indexed → это и есть следующий месяц
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
