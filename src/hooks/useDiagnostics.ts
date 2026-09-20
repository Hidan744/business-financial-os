import { useMemo } from 'react'
import { useFinancials } from './useFinancials'
import { runDiagnostics } from '@/lib/finance/diagnostics'

export function useDiagnostics() {
  const { inputs, snapshot } = useFinancials()
  return useMemo(() => (inputs && snapshot ? runDiagnostics(inputs, snapshot) : null), [inputs, snapshot])
}
