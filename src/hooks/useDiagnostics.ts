import { useMemo } from 'react'
import { useFinancials } from './useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { runDiagnostics } from '@/lib/finance/diagnostics'

export function useDiagnostics() {
  const { inputs, snapshot } = useFinancials()
  const history = useBusinessStore((s) => s.history)

  return useMemo(() => {
    if (!inputs || !snapshot) return null
    const previousPeriod = [...history].sort((a, b) => b.period.localeCompare(a.period))[0]
    return runDiagnostics(inputs, snapshot, previousPeriod)
  }, [inputs, snapshot, history])
}
