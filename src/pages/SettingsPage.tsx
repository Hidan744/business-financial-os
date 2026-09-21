import { useNavigate } from 'react-router-dom'
import { Cloud, LogOut, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImportPanel } from '@/features/import/ImportPanel'
import { useBusinessStore } from '@/store/businessStore'
import { useAuthStore } from '@/store/authStore'
import { BUSINESS_TYPE_LABELS, PERIOD_LABELS } from '@/types/business'

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
  const authStatus = useAuthStore((s) => s.status)
  const authUser = useAuthStore((s) => s.user)
  const cloudEnabled = useAuthStore((s) => s.cloudEnabled)
  const signOut = useAuthStore((s) => s.signOut)

  if (!profile) return null

  const hasOtherBusinesses = businessList.length > 1

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
