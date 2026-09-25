import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { BrandMark } from '@/components/icons/BrandMark'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'

export function AuthPage() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset)
  const error = useAuthStore((s) => s.error)
  const cloudEnabled = useAuthStore((s) => s.cloudEnabled)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [signUpMessage, setSignUpMessage] = useState<string | null>(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const ok = await signIn(email, password)
    setSubmitting(false)
    if (ok) navigate('/app/dashboard')
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResetMessage(null)
    const ok = await requestPasswordReset(email)
    setSubmitting(false)
    if (ok) setResetMessage('Проверьте почту — мы отправили ссылку для сброса пароля.')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) return
    setSubmitting(true)
    setSignUpMessage(null)
    const ok = await signUp(email, password)
    setSubmitting(false)
    if (ok) setSignUpMessage('Проверьте почту — мы отправили письмо для подтверждения регистрации.')
  }

  return (
    <div className="relative min-h-screen bg-ink-950 flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="aurora-backdrop-app" />
      <div className="relative flex items-center gap-2 mb-8">
        <BrandMark className="size-5 text-brand-400" />
        <span className="text-sm font-semibold text-ink-50">Business Financial OS</span>
      </div>

      <Card className="w-full max-w-sm p-6">
        {!cloudEnabled ? (
          <p className="text-sm text-ink-400">
            Облачная синхронизация сейчас не настроена. Приложение продолжает работать локально в этом браузере.
          </p>
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="w-full mb-5">
              <TabsTrigger value="signin" className="flex-1">Войти</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {forgotMode ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <p className="text-xs text-ink-400">Укажите email — пришлём ссылку для сброса пароля.</p>
                  </div>
                  <div>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
                  </div>
                  {error && <p className="text-xs text-negative-500">{error}</p>}
                  {resetMessage && <p className="text-xs text-positive-500">{resetMessage}</p>}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Отправляем…' : 'Отправить ссылку'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false)
                      setResetMessage(null)
                    }}
                    className="text-xs text-ink-400 hover:text-ink-100 w-full text-center"
                  >
                    Назад к входу
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Пароль</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMode(true)
                          setResetMessage(null)
                        }}
                        className="text-xs text-brand-400 hover:underline"
                      >
                        Забыли пароль?
                      </button>
                    </div>
                    <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
                  </div>
                  {error && <p className="text-xs text-negative-500">{error}</p>}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Входим…' : 'Войти'}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="signup-password">Пароль</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5" />
                  <span className="text-xs text-ink-400 leading-snug">
                    Даю согласие на обработку персональных данных в соответствии с{' '}
                    <Link to="/privacy" target="_blank" className="text-brand-400 hover:underline">
                      Политикой обработки персональных данных
                    </Link>
                  </span>
                </label>
                {error && <p className="text-xs text-negative-500">{error}</p>}
                {signUpMessage && <p className="text-xs text-positive-500">{signUpMessage}</p>}
                <Button type="submit" className="w-full" disabled={submitting || !consent}>
                  {submitting ? 'Регистрируем…' : 'Зарегистрироваться'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </Card>

      <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate('/app/dashboard')}>
        Продолжить без входа
      </Button>
    </div>
  )
}
