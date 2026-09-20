import { useMemo } from 'react'
import { useBusinessStore } from '@/store/businessStore'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'

export function useFinancials() {
  const inputs = useBusinessStore((s) => s.financialInputs)
  const snapshot = useMemo(() => (inputs ? buildFinancialSnapshot(inputs) : null), [inputs])
  return { inputs, snapshot }
}
