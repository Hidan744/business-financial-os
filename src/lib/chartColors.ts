/**
 * Валидированная (dataviz skill) палитра для тёмной поверхности приложения.
 * Категориальные цвета назначаются по фиксированному порядку слотов —
 * никогда не переставляются в зависимости от значения/ранга данных.
 */
export const CATEGORICAL = {
  slot1: '#3987e5', // blue
  slot2: '#d95926', // orange
  slot3: '#199e70', // aqua
  slot4: '#c98500', // yellow
  slot5: '#d55181', // magenta
  slot6: '#008300', // green
  slot7: '#9085e9', // violet
  slot8: '#e66767', // red
} as const

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

export const CHART_CHROME = {
  gridline: '#262a36', // ink-700
  axis: '#4b5262', // ink-500
  mutedInk: '#9aa1b0', // ink-300
} as const
