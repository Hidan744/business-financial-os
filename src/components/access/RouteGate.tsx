import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Lock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBusinessStore } from '@/store/businessStore'
import { useAccessGateStore } from '@/store/accessGateStore'
import { isRouteUnlockedForMember } from '@/types/teamAccess'

export function RouteGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const myRole = useBusinessStore((s) => s.myRole)
  const myAllowedDomains = useBusinessStore((s) => s.myAllowedDomains)
  const accessSettings = useBusinessStore((s) => s.accessSettings)
  const employees = useBusinessStore((s) => s.employees)
  const unlockedRoutes = useAccessGateStore((s) => s.unlockedRoutes)
  const unlock = useAccessGateStore((s) => s.unlock)

  const [pin, setPin] = useState('')
  const [attemptFailed, setAttemptFailed] = useState(false)

  const path = location.pathname

  // Бизнес в облаке с реальными аккаунтами команды (myRole !== null) — доступ проверен
  // сервером ещё на загрузке данных (get_business_view отдал только разрешённые ключи),
  // PIN тут не участвует вообще. Владелец видит всё; участник — по своим доменам.
  if (myRole === 'owner') return <>{children}</>
  if (myRole === 'member') {
    if (isRouteUnlockedForMember(path, myAllowedDomains)) return <>{children}</>
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-ink-800 text-ink-400 mb-4">
          <Users className="size-5" />
        </div>
        <h2 className="text-lg font-semibold text-ink-50 mb-1">Нет доступа к разделу</h2>
        <p className="text-sm text-ink-500 max-w-xs">
          Владелец бизнеса не открыл вам этот раздел. Обратитесь к нему, если доступ нужен.
        </p>
      </div>
    )
  }

  // Локальный/гостевой режим (нет Supabase-бизнеса) — здесь нет реального backend, поэтому
  // PIN остаётся тем же "вежливым замком", что и раньше: прячет UI на этом устройстве,
  // но не является криптографической защитой данных.
  const isProtected = accessSettings.protectedRoutes.includes(path)
  const isUnlocked = !isProtected || unlockedRoutes.includes(path)

  if (isUnlocked) return <>{children}</>

  function submit(e: FormEvent) {
    e.preventDefault()
    if (accessSettings.ownerPin && pin === accessSettings.ownerPin) {
      unlock('owner', accessSettings.protectedRoutes)
      setPin('')
      setAttemptFailed(false)
      return
    }
    const employee = employees.find((emp) => emp.pin && emp.pin === pin)
    if (employee) {
      unlock(employee.id, employee.allowedRoutes ?? [])
      setPin('')
      setAttemptFailed(false)
      return
    }
    setAttemptFailed(true)
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 mb-4">
        <Lock className="size-5" />
      </div>
      <h2 className="text-lg font-semibold text-ink-50 mb-1">Раздел защищён PIN-кодом</h2>
      <p className="text-sm text-ink-500 mb-6 max-w-xs">
        Введите PIN владельца или PIN сотрудника, у которого есть доступ к этому разделу.
      </p>
      <form onSubmit={submit} className="flex items-center gap-2">
        <Input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setAttemptFailed(false)
          }}
          inputMode="numeric"
          placeholder="PIN"
          autoFocus
          className="w-32 text-center tracking-[0.3em]"
        />
        <Button type="submit">Открыть</Button>
      </form>
      {attemptFailed && <p className="text-xs text-negative-500 mt-3">Неверный PIN</p>}
    </div>
  )
}
