import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { BrandMark } from '@/components/icons/BrandMark'
import { useAuthStore } from '@/store/authStore'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const error = useAuthStore((s) => s.error)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    setSubmitting(true)
    const ok = await updatePassword(password)
    setSubmitting(false)
    if (ok) setDone(true)
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <BrandMark className="size-5 text-brand-400" />
        <span className="text-sm font-semibold text-ink-50">Business Financial OS</span>
      </div>

      <Card className="w-full max-w-sm p-6">
        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-positive-500">Пароль изменён.</p>
            <Button className="w-full" onClick={() => navigate('/app/dashboard')}>
              Перейти в приложение
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="text-base font-semibold text-ink-50 mb-1">Новый пароль</h1>
              <p className="text-xs text-ink-500">Придумайте новый пароль для входа.</p>
            </div>
            <div>
              <Label htmlFor="new-password">Новый пароль</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Повторите пароль</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2"
              />
            </div>
            {mismatch && <p className="text-xs text-negative-500">Пароли не совпадают</p>}
            {error && <p className="text-xs text-negative-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Сохраняем…' : 'Сохранить пароль'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
