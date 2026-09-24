import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Gauge,
  LineChart,
  Sparkles,
  Target,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BrandMark } from '@/components/icons/BrandMark'
import { useBusinessStore } from '@/store/businessStore'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  'Что происходит с вашими деньгами?',
  'Где бизнес теряет прибыль?',
  'Что будет, если изменить цену?',
  'Сколько нужно продавать для прибыли 500 000 ₽?',
]

const FEATURES = [
  {
    icon: Gauge,
    title: 'Финансовое здоровье в одном экране',
    text: 'Выручка, чистая прибыль, EBITDA, маржа, точка безубыточности, cash flow — без бухгалтерских терминов без объяснения.',
  },
  {
    icon: Target,
    title: 'Точка безубыточности и целевой доход',
    text: 'Узнайте, сколько нужно продавать, чтобы выйти в ноль — и сколько, чтобы получать желаемую прибыль.',
  },
  {
    icon: LineChart,
    title: 'Симулятор «Что будет, если…»',
    text: 'Двигайте цену, рекламу, штат — и мгновенно видьте, как изменится прибыль и запас прочности.',
  },
  {
    icon: AlertTriangle,
    title: 'Антикризисная диагностика',
    text: 'Система находит проблемы по конкретным показателям и формирует план действий на 30 дней.',
  },
  {
    icon: Bot,
    title: 'AI CFO',
    text: 'Задайте вопрос о своих финансах — получите структурированный ответ на основе ваших реальных данных.',
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const loadDemo = useBusinessStore((s) => s.loadDemo)

  async function handleDemo() {
    await loadDemo()
    navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-800/60 bg-ink-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 lg:px-8 h-16">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 shrink-0">
              <BrandMark className="size-4" />
            </div>
            <span className="text-sm font-semibold truncate">Business Financial OS</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button variant="secondary" size="sm" asChild>
              <Link to="/auth">
                <span className="hidden sm:inline">Войти / Зарегистрироваться</span>
                <span className="sm:hidden">Войти</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDemo} className="hidden sm:inline-flex">
              Посмотреть демо
            </Button>
            <Button size="sm" asChild>
              <Link to="/onboarding">Попробовать бесплатно</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto text-center px-4 pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900 px-3 py-1 text-xs text-ink-400 mb-6">
          <Sparkles className="size-3 text-brand-400" />
          Ваш финансовый директор в браузере
        </div>
        <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
          Финансовый директор
          <br />
          вашего бизнеса — в браузере
        </h1>
        <p className="mt-6 text-lg text-ink-400 max-w-2xl mx-auto">
          Анализируйте прибыль, находите точки роста, моделируйте решения и управляйте
          финансами бизнеса в одной системе.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/onboarding">
              Попробовать бесплатно <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" onClick={handleDemo}>
            Посмотреть демо
          </Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 gap-3">
          {QUESTIONS.map((q) => (
            <Card key={q} className="px-5 py-4 text-ink-200 text-sm">
              «{q}»
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 mb-4">
                <Icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-ink-50 mb-2">{title}</h3>
              <p className="text-sm text-ink-400 leading-relaxed">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-28 text-center">
        <h2 className="text-2xl lg:text-3xl font-semibold mb-4">Готовы понять свой бизнес за 3 минуты?</h2>
        <p className="text-ink-400 mb-8">
          Пройдите короткий онбординг или откройте демо-бизнес Nord Wear, чтобы сразу увидеть,
          как работает система.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/onboarding">
              Создать свой бизнес <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" onClick={handleDemo}>
            Открыть демо Nord Wear
          </Button>
        </div>
      </section>

      <footer className="border-t border-ink-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-xs text-ink-500 text-center space-y-1.5">
          <p>Business Financial OS — MVP. Все расчёты выполняются локально в вашем браузере.</p>
          <p>
            Сделано в{' '}
            <a
              href="https://vinakovlab.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-400 hover:text-ink-200 underline underline-offset-2"
            >
              vinakovlab.ru
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
