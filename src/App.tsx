import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useBusinessStore } from '@/store/businessStore'
import { LandingPage } from '@/pages/LandingPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FinancePage } from '@/pages/FinancePage'
import { CashflowPage } from '@/pages/CashflowPage'
import { SimulatorPage } from '@/pages/SimulatorPage'
import { SalesPage } from '@/pages/SalesPage'
import { ForecastPage } from '@/pages/ForecastPage'
import { AiCfoPage } from '@/pages/AiCfoPage'
import { CrisisPage } from '@/pages/CrisisPage'
import { ReportPage } from '@/pages/ReportPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  const hydrate = useBusinessStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <TooltipProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="cashflow" element={<CashflowPage />} />
          <Route path="simulator" element={<SimulatorPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="ai-cfo" element={<AiCfoPage />} />
          <Route path="crisis" element={<CrisisPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TooltipProvider>
  )
}

export default App
