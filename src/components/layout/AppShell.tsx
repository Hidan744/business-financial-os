import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { RouteGate } from '@/components/access/RouteGate'
import { DailyDigestModal } from '@/components/digest/DailyDigestModal'
import { useBusinessStore } from '@/store/businessStore'

export function AppShell() {
  const status = useBusinessStore((s) => s.status)

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-950 text-ink-400 text-sm">
        Загрузка…
      </div>
    )
  }

  if (status === 'onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="flex min-h-screen print:bg-white print:block">
      <div className="aurora-backdrop-app print:hidden" />
      <Sidebar />
      <div className="flex-1 min-w-0">
        <MobileNav />
        <main className="max-w-[1400px] mx-auto px-4 py-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          <RouteGate>
            <Outlet />
          </RouteGate>
        </main>
      </div>
      <DailyDigestModal />
    </div>
  )
}
