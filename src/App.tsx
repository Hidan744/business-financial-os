import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { LandingPage } from '@/pages/LandingPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DashboardPage } from '@/pages/DashboardPage'

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const FinancePage = lazy(() => import('@/pages/FinancePage').then((m) => ({ default: m.FinancePage })))
const CashflowPage = lazy(() => import('@/pages/CashflowPage').then((m) => ({ default: m.CashflowPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const SimulatorPage = lazy(() => import('@/pages/SimulatorPage').then((m) => ({ default: m.SimulatorPage })))
const SalesPage = lazy(() => import('@/pages/SalesPage').then((m) => ({ default: m.SalesPage })))
const ForecastPage = lazy(() => import('@/pages/ForecastPage').then((m) => ({ default: m.ForecastPage })))
const AiCfoPage = lazy(() => import('@/pages/AiCfoPage').then((m) => ({ default: m.AiCfoPage })))
const CrisisPage = lazy(() => import('@/pages/CrisisPage').then((m) => ({ default: m.CrisisPage })))
const StressTestPage = lazy(() => import('@/pages/StressTestPage').then((m) => ({ default: m.StressTestPage })))
const DebtsPage = lazy(() => import('@/pages/DebtsPage').then((m) => ({ default: m.DebtsPage })))
const ReportPage = lazy(() => import('@/pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function RouteFallback() {
  return <div className="py-24 text-center text-sm text-ink-500">Загрузка…</div>
}

function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <TooltipProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="cashflow" element={<CashflowPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="ai-cfo" element={<AiCfoPage />} />
            <Route path="crisis" element={<CrisisPage />} />
            <Route path="stress-test" element={<StressTestPage />} />
            <Route path="debts" element={<DebtsPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </TooltipProvider>
  )
}

export default App
