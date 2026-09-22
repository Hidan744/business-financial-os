import { useMemo } from 'react'
import { useBusinessStore } from '@/store/businessStore'
import { buildFinancialSnapshot, type SnapshotContext } from '@/lib/finance/snapshot'
import type { BalanceSheetInputs, CashFlowInputs } from '@/types/finance'

/**
 * Контекст для снэпшота из данных баланса/Cash Flow активного бизнеса — единая точка,
 * откуда Dashboard, Долги, Стресс-тест и т.д. берут остаток долга и CAPEX, чтобы Долг/EBITDA
 * и DSCR считались одинаково везде, а не расходились между разделами.
 */
export function buildSnapshotContext(
  balanceSheet: BalanceSheetInputs | null,
  cashFlowInputs: CashFlowInputs | null,
): SnapshotContext {
  return {
    outstandingDebt: balanceSheet
      ? balanceSheet.currentLiabilities.shortTermDebt + balanceSheet.nonCurrentLiabilities.longTermDebt
      : undefined,
    maintenanceCapex: cashFlowInputs
      ? cashFlowInputs.investing.equipment + cashFlowInputs.investing.repairs + cashFlowInputs.investing.assetPurchases
      : 0,
  }
}

export function useFinancials() {
  const inputs = useBusinessStore((s) => s.financialInputs)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const snapshot = useMemo(
    () => (inputs ? buildFinancialSnapshot(inputs, buildSnapshotContext(balanceSheet, cashFlowInputs)) : null),
    [inputs, balanceSheet, cashFlowInputs],
  )
  return { inputs, snapshot }
}
