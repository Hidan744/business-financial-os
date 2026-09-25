import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  Gauge,
  LineChart,
  Package,
  Target,
  Upload,
  Wand2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BrandMark } from '@/components/icons/BrandMark'
import { BusinessTypePickerModal } from '@/components/landing/BusinessTypePickerModal'
import { useBusinessStore } from '@/store/businessStore'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { BusinessType } from '@/types/business'

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
    gradient: 'from-aurora-amber-soft via-aurora-violet to-ink-900',
  },
  {
    icon: Target,
    title: 'Точка безубыточности и целевой доход',
    text: 'Узнайте, сколько нужно продавать, чтобы выйти в ноль — и сколько, чтобы получать желаемую прибыль.',
    gradient: 'from-aurora-blue-soft via-aurora-amber-soft to-ink-900',
  },
  {
    icon: LineChart,
    title: 'Симулятор «Что будет, если…»',
    text: 'Двигайте цену, рекламу, штат — и мгновенно видьте, как изменится прибыль и запас прочности.',
    gradient: 'from-aurora-violet via-aurora-blue to-ink-900',
  },
  {
    icon: AlertTriangle,
    title: 'Антикризисная диагностика',
    text: 'Система находит проблемы по конкретным показателям и формирует план действий на 30 дней.',
    gradient: 'from-negative-500 via-aurora-amber-soft to-ink-900',
  },
  {
    icon: Package,
    title: 'Складской учёт и остатки',
    text: 'Остаток считается сам — по движениям (приход минус расход), а не вбивается вручную. Статусы «мало» и «критично» по каждой позиции и стоимость склада целиком.',
    gradient: 'from-aurora-blue via-aurora-violet to-ink-900',
  },
  {
    icon: Calendar,
    title: 'Ежедневный дайджест руководителя',
    text: 'Каждый день при входе — сводка без единого клика: остаток денег, прибыль, риск кассового разрыва и что срочно требует внимания на складе.',
    gradient: 'from-aurora-amber-soft via-aurora-blue-soft to-ink-900',
  },
  {
    icon: Bot,
    title: 'AI CFO',
    text: 'Задайте вопрос о своих финансах — получите структурированный ответ на основе ваших реальных данных.',
    gradient: 'from-aurora-violet via-aurora-blue-soft to-ink-900',
  },
]

const IMPLEMENTATION_STEPS = [
  {
    icon: ClipboardCheck,
    title: 'Аудит учёта',
    text: 'Смотрим, как сейчас считаются деньги — в 1С, Excel или в голове — и что из этого можно перенести без потерь.',
  },
  {
    icon: Upload,
    title: 'Перенос данных из 1С/Excel',
    text: 'Загружаем историю по периодам, товары, сотрудников — стартуете не с чистого листа, а со своими реальными цифрами.',
  },
  {
    icon: Wand2,
    title: 'Настройка AI CFO под нишу',
    text: 'Включаем нужные модули, налоговый режим и KPI под вашу отрасль — розница, услуги, производство, кафе.',
  },
  {
    icon: GraduationCap,
    title: 'Обучение команды',
    text: 'Показываем, где что смотреть и что проверять каждый день, — дальше команда работает в системе самостоятельно.',
  },
]

const NAV_LINKS = [
  { href: '#features', label: 'Возможности' },
  { href: '#spotlight', label: 'Как это работает' },
  { href: '#onboarding', label: 'Внедрение' },
  { href: '#demo', label: 'Демо' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const loadDemo = useBusinessStore((s) => s.loadDemo)
  const [pickerOpen, setPickerOpen] = useState(false)

  async function handleSelectType(type: BusinessType) {
    setPickerOpen(false)
    await loadDemo(type)
    navigate('/app/dashboard')
  }

  return (
    <div className="relative min-h-screen bg-ink-950 text-ink-50 overflow-x-clip">
      <div className="aurora-backdrop" />

      <header className="sticky top-0 z-40 py-5">
        <div className="relative z-10 max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-[30px] items-center justify-center rounded-[9px] bg-linear-to-br from-aurora-amber-soft via-aurora-violet to-aurora-blue shrink-0 shadow-[0_0_18px_rgba(139,111,232,0.4)]">
              <BrandMark className="size-4 text-ink-950" />
            </div>
            <span className="font-display text-sm font-semibold truncate">Business Financial OS</span>
          </div>

          <nav className="hidden md:flex items-center gap-0.5 rounded-full border border-ink-800 bg-white/[0.03] backdrop-blur-md p-1.5">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-ink-300 hover:text-ink-50 hover:bg-white/[0.06] rounded-full px-4 py-2 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" className="hidden sm:inline-flex rounded-full" asChild>
              <Link to="/auth">Войти</Link>
            </Button>
            <Button size="sm" className="rounded-full btn-aurora-glow text-ink-50 shadow-none" asChild>
              <Link to="/onboarding">Начать бесплатно</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="max-w-4xl mx-auto text-center px-4 pt-10 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-white/[0.04] px-4 py-1.5 text-xs text-ink-300 mb-7">
            <span className="size-1.5 rounded-full bg-positive-500 shadow-[0_0_8px_rgba(12,163,12,0.7)]" />
            Работает прямо в браузере — без установки
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            Финансовый директор
            <br />
            вашего бизнеса
          </h1>
          <p className="mt-6 text-lg text-ink-300 max-w-2xl mx-auto">
            Единая система финансового и складского учёта со встроенным AI-советником.
            Прогнозируйте кассовые разрывы, считайте юнит-экономику и управляйте задачами —
            без десятка Excel-таблиц.
          </p>
          <div className="mt-9 mb-14 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="rounded-full btn-aurora-glow text-ink-50 shadow-none" asChild>
              <Link to="/onboarding">
                Попробовать бесплатно <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full" onClick={() => setPickerOpen(true)}>
              Смотреть демо
            </Button>
          </div>

          <Frame label="business-financial-os.app · Dashboard" className="max-w-4xl mx-auto">
            <img
              src={`${import.meta.env.BASE_URL}landing/dashboard.png`}
              alt="Dashboard: выручка, чистая прибыль, EBITDA, риск кассового разрыва и блок «что делать сейчас»"
              className="w-full block"
            />
          </Frame>
        </section>

        <section className="max-w-5xl mx-auto px-4 pt-16 pb-20">
          <div className="grid sm:grid-cols-2 gap-3">
            {QUESTIONS.map((q) => (
              <Card key={q} className="px-5 py-4 text-ink-200 text-sm">
                «{q}»
              </Card>
            ))}
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-4 pb-24 scroll-mt-24">
          <SectionHead eyebrow="Возможности" title="Всё, что нужно для финансов бизнеса">
            Семь модулей, которые закрывают реальные боли малого и среднего бизнеса — не витрина функций.
          </SectionHead>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, text, gradient }) => (
              <Card key={title} className="overflow-hidden p-0">
                <div className={cn('relative h-32 bg-linear-to-br', gradient)}>
                  <Icon className="absolute top-4 right-4 size-7 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold text-ink-50 mb-2">{title}</h3>
                  <p className="text-[13px] text-ink-500 leading-relaxed">{text}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="spotlight" className="max-w-6xl mx-auto px-4 pb-24 scroll-mt-24">
          <SectionHead eyebrow="Крупный план" title="Наценка и маржа — не одно и то же">
            Калькулятор цены на «Продажах» показывает обе цифры сразу, чтобы не перепутать.
          </SectionHead>
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 items-center">
            <div>
              <p className="text-[15px] text-ink-300 leading-relaxed max-w-[34ch]">
                Самая частая ошибка ценообразования — путать наценку (% от себестоимости) с маржой (% от цены).
                Одна и та же прибыль в рублях даёт разные проценты в зависимости от того, что считать за 100%.
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {['Наценка vs маржа', 'НДС сверху цены', 'Безубыточность в штуках', 'Сравнение с конкурентами'].map((t) => (
                  <span key={t} className="text-xs text-ink-300 border border-ink-700 bg-white/[0.03] rounded-full px-3.5 py-2">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <Frame label="Продажи · Цена на товар">
              <img
                src={`${import.meta.env.BASE_URL}landing/pricing.png`}
                alt="Калькулятор цены: наценка 40% против маржи 28,6% на одной и той же цене"
                className="w-full block"
              />
            </Frame>
          </div>
        </section>

        <section id="onboarding" className="max-w-6xl mx-auto px-4 pb-24 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto mb-11">
            <span className="inline-block text-xs font-semibold tracking-[0.14em] uppercase text-aurora-blue-soft mb-3.5">
              Внедрение под ключ
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-3">Не просто софт — готовое решение</h2>
            <p className="text-ink-400">Переезд с 1С или Excel — это не «разбирайтесь сами». Проходим весь путь вместе с вами.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {IMPLEMENTATION_STEPS.map(({ title, text }, i) => (
              <Card key={title} className="p-6">
                <span className="text-aurora-gradient font-display text-2xl font-bold block mb-4">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-base font-semibold text-ink-50 mb-2">{title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{text}</p>
              </Card>
            ))}
          </div>
          <Card className="mt-4 p-7 flex flex-col sm:flex-row items-center justify-between gap-6 bg-linear-to-br from-aurora-violet/10 to-aurora-blue/5 border-ink-700">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-50 mb-1">Готовы начать?</h3>
              <p className="text-sm text-ink-400">Обучим команду и будем на связи, пока вы не освоитесь в системе.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button className="rounded-full btn-aurora-glow text-ink-50 shadow-none" asChild>
                <Link to="/onboarding">Попробовать бесплатно</Link>
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setPickerOpen(true)}>
                Смотреть демо
              </Button>
            </div>
          </Card>
        </section>

        <section id="demo" className="max-w-2xl mx-auto px-4 pb-28 text-center scroll-mt-24">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-4">Посмотрите на своих цифрах</h2>
          <p className="text-ink-400 mb-8">
            Выберите тип бизнеса — покажем демо с разделами, которые реально нужны именно такому бизнесу. Без регистрации.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="rounded-full btn-aurora-glow text-ink-50 shadow-none" onClick={() => setPickerOpen(true)}>
              Посмотреть демо
            </Button>
            <Button size="lg" variant="outline" className="rounded-full" asChild>
              <Link to="/onboarding">
                Создать свой бизнес <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {pickerOpen && <BusinessTypePickerModal onSelect={handleSelectType} onClose={() => setPickerOpen(false)} />}

      <footer className="relative z-10 border-t border-ink-800 py-8">
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

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 mb-11">
      <div>
        <span className="block text-xs font-semibold tracking-[0.14em] uppercase text-aurora-blue-soft mb-3.5">{eyebrow}</span>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold max-w-[14ch]">{title}</h2>
      </div>
      <p className="text-sm text-ink-500 max-w-[34ch]">{children}</p>
    </div>
  )
}

function Frame({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[20px] border border-ink-700 bg-ink-900 overflow-hidden shadow-2xl', className)}>
      <div className="flex items-center gap-1.5 px-4 py-3 bg-ink-800 border-b border-ink-800">
        <span className="size-2 rounded-full bg-negative-500" />
        <span className="size-2 rounded-full bg-warning-500" />
        <span className="size-2 rounded-full bg-positive-500" />
        <span className="ml-2 text-xs text-ink-500">{label}</span>
      </div>
      {children}
    </div>
  )
}
