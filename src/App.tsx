import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { LandingPage } from '@/pages/LandingPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DashboardPage } from '@/pages/DashboardPage'

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const FinancePage = lazy(() => import('@/pages/FinancePage').then((m) => ({ default: m.FinancePage })))
const BalancePage = lazy(() => import('@/pages/BalancePage').then((m) => ({ default: m.BalancePage })))
const HRPage = lazy(() => import('@/pages/HRPage').then((m) => ({ default: m.HRPage })))
const InventoryPage = lazy(() => import('@/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const GoalsPage = lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const UnitEconomicsPage = lazy(() => import('@/pages/UnitEconomicsPage').then((m) => ({ default: m.UnitEconomicsPage })))
const TaxesPage = lazy(() => import('@/pages/TaxesPage').then((m) => ({ default: m.TaxesPage })))
const CashflowPage = lazy(() => import('@/pages/CashflowPage').then((m) => ({ default: m.CashflowPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const HistoryImportPage = lazy(() => import('@/pages/HistoryImportPage').then((m) => ({ default: m.HistoryImportPage })))
const SimulatorPage = lazy(() => import('@/pages/SimulatorPage').then((m) => ({ default: m.SimulatorPage })))
const SalesPage = lazy(() => import('@/pages/SalesPage').then((m) => ({ default: m.SalesPage })))
const ForecastPage = lazy(() => import('@/pages/ForecastPage').then((m) => ({ default: m.ForecastPage })))
const FinancialPlanPage = lazy(() => import('@/pages/FinancialPlanPage').then((m) => ({ default: m.FinancialPlanPage })))
const AiCfoPage = lazy(() => import('@/pages/AiCfoPage').then((m) => ({ default: m.AiCfoPage })))
const CrisisPage = lazy(() => import('@/pages/CrisisPage').then((m) => ({ default: m.CrisisPage })))
const StressTestPage = lazy(() => import('@/pages/StressTestPage').then((m) => ({ default: m.StressTestPage })))
const DebtsPage = lazy(() => import('@/pages/DebtsPage').then((m) => ({ default: m.DebtsPage })))
const ReportPage = lazy(() => import('@/pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function RouteFallback() {
  return <div className="py-24 text-center text-sm text-ink-500">Загрузка…</div>
}

/**
 * Ссылка восстановления пароля из письма ведёт на корень сайта с параметрами Supabase
 * прямо в хэше (#access_token=...&type=recovery) — не на путь вида #/reset-password,
 * потому что тогда получился бы второй "#" внутри хэша и Supabase не смог бы разобрать
 * свои же параметры. Поэтому вместо редиректа по пути просто рендерим страницу сброса
 * пароля напрямую, не трогая location — сама ссылка/URL остаётся как есть.
 */
function CatchAllRoute() {
  const isRecoveryLink = window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')
  if (isRecoveryLink) return <ResetPasswordPage />
  return <Navigate to="/" replace />
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
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="taxes" element={<TaxesPage />} />
            <Route path="balance" element={<BalancePage />} />
            <Route path="hr" element={<HRPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="unit-economics" element={<UnitEconomicsPage />} />
            <Route path="cashflow" element={<CashflowPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="history-import" element={<HistoryImportPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="plan" element={<FinancialPlanPage />} />
            <Route path="ai-cfo" element={<AiCfoPage />} />
            <Route path="crisis" element={<CrisisPage />} />
            <Route path="stress-test" element={<StressTestPage />} />
            <Route path="debts" element={<DebtsPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
      </Suspense>
    </TooltipProvider>
  )
}

export default App
