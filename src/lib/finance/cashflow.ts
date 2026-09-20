import type { CashFlowInputs } from '@/types/finance'

export interface CashFlowSummary {
  openingBalance: number
  operatingNet: number
  investingNet: number
  financingNet: number
  netCashFlow: number
  closingBalance: number
  operatingInflow: number
  operatingOutflow: number
}

export function calculateCashFlow(inflow: number, outflow: number): number {
  return inflow - outflow
}

export function buildCashFlowSummary(inputs: CashFlowInputs): CashFlowSummary {
  const operatingOutflow =
    inputs.operating.supplierPayments +
    inputs.operating.payroll +
    inputs.operating.rent +
    inputs.operating.marketing +
    inputs.operating.taxes +
    inputs.operating.otherOperating
  const operatingInflow = inputs.operating.customerPayments
  const operatingNet = calculateCashFlow(operatingInflow, operatingOutflow)

  const investingOutflow = inputs.investing.equipment + inputs.investing.repairs + inputs.investing.assetPurchases
  const investingNet = calculateCashFlow(0, investingOutflow)

  const financingInflow = inputs.financing.loanReceived + inputs.financing.ownerInvestment
  const financingOutflow = inputs.financing.loanRepaid + inputs.financing.ownerWithdrawal
  const financingNet = calculateCashFlow(financingInflow, financingOutflow)

  const netCashFlow = operatingNet + investingNet + financingNet
  const closingBalance = inputs.openingBalance + netCashFlow

  return {
    openingBalance: inputs.openingBalance,
    operatingNet,
    investingNet,
    financingNet,
    netCashFlow,
    closingBalance,
    operatingInflow,
    operatingOutflow,
  }
}
