import { useNavigate } from 'react-router-dom'
import { Cloud, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { InfoTooltip } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImportPanel } from '@/features/import/ImportPanel'
import { TeamAccessPanel } from '@/features/team/TeamAccessPanel'
import { useBusinessStore } from '@/store/businessStore'
import { useAuthStore } from '@/store/authStore'
import { BUSINESS_TYPE_LABELS, PERIOD_LABELS } from '@/types/business'
import { PROTECTABLE_ROUTES } from '@/types/access'
import { MODULE_IDS, MODULE_LABELS, MODULE_HINTS, MODULE_UNLOCKS, getEffectiveModules } from '@/types/modules'
import type { ModuleId } from '@/types/modules'
import { NAV_ITEMS, getModuleVisibleNavItems } from '@/lib/navigation'

const CURRENCIES = [
  { value: 'RUB', label: '₽ Российский рубль' },
  { value: 'USD', label: '$ Доллар США' },
  { value: 'EUR', label: '€ Евро' },
  { value: 'KZT', label: '₸ Тенге' },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const profile = useBusinessStore((s) => s.profile)
  const businessList = useBusinessStore((s) => s.businessList)
  const updateProfile = useBusinessStore((s) => s.updateProfile)
  const removeBusiness = useBusinessStore((s) => s.removeBusiness)
  const resetAll = useBusinessStore((s) => s.resetAll)
  const accessSettings = useBusinessStore((s) => s.accessSettings)
  const updateAccessSettings = useBusinessStore((s) => s.updateAccessSettings)
  const authStatus = useAuthStore((s) => s.status)
  const authUser = useAuthStore((s) => s.user)
  const cloudEnabled = useAuthStore((s) => s.cloudEnabled)
  const signOut = useAuthStore((s) => s.signOut)
  const myRole = useBusinessStore((s) => s.myRole)

  if (!profile) return null

  // Реальный командный доступ (свой логин у каждого сотрудника) заменяет PIN только
  // для бизнесов в облаке, где текущий пользователь — владелец. В локальном/гостевом
  // режиме нет backend, чтобы это проверять, поэтому там остаётся старый PIN-замок.
  const hasCloudTeamAccess = cloudEnabled && authStatus === 'authenticated' && myRole === 'owner'

  const hasOtherBusinesses = businessList.length > 1
  const modules = getEffectiveModules(profile)
  // Не предлагаем закрыть PIN-ом раздел, которого и так нет в меню — список подстраивается
  // под те же модули, что и навигация.
  const protectableRoutePaths = new Set(getModuleVisibleNavItems(NAV_ITEMS, modules).map((i) => i.to))
  const visibleProtectableRoutes = PROTECTABLE_ROUTES.filter((route) => protectableRoutePaths.has(route.path))

  function toggleModule(id: ModuleId) {
    updateProfile({ modules: { ...modules, [id]: !modules[id] } })
  }

  async function handleRemoveCurrent() {
    if (!profile) return
    if (!window.confirm(`Удалить бизнес «${profile.name}»? Это действие необратимо.`)) return
    await removeBusiness(profile.id)
  }

  async function handleReset() {
    if (!window.confirm('Удалить все данные всех бизнесов из этого браузера? Это действие необратимо.')) return
    await resetAll()
    navigate('/onboarding')
  }

  function toggleProtectedRoute(path: string) {
    const isProtected = accessSettings.protectedRoutes.includes(path)
    updateAccessSettings({
      protectedRoutes: isProtected
        ? accessSettings.protectedRoutes.filter((p) => p !== path)
        : [...accessSettings.protectedRoutes, path],
    })
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Настройки</h1>
        <p className="text-sm text-ink-500 mt-1">Профиль бизнеса и параметры анализа.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Профиль бизнеса</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div>
            <Label htmlFor="business-name">Название бизнеса</Label>
            <Input
              id="business-name"
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Тип бизнеса</Label>
            <Select value={profile.type} onValueChange={(v) => updateProfile({ type: v as typeof profile.type })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Период анализа</Label>
            <Select value={profile.period} onValueChange={(v) => updateProfile({ period: v as typeof profile.period })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Валюта</Label>
            <Select value={profile.currency} onValueChange={(v) => updateProfile({ currency: v })}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employees-count">Количество сотрудников</Label>
            <Input
              id="employees-count"
              inputMode="numeric"
              value={profile.employeesCount}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ''))
                updateProfile({ employeesCount: Number.isFinite(n) ? n : 0 })
              }}
              className="mt-2 w-32"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-ink-800 px-4 py-3">
            <div>
              <div className="text-sm text-ink-100">Режим самозанятого</div>
              <div className="text-xs text-ink-500 mt-0.5">Упрощённый Dashboard: доход − расходы − налог, без акцента на ФОТ и сотрудников.</div>
            </div>
            <Button
              size="sm"
              variant={profile.isSelfEmployed ? 'secondary' : 'ghost'}
              onClick={() => updateProfile({ isSelfEmployed: !profile.isSelfEmployed })}
            >
              {profile.isSelfEmployed ? 'Включён' : 'Выключен'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Процессы бизнеса
            <InfoTooltip>
              Определяет, какие разделы, KPI и рекомендации показывать. Например, если у вас нет склада —
              выключите его здесь, и раздел «Склад», DIO и оборачиваемость запасов исчезнут из меню и
              показателей. Ничего не удаляется — включить обратно можно в любой момент.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid sm:grid-cols-2 gap-2">
            {MODULE_IDS.map((id) => (
              <label
                key={id}
                className="flex items-start gap-2.5 rounded-xl border border-ink-800 px-3.5 py-3 cursor-pointer hover:bg-ink-900 transition-colors"
              >
                <Checkbox checked={modules[id]} onChange={() => toggleModule(id)} className="mt-0.5" />
                <span>
                  <span className="block text-sm text-ink-100">{MODULE_LABELS[id]}</span>
                  <span className="block text-xs text-ink-500 mt-0.5">{MODULE_HINTS[id]}</span>
                  <span className="block text-xs text-ink-600 mt-1">Включает: {MODULE_UNLOCKS[id].join(', ')}</span>
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {hasCloudTeamAccess ? (
        <TeamAccessPanel businessId={profile.id} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <KeyRound className="size-4" /> Доступ по PIN-коду
              <InfoTooltip>
                Устройство и вход общие, но отдельные разделы можно закрыть PIN-ом — например, чтобы сотрудник за
                кассой не видел Финансы или Настройки. Это ограничение «на бумаге»: PIN хранится вместе с данными
                бизнеса без шифрования, так что не полагайтесь на него как на защиту от технически подкованного
                человека — это про порядок в команде, не про безопасность уровня банка.
                {cloudEnabled && ' Войдите в аккаунт, чтобы вместо PIN выдавать сотрудникам доступ по их собственному логину.'}
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-5">
            <div className="max-w-xs">
              <Label htmlFor="owner-pin">Ваш PIN (открывает все защищённые разделы)</Label>
              <Input
                id="owner-pin"
                inputMode="numeric"
                placeholder="Например, 1234"
                value={accessSettings.ownerPin ?? ''}
                onChange={(e) => updateAccessSettings({ ownerPin: e.target.value.replace(/\D/g, '').slice(0, 6) || null })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Какие разделы закрыть PIN-ом</Label>
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {visibleProtectableRoutes.map((route) => (
                  <label
                    key={route.path}
                    className="flex items-center gap-2.5 rounded-lg border border-ink-800 px-3 py-2 cursor-pointer hover:bg-ink-900"
                  >
                    <Checkbox
                      checked={accessSettings.protectedRoutes.includes(route.path)}
                      onChange={() => toggleProtectedRoute(route.path)}
                    />
                    <span className="text-sm text-ink-200">{route.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <p className="text-xs text-ink-500">
              Доступ конкретным сотрудникам к этим разделам выдаётся на странице «Сотрудники» — там же задаётся
              персональный PIN каждого.
            </p>
          </CardContent>
        </Card>
      )}

      {cloudEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Cloud className="size-4" /> Аккаунт
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {authStatus === 'authenticated' && authUser ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink-100">{authUser.email}</div>
                  <div className="text-xs text-positive-500 mt-0.5">Данные синхронизируются в облаке</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => signOut()}>
                  <LogOut className="size-4" /> Выйти
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-400">Данные хранятся только в этом браузере.</p>
                <Button size="sm" onClick={() => navigate('/auth')}>
                  Войти / Зарегистрироваться
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ImportPanel />

      <Card className="border-negative-500/30">
        <CardHeader>
          <CardTitle className="text-negative-500">Опасная зона</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {hasOtherBusinesses && (
            <div>
              <p className="text-sm text-ink-400 mb-3">
                Удалить только «{profile.name}» — остальные бизнесы останутся.
              </p>
              <Button variant="destructive" size="sm" onClick={handleRemoveCurrent}>
                <Trash2 className="size-4" /> Удалить этот бизнес
              </Button>
            </div>
          )}
          <div>
            <p className="text-sm text-ink-400 mb-3">
              Удалить все данные всех бизнесов, сохранённые в этом браузере, и начать заново.
            </p>
            <Button variant="destructive" onClick={handleReset}>
              <Trash2 className="size-4" /> Сбросить все данные
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
