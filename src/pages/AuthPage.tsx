import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { BrandMark } from '@/components/icons/BrandMark'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'

export function AuthPage() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const error = useAuthStore((s) => s.error)
  const cloudEnabled = useAuthStore((s) => s.cloudEnabled)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signUpMessage, setSignUpMessage] = useState<string | null>(null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const ok = await signIn(email, password)
    setSubmitting(false)
    if (ok) navigate('/app/dashboard')
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSignUpMessage(null)
    const ok = await signUp(email, password)
    setSubmitting(false)
    if (ok) setSignUpMessage('Проверьте почту — мы отправили письмо для подтверждения регистрации.')
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
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
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="signin-password">Пароль</Label>
                  <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
                </div>
                {error && <p className="text-xs text-negative-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Входим…' : 'Войти'}
                </Button>
              </form>
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
                {error && <p className="text-xs text-negative-500">{error}</p>}
                {signUpMessage && <p className="text-xs text-positive-500">{signUpMessage}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
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
